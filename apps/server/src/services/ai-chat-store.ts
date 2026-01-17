/**
 * Chat store for AI conversation persistence
 *
 * This module provides storage for chat messages using the AI SDK v6 UIMessage format.
 * Currently uses in-memory storage; messages are lost on server restart.
 * For production, replace the storage backend with a database.
 *
 * Design follows AI SDK v6 best practices:
 * - Messages stored as UIMessage[] (the canonical format for persistence)
 * - Server-generated message IDs via createIdGenerator
 * - Unified saveChat in onFinish callback
 * - consumeStream for disconnect resilience
 */

import { createLogger } from '@folionote/log'
import type { UIMessage } from 'ai'
import { nanoid } from 'nanoid'

const log = createLogger({ prefix: 'ai-chat-store' })

// =============================================================================
// Types
// =============================================================================

/** Chat session metadata and messages */
export type ChatSession = {
	/** User ID (owner) */
	userId: string
	/** Chat ID */
	chatId: string
	/** Messages in UIMessage format (AI SDK v6 standard) */
	messages: UIMessage[]
	/** Last update timestamp */
	updatedAt: Date
	/** Creation timestamp */
	createdAt: Date
}

/** Input for creating a new chat */
export type CreateChatInput = {
	userId: string
	chatId?: string
	messages?: UIMessage[]
}

/** Input for saving chat messages */
export type SaveChatInput = {
	userId: string
	chatId: string
	messages: UIMessage[]
}

// =============================================================================
// Storage Backend (In-Memory)
// =============================================================================

/** In-memory store keyed by `${userId}:${chatId}` */
const chatStore = new Map<string, ChatSession>()

/** Maximum age for a chat session (24 hours) */
const MAX_SESSION_AGE_MS = 24 * 60 * 60 * 1000

/** Maximum number of sessions to keep in memory */
const MAX_SESSIONS = 1000

/**
 * Generate a composite key for the store
 */
function getStoreKey(userId: string, chatId: string): string {
	return `${userId}:${chatId}`
}

/**
 * Clean up old sessions to prevent memory leaks
 */
function cleanupOldSessions(): void {
	const now = Date.now()
	const keysToDelete: string[] = []

	for (const [key, session] of chatStore.entries()) {
		const age = now - session.updatedAt.getTime()
		if (age > MAX_SESSION_AGE_MS) {
			keysToDelete.push(key)
		}
	}

	for (const key of keysToDelete) {
		chatStore.delete(key)
	}

	// If still over limit, remove oldest sessions
	if (chatStore.size > MAX_SESSIONS) {
		const sessions = [...chatStore.entries()].sort(
			(a, b) => a[1].updatedAt.getTime() - b[1].updatedAt.getTime()
		)
		const toRemove = sessions.slice(0, chatStore.size - MAX_SESSIONS)
		for (const [key] of toRemove) {
			chatStore.delete(key)
		}
	}

	if (keysToDelete.length > 0) {
		log.debug(`Cleaned up ${keysToDelete.length} old chat sessions`)
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

/**
 * Create a new chat session
 *
 * @returns The created chat session with chatId
 */
export function createChat(input: CreateChatInput): ChatSession {
	cleanupOldSessions()

	const chatId = input.chatId ?? generateChatId()
	const key = getStoreKey(input.userId, chatId)
	const now = new Date()

	const session: ChatSession = {
		userId: input.userId,
		chatId,
		messages: input.messages ?? [],
		createdAt: now,
		updatedAt: now,
	}

	chatStore.set(key, session)
	log.debug(`Created chat session: ${chatId} for user ${input.userId}`)

	return session
}

/**
 * Load a chat session by userId and chatId
 *
 * @returns The chat session or undefined if not found
 */
export function loadChat(userId: string, chatId: string): ChatSession | undefined {
	const key = getStoreKey(userId, chatId)
	return chatStore.get(key)
}

/**
 * Load chat messages by userId and chatId
 *
 * This is the primary method for loading messages to pass to useChat initialMessages.
 *
 * @returns The messages array or empty array if chat not found
 */
export function loadChatMessages(userId: string, chatId: string): UIMessage[] {
	const session = loadChat(userId, chatId)
	return session?.messages ?? []
}

/**
 * Save chat messages (called from onFinish callback)
 *
 * This is the unified save point called after stream completion.
 * The messages array should be the complete UIMessage[] from onFinish.
 */
export function saveChat(input: SaveChatInput): void {
	cleanupOldSessions()

	const key = getStoreKey(input.userId, input.chatId)
	const existing = chatStore.get(key)
	const now = new Date()

	chatStore.set(key, {
		userId: input.userId,
		chatId: input.chatId,
		messages: input.messages,
		createdAt: existing?.createdAt ?? now,
		updatedAt: now,
	})

	log.debug(
		`Saved chat ${input.chatId}: ${input.messages.length} messages for user ${input.userId}`
	)
}

/**
 * Delete a chat session
 *
 * @returns true if the session was deleted, false if not found
 */
export function deleteChat(userId: string, chatId: string): boolean {
	const key = getStoreKey(userId, chatId)
	const deleted = chatStore.delete(key)
	if (deleted) {
		log.debug(`Deleted chat session: ${chatId} for user ${userId}`)
	}
	return deleted
}

/**
 * List all chat sessions for a user
 *
 * @returns Array of chat sessions sorted by updatedAt (newest first)
 */
export function listUserChats(userId: string): ChatSession[] {
	const sessions: ChatSession[] = []
	for (const session of chatStore.values()) {
		if (session.userId === userId) {
			sessions.push(session)
		}
	}
	return sessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
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
): ChatSession | undefined {
	return loadChat(userId, chatId)
}

/**
 * @deprecated Use loadChatMessages instead
 */
export function getChatMessages(
	userId: string,
	chatId: string
): UIMessage[] | undefined {
	const session = loadChat(userId, chatId)
	return session?.messages
}

/**
 * @deprecated Use saveChat instead
 */
export function saveChatMessages(
	userId: string,
	chatId: string,
	messages: UIMessage[]
): void {
	saveChat({ userId, chatId, messages })
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
export function deleteChatSession(userId: string, chatId: string): boolean {
	return deleteChat(userId, chatId)
}

/**
 * @deprecated Use listUserChats instead
 */
export function getUserChatSessions(userId: string): ChatSession[] {
	return listUserChats(userId)
}
