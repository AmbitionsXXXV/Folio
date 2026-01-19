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

import { aiChatSessions, db } from '@folionote/db'
import { createLogger } from '@folionote/log'
import type { UIMessage } from 'ai'
import { and, desc, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { getRedisClient, isRedisConfigured } from '../utils/redis'

const log = createLogger({ prefix: 'ai-chat-store' })

// =============================================================================
// Constants
// =============================================================================

/** Redis key prefix for chat sessions */
const REDIS_KEY_PREFIX = 'ai:chat:'

/** Redis key prefix for user chat lists */
const REDIS_LIST_KEY_PREFIX = 'ai:chatlist:'

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
export type ChatSession = {
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
export type ChatSessionSummary = Omit<ChatSession, 'messages'>

/** Input for creating a new chat */
export type CreateChatInput = {
	userId: string
	chatId?: string
	title?: string
	messages?: UIMessage[]
}

/** Input for saving chat messages */
export type SaveChatInput = {
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
	if (messages.length === 0) return ''

	const lastMsg = messages.at(-1)
	if (!lastMsg) return ''

	const textPart = lastMsg.parts?.find((p) => p.type === 'text')
	const text = textPart && 'text' in textPart ? textPart.text : ''

	if (text.length <= MAX_PREVIEW_LENGTH) return text
	return `${text.slice(0, MAX_PREVIEW_LENGTH)}…`
}

/**
 * Generate title from first user message if not provided
 */
function generateTitle(messages: UIMessage[], providedTitle?: string): string {
	if (providedTitle?.trim()) return providedTitle

	const firstUserMsg = messages.find((m) => m.role === 'user')
	if (!firstUserMsg) return ''

	const textPart = firstUserMsg.parts?.find((p) => p.type === 'text')
	const text = textPart && 'text' in textPart ? textPart.text : ''

	if (text.length <= 50) return text
	return `${text.slice(0, 50)}…`
}

/**
 * Parse messages JSON from database
 */
function parseMessagesJson(json: string | null): UIMessage[] {
	if (!json) return []
	try {
		return JSON.parse(json) as UIMessage[]
	} catch {
		log.warn('Failed to parse messages JSON')
		return []
	}
}

/**
 * Convert DB row to ChatSession
 */
function dbRowToSession(row: typeof aiChatSessions.$inferSelect): ChatSession {
	return {
		userId: row.userId,
		chatId: row.id,
		title: row.title,
		messages: parseMessagesJson(row.messagesJson),
		messageCount: row.messageCount,
		lastMessagePreview: row.lastMessagePreview,
		lastMessageAt: row.lastMessageAt,
		lastOpenedAt: row.lastOpenedAt,
		updatedAt: row.updatedAt,
		createdAt: row.createdAt,
	}
}

/**
 * Update lastOpenedAt in DB and synchronize caches.
 */
async function updateLastOpenedAt(
	userId: string,
	chatId: string,
	cachedSession?: ChatSession
): Promise<Date> {
	const now = new Date()

	await db
		.update(aiChatSessions)
		.set({ lastOpenedAt: now })
		.where(and(eq(aiChatSessions.id, chatId), eq(aiChatSessions.userId, userId)))

	if (isRedisConfigured()) {
		try {
			const redis = getRedisClient()
			if (cachedSession) {
				cachedSession.lastOpenedAt = now
				await redis.set(getChatRedisKey(userId, chatId), cachedSession, {
					ex: REDIS_CACHE_TTL_SECONDS,
				})
			}
			await redis.del(getListRedisKey(userId))
		} catch (err) {
			log.warn('Failed to update Redis lastOpenedAt cache:', err)
		}
	}

	return now
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

/**
 * Create a new chat session
 *
 * @returns The created chat session with chatId
 */
export async function createChat(input: CreateChatInput): Promise<ChatSession> {
	const chatId = input.chatId ?? generateChatId()
	const now = new Date()
	const messages = input.messages ?? []
	const title = generateTitle(messages, input.title)
	const preview = extractPreview(messages)

	// Memory store fallback
	if (useMemoryStore) {
		const session: ChatSession = {
			userId: input.userId,
			chatId,
			title,
			messages,
			messageCount: messages.length,
			lastMessagePreview: preview,
			lastMessageAt: messages.length > 0 ? now : null,
			lastOpenedAt: now,
			createdAt: now,
			updatedAt: now,
		}
		memoryStore.set(`${input.userId}:${chatId}`, session)
		log.debug(`[memory] Created chat session: ${chatId} for user ${input.userId}`)
		return session
	}

	// PostgreSQL insert
	const [row] = await db
		.insert(aiChatSessions)
		.values({
			id: chatId,
			userId: input.userId,
			title,
			messagesJson: JSON.stringify(messages),
			messageCount: messages.length,
			lastMessagePreview: preview,
			lastMessageAt: messages.length > 0 ? now : null,
			lastOpenedAt: now,
			createdAt: now,
			updatedAt: now,
		})
		.returning()

	if (!row) {
		throw new Error('Failed to create chat session')
	}

	const session = dbRowToSession(row)

	// Invalidate list cache
	if (isRedisConfigured()) {
		try {
			const redis = getRedisClient()
			await redis.del(getListRedisKey(input.userId))
		} catch (err) {
			log.warn('Failed to invalidate Redis list cache:', err)
		}
	}

	log.debug(`Created chat session: ${chatId} for user ${input.userId}`)
	return session
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
			const cached = await redis.get<ChatSession>(getChatRedisKey(userId, chatId))
			if (cached) {
				log.debug(`[redis] Cache hit for chat ${chatId}`)

				// Update lastOpenedAt if needed (still need DB write)
				if (updateLastOpened) {
					await updateLastOpenedAt(userId, chatId, cached)
				}

				return cached
			}
		} catch (err) {
			log.warn('Redis cache read failed:', err)
		}
	}

	// Load from PostgreSQL
	const rows = await db
		.select()
		.from(aiChatSessions)
		.where(and(eq(aiChatSessions.id, chatId), eq(aiChatSessions.userId, userId)))
		.limit(1)

	const row = rows[0]
	if (!row) return undefined

	// Update lastOpenedAt if needed
	if (updateLastOpened) {
		row.lastOpenedAt = await updateLastOpenedAt(userId, chatId)
	}

	const session = dbRowToSession(row)

	// Cache in Redis
	if (isRedisConfigured()) {
		try {
			const redis = getRedisClient()
			await redis.set(getChatRedisKey(userId, chatId), session, {
				ex: REDIS_CACHE_TTL_SECONDS,
			})
		} catch (err) {
			log.warn('Redis cache write failed:', err)
		}
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
			title: providedTitle ?? existing?.title ?? title,
			messages,
			messageCount: messages.length,
			lastMessagePreview: preview,
			lastMessageAt: messages.length > 0 ? now : null,
			lastOpenedAt: existing?.lastOpenedAt ?? now,
			createdAt: existing?.createdAt ?? now,
			updatedAt: now,
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
		.where(and(eq(aiChatSessions.id, chatId), eq(aiChatSessions.userId, userId)))
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
			updatedAt: now,
		})
	} else {
		// Update existing session
		await db
			.update(aiChatSessions)
			.set({
				title: providedTitle ?? existing[0]?.title ?? title,
				messagesJson: JSON.stringify(messages),
				messageCount: messages.length,
				lastMessagePreview: preview,
				lastMessageAt: messages.length > 0 ? now : null,
				updatedAt: now,
			})
			.where(and(eq(aiChatSessions.id, chatId), eq(aiChatSessions.userId, userId)))
	}

	// Update/invalidate Redis cache
	if (isRedisConfigured()) {
		try {
			const redis = getRedisClient()
			// Delete session cache (will be re-populated on next read)
			await redis.del(getChatRedisKey(userId, chatId))
			// Invalidate list cache
			await redis.del(getListRedisKey(userId))
		} catch (err) {
			log.warn('Failed to update Redis cache:', err)
		}
	}

	log.debug(`Saved chat ${chatId}: ${messages.length} messages for user ${userId}`)
}

/**
 * Delete a chat session
 *
 * @returns true if the session was deleted, false if not found
 */
export async function deleteChat(userId: string, chatId: string): Promise<boolean> {
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
		.where(and(eq(aiChatSessions.id, chatId), eq(aiChatSessions.userId, userId)))
		.returning({ id: aiChatSessions.id })

	const deleted = result.length > 0

	// Clear Redis cache
	if (deleted && isRedisConfigured()) {
		try {
			const redis = getRedisClient()
			await redis.del(getChatRedisKey(userId, chatId))
			await redis.del(getListRedisKey(userId))
		} catch (err) {
			log.warn('Failed to clear Redis cache:', err)
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
 * @returns Array of chat session summaries sorted by lastOpenedAt (newest first)
 */
export async function listUserChats(userId: string): Promise<ChatSessionSummary[]> {
	// Memory store fallback
	if (useMemoryStore) {
		const sessions: ChatSessionSummary[] = []
		for (const session of memoryStore.values()) {
			if (session.userId === userId) {
				const { messages: _messages, ...summary } = session
				sessions.push(summary)
			}
		}
		return sessions.sort(
			(a, b) => b.lastOpenedAt.getTime() - a.lastOpenedAt.getTime()
		)
	}

	// Try Redis cache first
	if (isRedisConfigured()) {
		try {
			const redis = getRedisClient()
			const cached = await redis.get<ChatSessionSummary[]>(getListRedisKey(userId))
			if (cached) {
				log.debug(`[redis] Cache hit for chat list of user ${userId}`)
				return cached
			}
		} catch (err) {
			log.warn('Redis list cache read failed:', err)
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
			createdAt: aiChatSessions.createdAt,
		})
		.from(aiChatSessions)
		.where(eq(aiChatSessions.userId, userId))
		.orderBy(desc(aiChatSessions.lastOpenedAt))
		.limit(MAX_CHATS_IN_LIST)

	const summaries: ChatSessionSummary[] = rows.map((row) => ({
		userId: row.userId,
		chatId: row.id,
		title: row.title,
		messageCount: row.messageCount,
		lastMessagePreview: row.lastMessagePreview,
		lastMessageAt: row.lastMessageAt,
		lastOpenedAt: row.lastOpenedAt,
		updatedAt: row.updatedAt,
		createdAt: row.createdAt,
	}))

	// Cache in Redis
	if (isRedisConfigured()) {
		try {
			const redis = getRedisClient()
			await redis.set(getListRedisKey(userId), summaries, {
				ex: REDIS_CACHE_TTL_SECONDS,
			})
		} catch (err) {
			log.warn('Redis list cache write failed:', err)
		}
	}

	return summaries
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
		.where(and(eq(aiChatSessions.id, chatId), eq(aiChatSessions.userId, userId)))

	// Invalidate caches
	if (isRedisConfigured()) {
		try {
			const redis = getRedisClient()
			await redis.del(getChatRedisKey(userId, chatId))
			await redis.del(getListRedisKey(userId))
		} catch (err) {
			log.warn('Failed to invalidate Redis cache:', err)
		}
	}
}

// =============================================================================
// Legacy API (for backward compatibility during migration)
// =============================================================================

/**
 * @deprecated Use loadChat instead
 */
export function getChatSession(
	userId: string,
	chatId: string
): Promise<ChatSession | undefined> {
	return loadChat(userId, chatId)
}

/**
 * @deprecated Use loadChatMessages instead
 */
export async function getChatMessages(
	userId: string,
	chatId: string
): Promise<UIMessage[] | undefined> {
	const session = await loadChat(userId, chatId)
	return session?.messages
}

/**
 * @deprecated Use saveChat instead
 */
export async function saveChatMessages(
	userId: string,
	chatId: string,
	messages: UIMessage[]
): Promise<void> {
	await saveChat({ userId, chatId, messages })
}

/**
 * @deprecated No longer needed with onFinish-based persistence
 */
export function markStreamInProgress(
	_userId: string,
	_chatId: string,
	_assistantMessageId: string
): void {
	// No-op: Stream state tracking removed in favor of consumeStream
	log.debug('markStreamInProgress is deprecated and no longer tracks state')
}

/**
 * @deprecated No longer needed with onFinish-based persistence
 */
export function completeStream(
	_userId: string,
	_chatId: string,
	_assistantMessageId: string,
	_assistantMessage: UIMessage
): void {
	// No-op: Use saveChat in onFinish instead
	log.debug('completeStream is deprecated; use saveChat in onFinish callback')
}

/**
 * @deprecated Always returns false; stream state tracking removed
 */
export function isStreamInProgress(_userId: string, _chatId: string): boolean {
	return false
}

/**
 * @deprecated Use deleteChat instead
 */
export function deleteChatSession(userId: string, chatId: string): Promise<boolean> {
	return deleteChat(userId, chatId)
}

/**
 * @deprecated Use listUserChats instead
 */
export async function getUserChatSessions(userId: string): Promise<ChatSession[]> {
	// For backward compatibility, load full sessions
	const summaries = await listUserChats(userId)
	const sessions: ChatSession[] = []

	for (const summary of summaries) {
		const session = await loadChat(userId, summary.chatId)
		if (session) {
			sessions.push(session)
		}
	}

	return sessions
}
