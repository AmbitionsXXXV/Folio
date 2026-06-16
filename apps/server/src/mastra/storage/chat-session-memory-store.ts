/**
 * Custom Mastra memory storage backed by the existing `ai_chat_sessions` table.
 *
 * This adapter lets a Mastra `Memory` persist conversations into FolioNote's
 * tuned chat store (PostgreSQL blob + Redis cache + empty-session logic) WITHOUT
 * a schema or data migration. It maps Mastra's thread/message model onto the
 * existing per-session `UIMessage[]` blob:
 *
 * - Mastra thread  ⇄ `ai_chat_sessions` row (threadId = chatId, resourceId = userId)
 * - Mastra messages ⇄ the session's `messagesJson` blob (AI SDK v6 `UIMessage[]`)
 *
 * Message format is converted losslessly in both directions with Mastra's own
 * `MessageList` (UIMessage[] ⇄ MastraDBMessage[]). All persistence is delegated
 * to `ai-chat-store` so Redis caching, title/preview derivation, and
 * empty-session cleanup are preserved.
 *
 * Note: `ai_chat_sessions` stores messages as a per-session blob (not indexed by
 * message id), so global by-id operations (`listMessagesById`) are intentionally
 * unsupported — the recall path uses `listMessages`, which is fully supported.
 */

import { aiChatSessions, db } from "@folionote/db"
import { createLogger } from "@folionote/log"
import type { MastraDBMessage } from "@mastra/core/agent"
import { MessageList } from "@mastra/core/agent/message-list"
import type { StorageThreadType } from "@mastra/core/memory"
import { MemoryStorage } from "@mastra/core/storage"
import type {
  StorageListMessagesInput,
  StorageListMessagesOutput,
  StorageListThreadsInput,
  StorageListThreadsOutput
} from "@mastra/core/storage"
import type { UIMessage } from "ai"
import { eq } from "drizzle-orm"

import {
  createChat,
  deleteChat,
  listUserChats,
  loadChat,
  loadChatMessages,
  saveChat,
  updateChatTitle
} from "../../services/ai-chat-store"
import type {
  ChatSession,
  ChatSessionSummary
} from "../../services/ai-chat-store"

const log = createLogger({ prefix: "chat-session-memory-store" })

const DEFAULT_THREADS_PER_PAGE = 100

type ThreadLike = Pick<
  ChatSession | ChatSessionSummary,
  "chatId" | "userId" | "title" | "createdAt" | "updatedAt"
>

function toThread(session: ThreadLike): StorageThreadType {
  return {
    id: session.chatId,
    title: session.title || undefined,
    resourceId: session.userId,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt
  }
}

/** Convert stored AI SDK v6 UIMessages → Mastra DB messages for a thread. */
function uiToDbMessages(
  threadId: string,
  resourceId: string,
  messages: UIMessage[]
): MastraDBMessage[] {
  const list = new MessageList({ threadId, resourceId })
  // The repo's AI SDK v6 UIMessage is structurally compatible with the v6
  // UIMessage Mastra bundles, but nominally distinct, so widen at the boundary.
  list.add(messages as unknown as Parameters<typeof list.add>[0], "memory")
  return list.get.all.db()
}

/** Convert Mastra DB messages → AI SDK v6 UIMessages for blob storage. */
function dbToUiMessages(
  threadId: string,
  resourceId: string,
  messages: MastraDBMessage[]
): UIMessage[] {
  const list = new MessageList({ threadId, resourceId })
  list.add(messages, "memory")
  return list.get.all.aiV6.ui() as unknown as UIMessage[]
}

/** Resolve the owning userId for a chat id (for Mastra's id-only operations). */
async function findResourceId(chatId: string): Promise<string | undefined> {
  const rows = await db
    .select({ userId: aiChatSessions.userId })
    .from(aiChatSessions)
    .where(eq(aiChatSessions.id, chatId))
    .limit(1)
  return rows[0]?.userId
}

export class ChatSessionMemoryStore extends MemoryStorage {
  async getThreadById({
    threadId,
    resourceId
  }: {
    threadId: string
    resourceId?: string
  }): Promise<StorageThreadType | null> {
    const userId = resourceId ?? (await findResourceId(threadId))
    if (!userId) {
      return null
    }
    const session = await loadChat(userId, threadId)
    return session ? toThread(session) : null
  }

  async saveThread({
    thread
  }: {
    thread: StorageThreadType
  }): Promise<StorageThreadType> {
    const existing = await loadChat(thread.resourceId, thread.id)
    if (existing) {
      if (thread.title && thread.title !== existing.title) {
        await updateChatTitle(thread.resourceId, thread.id, thread.title)
      }
      return toThread({ ...existing, title: thread.title ?? existing.title })
    }

    const created = await createChat({
      userId: thread.resourceId,
      chatId: thread.id,
      title: thread.title
    })
    return toThread(created)
  }

  async updateThread({
    id,
    title
  }: {
    id: string
    title: string
    metadata: Record<string, unknown>
  }): Promise<StorageThreadType> {
    const userId = await findResourceId(id)
    if (userId && title) {
      await updateChatTitle(userId, id, title)
    }
    const session = userId ? await loadChat(userId, id) : undefined
    return session
      ? toThread(session)
      : {
          id,
          title: title || undefined,
          resourceId: userId ?? "",
          createdAt: new Date(),
          updatedAt: new Date()
        }
  }

  async deleteThread({ threadId }: { threadId: string }): Promise<void> {
    const userId = await findResourceId(threadId)
    if (userId) {
      await deleteChat(userId, threadId)
    }
  }

  async listMessages(
    args: StorageListMessagesInput
  ): Promise<StorageListMessagesOutput> {
    const threadIds = Array.isArray(args.threadId)
      ? args.threadId
      : [args.threadId]

    const collected: MastraDBMessage[] = []
    for (const threadId of threadIds) {
      const userId = args.resourceId ?? (await findResourceId(threadId))
      if (!userId) {
        continue
      }
      const ui = await loadChatMessages(userId, threadId)
      collected.push(...uiToDbMessages(threadId, userId, ui))
    }

    // Chat histories are bounded (the agent's `lastMessages` config trims what
    // is actually used), so we return the full set and report it as one page.
    return {
      messages: collected,
      total: collected.length,
      page: 0,
      perPage: collected.length || false,
      hasMore: false
    }
  }

  listMessagesById(_args: {
    messageIds: string[]
  }): Promise<{ messages: MastraDBMessage[] }> {
    // Unsupported: messages live inside a per-session blob, not indexed by id.
    return Promise.resolve({ messages: [] })
  }

  async saveMessages(args: {
    messages: MastraDBMessage[]
  }): Promise<{ messages: MastraDBMessage[] }> {
    const byThread = new Map<
      string,
      { userId: string; messages: MastraDBMessage[] }
    >()
    for (const message of args.messages) {
      const threadId = message.threadId
      const userId = message.resourceId
      if (!(threadId && userId)) {
        continue
      }
      const group = byThread.get(threadId) ?? { userId, messages: [] }
      group.messages.push(message)
      byThread.set(threadId, group)
    }

    for (const [threadId, group] of byThread) {
      await this.mergeAndPersist(threadId, group.userId, group.messages)
    }

    return { messages: args.messages }
  }

  async updateMessages(args: {
    messages: (Partial<Omit<MastraDBMessage, "createdAt">> & {
      id: string
    })[]
  }): Promise<MastraDBMessage[]> {
    const updated: MastraDBMessage[] = []
    for (const partial of args.messages) {
      const threadId = partial.threadId
      const userId = partial.resourceId
      if (!(threadId && userId)) {
        continue
      }
      const existingUi = await loadChatMessages(userId, threadId)
      const existingDb = uiToDbMessages(threadId, userId, existingUi)
      const merged = existingDb.map((message) =>
        message.id === partial.id
          ? ({ ...message, ...partial } as MastraDBMessage)
          : message
      )
      await saveChat({
        userId,
        chatId: threadId,
        messages: dbToUiMessages(threadId, userId, merged)
      })
      const match = merged.find((message) => message.id === partial.id)
      if (match) {
        updated.push(match)
      }
    }
    return updated
  }

  async listThreads(
    args: StorageListThreadsInput
  ): Promise<StorageListThreadsOutput> {
    const resourceId = args.filter?.resourceId
    if (!resourceId) {
      return {
        threads: [],
        total: 0,
        page: args.page ?? 0,
        perPage: args.perPage ?? DEFAULT_THREADS_PER_PAGE,
        hasMore: false
      }
    }

    const summaries = await listUserChats(resourceId)
    const threads = summaries.map(toThread)
    return {
      threads,
      total: threads.length,
      page: 0,
      perPage: threads.length || false,
      hasMore: false
    }
  }

  dangerouslyClearAll(): Promise<void> {
    // Intentionally a no-op: chat sessions are deleted per user via the app API,
    // never wholesale from memory storage.
    log.warn("dangerouslyClearAll is a no-op for ChatSessionMemoryStore")
    return Promise.resolve()
  }

  /**
   * Merge incoming messages into the thread's existing blob (replace-by-id, then
   * append) and persist via the tuned chat store so Redis/title/preview logic is
   * preserved.
   */
  private async mergeAndPersist(
    threadId: string,
    userId: string,
    incoming: MastraDBMessage[]
  ): Promise<void> {
    const existingUi = await loadChatMessages(userId, threadId)
    const incomingUi = dbToUiMessages(threadId, userId, incoming)

    const byId = new Map<string, UIMessage>()
    for (const message of existingUi) {
      byId.set(message.id, message)
    }
    for (const message of incomingUi) {
      byId.set(message.id, message)
    }

    await saveChat({
      userId,
      chatId: threadId,
      messages: [...byId.values()]
    })
    log.debug(`Persisted ${incoming.length} message(s) to thread ${threadId}`)
  }
}
