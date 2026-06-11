/**
 * Chat store for AI conversation persistence
 *
 * This module provides storage for chat messages using the AI SDK v6 UIMessage format.
 * Uses PostgreSQL as the primary storage backend with Redis caching.
 *
 * Design follows AI SDK v6 best practices:
 * - Messages stored as UIMessage[] (the canonical format for persistence)
 * - Server-generated message IDs via createIdGenerator
 * - Unified saveChat in onFinish callback
 * - consumeStream for disconnect resilience
 *
 * Storage architecture:
 * - PostgreSQL: Primary persistent storage (ai_chat_sessions table)
 * - Redis: Read cache for messages and session lists
 * - In-memory fallback: For test environments without DB/Redis
 */

import { aiChatSessions, db } from "@folionote/db"
import { createLogger } from "@folionote/log"
import type { UIMessage } from "ai"
import { and, desc, eq, isNull } from "drizzle-orm"
import { nanoid } from "nanoid"

import { getRedisClient, isRedisConfigured } from "../utils/redis"

const log = createLogger({ prefix: "ai-chat-store" })

// =============================================================================
// Constants
// =============================================================================

/** Redis key prefix for chat sessions */
const REDIS_KEY_PREFIX = "ai:chat:"

/** Redis key prefix for user chat lists */
const REDIS_LIST_KEY_PREFIX = "ai:chatlist:"

/** Redis cache TTL in seconds (1 hour) */
const REDIS_CACHE_TTL_SECONDS = 3600

/** Maximum preview length for last message */
const MAX_PREVIEW_LENGTH = 100

/** Maximum chats to return in list */
const MAX_CHATS_IN_LIST = 50

// =============================================================================
// Types
// =============================================================================

/** Chat session metadata and messages */
export interface ChatSession {
  /** User ID (owner) */
  userId: string
  /** Chat ID */
  chatId: string
  /** Session title */
  title: string
  /** Messages in UIMessage format (AI SDK v6 standard) */
  messages: UIMessage[]
  /** Message count */
  messageCount: number
  /** Last message preview */
  lastMessagePreview: string
  /** Last message timestamp */
  lastMessageAt: Date | null
  /** Last opened timestamp */
  lastOpenedAt: Date
  /** Last update timestamp */
  updatedAt: Date
  /** Creation timestamp */
  createdAt: Date
}

/** Summary for chat list (without full messages) */
export type ChatSessionSummary = Omit<ChatSession, "messages">

/** Input for creating a new chat */
export interface CreateChatInput {
  userId: string
  chatId?: string
  title?: string
  messages?: UIMessage[]
}

/** Input for saving chat messages */
export interface SaveChatInput {
  userId: string
  chatId: string
  messages: UIMessage[]
  title?: string
}

// =============================================================================
// In-Memory Fallback (for tests and environments without DB)
// =============================================================================

/** In-memory store keyed by `${userId}:${chatId}` */
const memoryStore = new Map<string, ChatSession>()

/** Flag to use memory store (for tests) */
let useMemoryStore = false

/**
 * Enable memory store for testing
 */
export function enableMemoryStore(): void {
  useMemoryStore = true
}

/**
 * Disable memory store (use DB)
 */
export function disableMemoryStore(): void {
  useMemoryStore = false
}

/**
 * Clear memory store (for tests)
 */
export function clearMemoryStore(): void {
  memoryStore.clear()
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Generate Redis key for a chat session
 */
function getChatRedisKey(userId: string, chatId: string): string {
  return `${REDIS_KEY_PREFIX}${userId}:${chatId}`
}

/**
 * Generate Redis key for user chat list
 */
function getListRedisKey(userId: string): string {
  return `${REDIS_LIST_KEY_PREFIX}${userId}`
}

/**
 * Extract preview from the last message
 */
function extractPreview(messages: UIMessage[]): string {
  if (messages.length === 0) {
    return ""
  }

  const lastMsg = messages.at(-1)
  if (!lastMsg) {
    return ""
  }

  const textPart = lastMsg.parts?.find((p) => p.type === "text")
  const text = textPart && "text" in textPart ? textPart.text : ""

  if (text.length <= MAX_PREVIEW_LENGTH) {
    return text
  }
  return `${text.slice(0, MAX_PREVIEW_LENGTH)}…`
}

/**
 * Generate title from first user message if not provided
 */
export function generateTitle(
  messages: UIMessage[],
  providedTitle?: string
): string {
  if (providedTitle?.trim()) {
    return providedTitle
  }

  const firstUserMsg = messages.find((m) => m.role === "user")
  if (!firstUserMsg) {
    return ""
  }

  const textPart = firstUserMsg.parts?.find((p) => p.type === "text")
  const text = textPart && "text" in textPart ? textPart.text : ""

  if (text.length <= 50) {
    return text
  }
  return `${text.slice(0, 50)}…`
}

function firstNonEmptyTitle(...candidates: (string | undefined)[]): string {
  for (const candidate of candidates) {
    if (candidate?.trim()) {
      return candidate
    }
  }
  return ""
}

/**
 * Parse messages JSON from database
 */
function parseMessagesJson(json: string | null): UIMessage[] {
  if (!json) {
    return []
  }
  try {
    return JSON.parse(json) as UIMessage[]
  } catch {
    log.warn("Failed to parse messages JSON")
    return []
  }
}

type DateInput = Date | string | number | null | undefined

function parseOptionalDate(value: DateInput): Date | null {
  if (value === null || value === undefined) {
    return null
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  const parsedDate = new Date(value)
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate
}

function parseRequiredDate(value: DateInput, fallbackDate: Date): Date {
  const parsedDate = parseOptionalDate(value)
  return parsedDate ?? fallbackDate
}

type ChatSessionDateFields = Pick<
  ChatSession,
  "lastMessageAt" | "lastOpenedAt" | "updatedAt" | "createdAt"
>

function normalizeChatSessionDates<T extends ChatSessionDateFields>(
  session: T
): T {
  const fallbackDate = new Date()
  return {
    ...session,
    lastMessageAt: parseOptionalDate(session.lastMessageAt),
    lastOpenedAt: parseRequiredDate(session.lastOpenedAt, fallbackDate),
    updatedAt: parseRequiredDate(session.updatedAt, fallbackDate),
    createdAt: parseRequiredDate(session.createdAt, fallbackDate)
  }
}

/**
 * Convert DB row to ChatSession
 */
function dbRowToSession(row: typeof aiChatSessions.$inferSelect): ChatSession {
  return normalizeChatSessionDates({
    userId: row.userId,
    chatId: row.id,
    title: row.title,
    messages: parseMessagesJson(row.messagesJson),
    messageCount: row.messageCount,
    lastMessagePreview: row.lastMessagePreview,
    lastMessageAt: row.lastMessageAt,
    lastOpenedAt: row.lastOpenedAt,
    updatedAt: row.updatedAt,
    createdAt: row.createdAt
  })
}

/**
 * Check if a session is empty (no messages)
 *
 * Empty session definition: messageCount === 0 AND lastMessageAt is null
 */
export function isEmptySession(
  session: ChatSession | ChatSessionSummary
): boolean {
  return session.messageCount === 0 && session.lastMessageAt === null
}

/**
 * Find the most recent empty session for a user
 */
async function findRecentEmptySession(
  userId: string
): Promise<ChatSession | undefined> {
  if (useMemoryStore) {
    const sessions: ChatSession[] = []
    for (const session of memoryStore.values()) {
      if (session.userId === userId && isEmptySession(session)) {
        sessions.push(session)
      }
    }
    if (sessions.length === 0) {
      return undefined
    }
    // Sort by lastOpenedAt descending
    sessions.sort((a, b) => b.lastOpenedAt.getTime() - a.lastOpenedAt.getTime())
    return sessions[0]
  }

  const rows = await db
    .select()
    .from(aiChatSessions)
    .where(
      and(
        eq(aiChatSessions.userId, userId),
        eq(aiChatSessions.messageCount, 0),
        isNull(aiChatSessions.lastMessageAt)
      )
    )
    .orderBy(desc(aiChatSessions.lastOpenedAt))
    .limit(1)

  const row = rows[0]
  return row ? dbRowToSession(row) : undefined
}

/**
 * Delete all empty sessions for a user except the one with the given chatId
 *
 * @returns Number of deleted sessions
 */
async function cleanupEmptySessions(
  userId: string,
  exceptChatId?: string
): Promise<number> {
  if (useMemoryStore) {
    return await cleanupEmptySessionsInMemory(userId, exceptChatId)
  }

  return await cleanupEmptySessionsInDb(userId, exceptChatId)
}

function getEmptySessionKeysToDelete(
  userId: string,
  exceptChatId?: string
): string[] {
  const keysToDelete: string[] = []
  for (const [key, session] of memoryStore.entries()) {
    if (
      session.userId === userId &&
      isEmptySession(session) &&
      session.chatId !== exceptChatId
    ) {
      keysToDelete.push(key)
    }
  }
  return keysToDelete
}

function cleanupEmptySessionsInMemory(
  userId: string,
  exceptChatId?: string
): number {
  const keysToDelete = getEmptySessionKeysToDelete(userId, exceptChatId)
  for (const key of keysToDelete) {
    memoryStore.delete(key)
  }
  if (keysToDelete.length > 0) {
    log.debug(
      `[memory] Cleaned up ${keysToDelete.length} empty sessions for user ${userId}`
    )
  }
  return keysToDelete.length
}

async function cleanupEmptySessionsInDb(
  userId: string,
  exceptChatId?: string
): Promise<number> {
  const idsToDelete = await getEmptySessionIdsToDelete(userId, exceptChatId)
  if (idsToDelete.length === 0) {
    return 0
  }

  const deletedCount = await deleteEmptySessionsByIds(userId, idsToDelete)
  if (deletedCount > 0) {
    await invalidateChatListCache(userId)
    log.debug(`Cleaned up ${deletedCount} empty sessions for user ${userId}`)
  }

  return deletedCount
}

async function getEmptySessionIdsToDelete(
  userId: string,
  exceptChatId?: string
): Promise<string[]> {
  const rows = await db
    .select({ id: aiChatSessions.id })
    .from(aiChatSessions)
    .where(
      and(
        eq(aiChatSessions.userId, userId),
        eq(aiChatSessions.messageCount, 0),
        isNull(aiChatSessions.lastMessageAt)
      )
    )

  return rows.map((row) => row.id).filter((id) => id !== exceptChatId)
}

async function deleteEmptySessionsByIds(
  userId: string,
  chatIds: string[]
): Promise<number> {
  let deletedCount = 0
  for (const chatId of chatIds) {
    const deleted = await deleteChatSessionById(userId, chatId)
    if (deleted) {
      deletedCount += 1
    }
  }
  return deletedCount
}

async function deleteChatSessionById(
  userId: string,
  chatId: string
): Promise<boolean> {
  const result = await db
    .delete(aiChatSessions)
    .where(
      and(eq(aiChatSessions.id, chatId), eq(aiChatSessions.userId, userId))
    )
    .returning({ id: aiChatSessions.id })

  if (result.length === 0) {
    return false
  }

  await clearChatCacheForDeletedSession(userId, chatId)
  return true
}

async function clearChatCacheForDeletedSession(
  userId: string,
  chatId: string
): Promise<void> {
  if (!isRedisConfigured()) {
    return
  }
  try {
    const redis = getRedisClient()
    await redis.del(getChatRedisKey(userId, chatId))
  } catch (error) {
    log.warn("Failed to clear Redis cache for deleted session:", error)
  }
}

async function invalidateChatCache(
  userId: string,
  chatId: string
): Promise<void> {
  if (!isRedisConfigured()) {
    return
  }
  try {
    const redis = getRedisClient()
    await redis.del(getChatRedisKey(userId, chatId))
    await redis.del(getListRedisKey(userId))
  } catch (error) {
    log.warn("Failed to invalidate Redis cache:", error)
  }
}

async function invalidateChatListCache(userId: string): Promise<void> {
  if (!isRedisConfigured()) {
    return
  }
  try {
    const redis = getRedisClient()
    await redis.del(getListRedisKey(userId))
  } catch (error) {
    log.warn("Failed to invalidate Redis list cache:", error)
  }
}

/**
 * Skip redundant lastOpenedAt writes when a chat is reopened within this window.
 * lastOpenedAt only drives "resume most recent chat", so sub-window precision is
 * unnecessary and skipping the writes keeps the read path fast.
 */
const LAST_OPENED_DEBOUNCE_MS = 30_000

/**
 * Schedule a lastOpenedAt bump WITHOUT blocking the read it accompanies.
 *
 * The DB write and list-cache invalidation run in the background; loading a chat
 * must never wait on a bookkeeping write. Returns the timestamp the session should
 * report: `now` when a write was scheduled, or the unchanged value when debounced.
 */
function scheduleLastOpenedBump(
  userId: string,
  chatId: string,
  currentLastOpened: Date
): Date {
  const now = new Date()
  if (now.getTime() - currentLastOpened.getTime() < LAST_OPENED_DEBOUNCE_MS) {
    return currentLastOpened
  }

  void persistLastOpenedAt(userId, chatId, now).catch((error) => {
    log.warn("Background lastOpenedAt update failed:", error)
  })
  return now
}

/**
 * Persist lastOpenedAt and invalidate the (now reordered) chat-list cache.
 *
 * Intentionally does not rewrite the full session blob to Redis: the cached
 * session's lastOpenedAt is non-authoritative and self-heals on the next DB read,
 * so we avoid re-uploading the entire message history just to move a timestamp.
 */
async function persistLastOpenedAt(
  userId: string,
  chatId: string,
  now: Date
): Promise<void> {
  await db
    .update(aiChatSessions)
    .set({ lastOpenedAt: now })
    .where(
      and(eq(aiChatSessions.id, chatId), eq(aiChatSessions.userId, userId))
    )

  await invalidateChatListCache(userId)
}

/**
 * Populate the Redis session cache. Safe to fire-and-forget: failures are logged
 * and the next read simply falls back to PostgreSQL.
 */
async function cacheChatSession(
  userId: string,
  chatId: string,
  session: ChatSession
): Promise<void> {
  try {
    const redis = getRedisClient()
    await redis.set(getChatRedisKey(userId, chatId), session, {
      ex: REDIS_CACHE_TTL_SECONDS
    })
  } catch (error) {
    log.warn("Redis cache write failed:", error)
  }
}

// =============================================================================
// Core API (AI SDK v6 aligned)
// =============================================================================

/**
 * Generate a new chat ID
 */
export function generateChatId(): string {
  return nanoid(16)
}

interface NewChatSessionInput {
  userId: string
  chatId: string
  messages: UIMessage[]
  title: string
  preview: string
  now: Date
}

function shouldReuseEmptySessionInput(
  input: CreateChatInput,
  messages: UIMessage[]
): boolean {
  return messages.length === 0 && !input.chatId && !input.title
}

async function reuseEmptySessionIfAvailable(
  userId: string
): Promise<ChatSession | undefined> {
  const existingEmpty = await findRecentEmptySession(userId)
  if (!existingEmpty) {
    return undefined
  }

  await touchEmptySession(userId, existingEmpty)
  await cleanupEmptySessions(userId, existingEmpty.chatId)

  return existingEmpty
}

async function touchEmptySession(
  userId: string,
  session: ChatSession
): Promise<void> {
  const now = new Date()
  session.lastOpenedAt = now
  session.updatedAt = now

  if (useMemoryStore) {
    log.debug(
      `[memory] Reused empty session: ${session.chatId} for user ${userId}`
    )
    return
  }

  await db
    .update(aiChatSessions)
    .set({ lastOpenedAt: now, updatedAt: now })
    .where(
      and(
        eq(aiChatSessions.id, session.chatId),
        eq(aiChatSessions.userId, userId)
      )
    )

  await invalidateChatCache(userId, session.chatId)

  log.debug(`Reused empty session: ${session.chatId} for user ${userId}`)
}

function createChatInMemory(input: NewChatSessionInput): ChatSession {
  const session: ChatSession = {
    userId: input.userId,
    chatId: input.chatId,
    title: input.title,
    messages: input.messages,
    messageCount: input.messages.length,
    lastMessagePreview: input.preview,
    lastMessageAt: input.messages.length > 0 ? input.now : null,
    lastOpenedAt: input.now,
    createdAt: input.now,
    updatedAt: input.now
  }
  memoryStore.set(`${input.userId}:${input.chatId}`, session)
  log.debug(
    `[memory] Created chat session: ${input.chatId} for user ${input.userId}`
  )
  return session
}

async function createChatInDb(
  input: NewChatSessionInput
): Promise<ChatSession> {
  const [row] = await db
    .insert(aiChatSessions)
    .values({
      id: input.chatId,
      userId: input.userId,
      title: input.title,
      messagesJson: JSON.stringify(input.messages),
      messageCount: input.messages.length,
      lastMessagePreview: input.preview,
      lastMessageAt: input.messages.length > 0 ? input.now : null,
      lastOpenedAt: input.now,
      createdAt: input.now,
      updatedAt: input.now
    })
    .returning()

  if (!row) {
    throw new Error("Failed to create chat session")
  }

  const session = dbRowToSession(row)
  await invalidateChatListCache(input.userId)

  log.debug(`Created chat session: ${input.chatId} for user ${input.userId}`)
  return session
}

/**
 * Create a new chat session
 *
 * If creating an empty session (no messages, no specific chatId), this will:
 * 1. Try to reuse an existing empty session (update its lastOpenedAt)
 * 2. Clean up any other empty sessions to avoid accumulation
 * 3. Only create a new session if no empty session exists to reuse
 *
 * @returns The created (or reused) chat session with chatId
 */
export async function createChat(input: CreateChatInput): Promise<ChatSession> {
  const messages = input.messages ?? []
  if (shouldReuseEmptySessionInput(input, messages)) {
    const reusedSession = await reuseEmptySessionIfAvailable(input.userId)
    if (reusedSession) {
      return reusedSession
    }
  }

  const chatId = input.chatId ?? generateChatId()
  const now = new Date()
  const title = generateTitle(messages, input.title)
  const preview = extractPreview(messages)

  if (useMemoryStore) {
    return createChatInMemory({
      userId: input.userId,
      chatId,
      messages,
      title,
      preview,
      now
    })
  }

  return createChatInDb({
    userId: input.userId,
    chatId,
    messages,
    title,
    preview,
    now
  })
}

/**
 * Load a chat session by userId and chatId
 *
 * @param updateLastOpened - If true, updates lastOpenedAt timestamp
 * @returns The chat session or undefined if not found
 */
export async function loadChat(
  userId: string,
  chatId: string,
  updateLastOpened = false
): Promise<ChatSession | undefined> {
  // Memory store fallback
  if (useMemoryStore) {
    const session = memoryStore.get(`${userId}:${chatId}`)
    if (session && updateLastOpened) {
      session.lastOpenedAt = new Date()
    }
    return session
  }

  // Try Redis cache first
  if (isRedisConfigured()) {
    try {
      const redis = getRedisClient()
      const cached = await redis.get<ChatSession>(
        getChatRedisKey(userId, chatId)
      )
      if (cached) {
        const normalizedSession = normalizeChatSessionDates(cached)
        log.debug(`[redis] Cache hit for chat ${chatId}`)

        // Bump lastOpenedAt off the critical path (no full-blob rewrite).
        if (updateLastOpened) {
          normalizedSession.lastOpenedAt = scheduleLastOpenedBump(
            userId,
            chatId,
            normalizedSession.lastOpenedAt
          )
        }

        return normalizedSession
      }
    } catch (error) {
      log.warn("Redis cache read failed:", error)
    }
  }

  // Load from PostgreSQL
  const rows = await db
    .select()
    .from(aiChatSessions)
    .where(
      and(eq(aiChatSessions.id, chatId), eq(aiChatSessions.userId, userId))
    )
    .limit(1)

  const row = rows[0]
  if (!row) {
    return undefined
  }

  const session = dbRowToSession(row)

  // Bump lastOpenedAt off the critical path (debounced, fire-and-forget).
  if (updateLastOpened) {
    session.lastOpenedAt = scheduleLastOpenedBump(
      userId,
      chatId,
      session.lastOpenedAt
    )
  }

  // Populate Redis cache in the background — the response doesn't depend on it.
  if (isRedisConfigured()) {
    void cacheChatSession(userId, chatId, session)
  }

  return session
}

/**
 * Load chat messages by userId and chatId
 *
 * This is the primary method for loading messages to pass to useChat initialMessages.
 *
 * @returns The messages array or empty array if chat not found
 */
export async function loadChatMessages(
  userId: string,
  chatId: string
): Promise<UIMessage[]> {
  const session = await loadChat(userId, chatId)
  return session?.messages ?? []
}

/**
 * Save chat messages (called from onFinish callback)
 *
 * This is the unified save point called after stream completion.
 * The messages array should be the complete UIMessage[] from onFinish.
 */
export async function saveChat(input: SaveChatInput): Promise<void> {
  const { userId, chatId, messages, title: providedTitle } = input
  const now = new Date()
  const title = generateTitle(messages, providedTitle)
  const preview = extractPreview(messages)

  // Memory store fallback
  if (useMemoryStore) {
    const existing = memoryStore.get(`${userId}:${chatId}`)
    const session: ChatSession = {
      userId,
      chatId,
      title: firstNonEmptyTitle(providedTitle, existing?.title, title),
      messages,
      messageCount: messages.length,
      lastMessagePreview: preview,
      lastMessageAt: messages.length > 0 ? now : null,
      lastOpenedAt: existing?.lastOpenedAt ?? now,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    }
    memoryStore.set(`${userId}:${chatId}`, session)
    log.debug(
      `[memory] Saved chat ${chatId}: ${messages.length} messages for user ${userId}`
    )
    return
  }

  // Check if session exists
  const existing = await db
    .select({ id: aiChatSessions.id, title: aiChatSessions.title })
    .from(aiChatSessions)
    .where(
      and(eq(aiChatSessions.id, chatId), eq(aiChatSessions.userId, userId))
    )
    .limit(1)

  if (existing.length === 0) {
    // Create new session
    await db.insert(aiChatSessions).values({
      id: chatId,
      userId,
      title,
      messagesJson: JSON.stringify(messages),
      messageCount: messages.length,
      lastMessagePreview: preview,
      lastMessageAt: messages.length > 0 ? now : null,
      lastOpenedAt: now,
      createdAt: now,
      updatedAt: now
    })
  } else {
    // Update existing session
    await db
      .update(aiChatSessions)
      .set({
        title: firstNonEmptyTitle(providedTitle, existing[0]?.title, title),
        messagesJson: JSON.stringify(messages),
        messageCount: messages.length,
        lastMessagePreview: preview,
        lastMessageAt: messages.length > 0 ? now : null,
        updatedAt: now
      })
      .where(
        and(eq(aiChatSessions.id, chatId), eq(aiChatSessions.userId, userId))
      )
  }

  // Update/invalidate Redis cache
  if (isRedisConfigured()) {
    try {
      const redis = getRedisClient()
      // Delete session cache (will be re-populated on next read)
      await redis.del(getChatRedisKey(userId, chatId))
      // Invalidate list cache
      await redis.del(getListRedisKey(userId))
    } catch (error) {
      log.warn("Failed to update Redis cache:", error)
    }
  }

  log.debug(
    `Saved chat ${chatId}: ${messages.length} messages for user ${userId}`
  )
}

/**
 * Delete a chat session
 *
 * @returns true if the session was deleted, false if not found
 */
export async function deleteChat(
  userId: string,
  chatId: string
): Promise<boolean> {
  // Memory store fallback
  if (useMemoryStore) {
    const deleted = memoryStore.delete(`${userId}:${chatId}`)
    if (deleted) {
      log.debug(`[memory] Deleted chat session: ${chatId} for user ${userId}`)
    }
    return deleted
  }

  // Delete from PostgreSQL
  const result = await db
    .delete(aiChatSessions)
    .where(
      and(eq(aiChatSessions.id, chatId), eq(aiChatSessions.userId, userId))
    )
    .returning({ id: aiChatSessions.id })

  const deleted = result.length > 0

  // Clear Redis cache
  if (deleted && isRedisConfigured()) {
    try {
      const redis = getRedisClient()
      await redis.del(getChatRedisKey(userId, chatId))
      await redis.del(getListRedisKey(userId))
    } catch (error) {
      log.warn("Failed to clear Redis cache:", error)
    }
  }

  if (deleted) {
    log.debug(`Deleted chat session: ${chatId} for user ${userId}`)
  }

  return deleted
}

/**
 * List all chat sessions for a user (summaries only, without full messages)
 *
 * Also triggers empty session cleanup to ensure only one empty session exists.
 *
 * @returns Array of chat session summaries sorted by lastOpenedAt (newest first)
 */
export async function listUserChats(
  userId: string
): Promise<ChatSessionSummary[]> {
  // Memory store fallback
  if (useMemoryStore) {
    const sessions: ChatSessionSummary[] = []
    for (const session of memoryStore.values()) {
      if (session.userId === userId) {
        const { messages: _messages, ...summary } = session
        sessions.push(summary)
      }
    }
    const sorted = sessions.toSorted(
      (a, b) => b.lastOpenedAt.getTime() - a.lastOpenedAt.getTime()
    )

    // Cleanup empty sessions (keep only the most recent one)
    const emptySessions = sorted.filter((s) => isEmptySession(s))
    const mostRecentEmpty = emptySessions[0]
    if (mostRecentEmpty) {
      await cleanupEmptySessions(userId, mostRecentEmpty.chatId)
      // Re-filter after cleanup
      return sorted.filter(
        (s) => !isEmptySession(s) || s.chatId === mostRecentEmpty.chatId
      )
    }

    return sorted
  }

  // Try Redis cache first
  if (isRedisConfigured()) {
    try {
      const redis = getRedisClient()
      const cached = await redis.get<ChatSessionSummary[]>(
        getListRedisKey(userId)
      )
      if (cached) {
        const normalizedSummaries = cached.map((summary) =>
          normalizeChatSessionDates(summary)
        )
        log.debug(`[redis] Cache hit for chat list of user ${userId}`)
        return normalizedSummaries
      }
    } catch (error) {
      log.warn("Redis list cache read failed:", error)
    }
  }

  // Load from PostgreSQL (excluding messagesJson for performance)
  const rows = await db
    .select({
      id: aiChatSessions.id,
      userId: aiChatSessions.userId,
      title: aiChatSessions.title,
      messageCount: aiChatSessions.messageCount,
      lastMessagePreview: aiChatSessions.lastMessagePreview,
      lastMessageAt: aiChatSessions.lastMessageAt,
      lastOpenedAt: aiChatSessions.lastOpenedAt,
      updatedAt: aiChatSessions.updatedAt,
      createdAt: aiChatSessions.createdAt
    })
    .from(aiChatSessions)
    .where(eq(aiChatSessions.userId, userId))
    .orderBy(desc(aiChatSessions.lastOpenedAt))
    .limit(MAX_CHATS_IN_LIST)

  let summaries: ChatSessionSummary[] = rows.map((row) =>
    normalizeChatSessionDates({
      userId: row.userId,
      chatId: row.id,
      title: row.title,
      messageCount: row.messageCount,
      lastMessagePreview: row.lastMessagePreview,
      lastMessageAt: row.lastMessageAt,
      lastOpenedAt: row.lastOpenedAt,
      updatedAt: row.updatedAt,
      createdAt: row.createdAt
    })
  )

  // Cleanup empty sessions (keep only the most recent one)
  const emptyInList = summaries.find((summary) => isEmptySession(summary))
  const emptySessionToKeep =
    emptyInList ?? (await findRecentEmptySession(userId))
  if (emptySessionToKeep) {
    await cleanupEmptySessions(userId, emptySessionToKeep.chatId)
    // Filter out deleted empty sessions from result
    summaries = summaries.filter(
      (s) => !isEmptySession(s) || s.chatId === emptySessionToKeep.chatId
    )
  }

  // Cache in Redis
  if (isRedisConfigured()) {
    try {
      const redis = getRedisClient()
      await redis.set(getListRedisKey(userId), summaries, {
        ex: REDIS_CACHE_TTL_SECONDS
      })
    } catch (error) {
      log.warn("Redis list cache write failed:", error)
    }
  }

  return summaries
}

/**
 * Delete an empty chat session (for cleanup when switching away)
 *
 * Only deletes if the session exists and is empty.
 *
 * @returns true if the session was deleted, false if not found or not empty
 */
export async function deleteEmptyChat(
  userId: string,
  chatId: string
): Promise<boolean> {
  // Memory store fallback
  if (useMemoryStore) {
    const session = memoryStore.get(`${userId}:${chatId}`)
    const isEmpty = session && isEmptySession(session)
    if (!isEmpty) {
      return false
    }
    memoryStore.delete(`${userId}:${chatId}`)
    log.debug(
      `[memory] Deleted empty chat session: ${chatId} for user ${userId}`
    )
    return true
  }

  // Check if session exists and is empty
  const rows = await db
    .select({
      id: aiChatSessions.id,
      messageCount: aiChatSessions.messageCount,
      lastMessageAt: aiChatSessions.lastMessageAt
    })
    .from(aiChatSessions)
    .where(
      and(eq(aiChatSessions.id, chatId), eq(aiChatSessions.userId, userId))
    )
    .limit(1)

  const row = rows[0]
  if (!row) {
    return false
  }

  // Only delete if empty
  if (row.messageCount !== 0 || row.lastMessageAt !== null) {
    return false
  }

  // Delete from PostgreSQL
  const result = await db
    .delete(aiChatSessions)
    .where(
      and(eq(aiChatSessions.id, chatId), eq(aiChatSessions.userId, userId))
    )
    .returning({ id: aiChatSessions.id })

  const deleted = result.length > 0

  // Clear Redis cache
  if (deleted && isRedisConfigured()) {
    try {
      const redis = getRedisClient()
      await redis.del(getChatRedisKey(userId, chatId))
      await redis.del(getListRedisKey(userId))
    } catch (error) {
      log.warn("Failed to clear Redis cache:", error)
    }
  }

  if (deleted) {
    log.debug(`Deleted empty chat session: ${chatId} for user ${userId}`)
  }

  return deleted
}

/**
 * Update lastOpenedAt for a chat session
 */
export async function touchChat(userId: string, chatId: string): Promise<void> {
  // Memory store fallback
  if (useMemoryStore) {
    const session = memoryStore.get(`${userId}:${chatId}`)
    if (session) {
      session.lastOpenedAt = new Date()
    }
    return
  }

  const now = new Date()
  await db
    .update(aiChatSessions)
    .set({ lastOpenedAt: now })
    .where(
      and(eq(aiChatSessions.id, chatId), eq(aiChatSessions.userId, userId))
    )

  // Invalidate caches
  if (isRedisConfigured()) {
    try {
      const redis = getRedisClient()
      await redis.del(getChatRedisKey(userId, chatId))
      await redis.del(getListRedisKey(userId))
    } catch (error) {
      log.warn("Failed to invalidate Redis cache:", error)
    }
  }
}

/**
 * Update the stored title for a chat session.
 *
 * @returns true if the session exists and the title was updated
 */
export async function updateChatTitle(
  userId: string,
  chatId: string,
  title: string
): Promise<boolean> {
  const normalizedTitle = title.trim()
  if (!normalizedTitle) {
    return false
  }

  if (useMemoryStore) {
    const session = memoryStore.get(`${userId}:${chatId}`)
    if (!session) {
      return false
    }
    session.title = normalizedTitle
    session.updatedAt = new Date()
    return true
  }

  const result = await db
    .update(aiChatSessions)
    .set({
      title: normalizedTitle,
      updatedAt: new Date()
    })
    .where(
      and(eq(aiChatSessions.id, chatId), eq(aiChatSessions.userId, userId))
    )
    .returning({ id: aiChatSessions.id })

  const updated = result.length > 0
  if (!updated) {
    return false
  }

  await invalidateChatCache(userId, chatId)
  return true
}
