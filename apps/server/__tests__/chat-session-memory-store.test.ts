/**
 * Tests for the custom Mastra memory storage adapter.
 *
 * Exercises the adapter against the in-memory `ai-chat-store` so the
 * thread/message mapping and the UIMessage <-> MastraDBMessage conversion are
 * verified without a real database.
 */

import { MessageList } from "@mastra/core/agent/message-list"
import type { UIMessage } from "ai"
import { beforeEach, describe, expect, it } from "vite-plus/test"

import { ChatSessionMemoryStore } from "../src/mastra/storage/chat-session-memory-store"
import {
  clearMemoryStore,
  enableMemoryStore,
  loadChatMessages
} from "../src/services/ai-chat-store"

enableMemoryStore()

const USER = "user-1"
const THREAD = "thread-1"

function toDbMessages(messages: UIMessage[]) {
  return new MessageList({ threadId: THREAD, resourceId: USER })
    .add(messages as never, "input")
    .get.all.db()
    .map((message) => ({
      ...message,
      threadId: THREAD,
      resourceId: USER
    }))
}

describe("ChatSessionMemoryStore", () => {
  beforeEach(() => {
    clearMemoryStore()
  })

  it("saves and reads back a thread mapped onto a chat session", async () => {
    const store = new ChatSessionMemoryStore()
    const now = new Date()

    await store.saveThread({
      thread: {
        id: THREAD,
        resourceId: USER,
        title: "My Chat",
        createdAt: now,
        updatedAt: now
      }
    })

    const thread = await store.getThreadById({
      threadId: THREAD,
      resourceId: USER
    })
    expect(thread?.id).toBe(THREAD)
    expect(thread?.resourceId).toBe(USER)
    expect(thread?.title).toBe("My Chat")
  })

  it("persists messages into the chat store and lists them back", async () => {
    const store = new ChatSessionMemoryStore()
    const now = new Date()
    await store.saveThread({
      thread: { id: THREAD, resourceId: USER, createdAt: now, updatedAt: now }
    })

    const ui: UIMessage[] = [
      { id: "m1", role: "user", parts: [{ type: "text", text: "hello" }] }
    ]
    await store.saveMessages({ messages: toDbMessages(ui) })

    // The underlying chat-session blob now holds the UIMessage.
    const stored = await loadChatMessages(USER, THREAD)
    expect(stored).toHaveLength(1)
    expect(stored[0]?.id).toBe("m1")

    // listMessages converts the blob back into Mastra DB messages.
    const listed = await store.listMessages({
      threadId: THREAD,
      resourceId: USER
    })
    expect(listed.messages).toHaveLength(1)
    expect(listed.messages[0]?.role).toBe("user")
  })

  it("merges additional turns into the existing thread (no history loss)", async () => {
    const store = new ChatSessionMemoryStore()
    const now = new Date()
    await store.saveThread({
      thread: { id: THREAD, resourceId: USER, createdAt: now, updatedAt: now }
    })

    await store.saveMessages({
      messages: toDbMessages([
        { id: "m1", role: "user", parts: [{ type: "text", text: "first" }] }
      ])
    })
    await store.saveMessages({
      messages: toDbMessages([
        {
          id: "m2",
          role: "assistant",
          parts: [{ type: "text", text: "reply" }]
        }
      ])
    })

    const stored = await loadChatMessages(USER, THREAD)
    expect(stored.map((message) => message.id)).toEqual(["m1", "m2"])
  })

  it("lists threads for a resource", async () => {
    const store = new ChatSessionMemoryStore()
    const now = new Date()
    await store.saveThread({
      thread: { id: THREAD, resourceId: USER, createdAt: now, updatedAt: now }
    })
    await store.saveMessages({
      messages: toDbMessages([
        { id: "m1", role: "user", parts: [{ type: "text", text: "hi" }] }
      ])
    })

    const listed = await store.listThreads({ filter: { resourceId: USER } })
    expect(listed.threads.some((thread) => thread.id === THREAD)).toBe(true)
  })
})
