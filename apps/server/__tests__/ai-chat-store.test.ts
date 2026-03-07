import type { UIMessage } from 'ai'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import {
	clearMemoryStore,
	createChat,
	deleteChat,
	// Legacy API (for backward compatibility tests)
	deleteEmptyChat,
	disableMemoryStore,
	enableMemoryStore,
	generateChatId,
	isEmptySession,
	listUserChats,
	loadChat,
	loadChatMessages,
	saveChat,
} from '../src/services/ai-chat-store'

describe('ai-chat-store', () => {
	const testUserId = 'test-user-1'
	const testChatId = 'test-chat-1'
	const otherUserId = 'test-user-2'

	const createTestMessage = (
		id: string,
		role: 'user' | 'assistant',
		text: string
	): UIMessage => ({
		id,
		role,
		parts: [{ type: 'text', text }],
	})

	// Enable memory store for tests (no DB/Redis needed)
	beforeAll(() => {
		enableMemoryStore()
	})

	afterAll(() => {
		disableMemoryStore()
	})

	beforeEach(() => {
		// Clean up test data
		clearMemoryStore()
	})

	// ==========================================================================
	// Core API Tests (AI SDK v6 aligned)
	// ==========================================================================

	describe('generateChatId', () => {
		it('generates unique chat IDs', () => {
			const id1 = generateChatId()
			const id2 = generateChatId()

			expect(id1).toBeDefined()
			expect(id2).toBeDefined()
			expect(id1).not.toBe(id2)
			expect(id1.length).toBe(16)
		})
	})

	describe('createChat', () => {
		it('creates a new chat session with generated ID', async () => {
			const session = await createChat({ userId: testUserId })

			expect(session).toBeDefined()
			expect(session.userId).toBe(testUserId)
			expect(session.chatId).toBeDefined()
			expect(session.chatId.length).toBe(16)
			expect(session.messages).toEqual([])
			expect(session.createdAt).toBeInstanceOf(Date)
			expect(session.updatedAt).toBeInstanceOf(Date)
		})

		it('creates a chat with provided ID', async () => {
			const session = await createChat({
				userId: testUserId,
				chatId: testChatId,
			})

			expect(session.chatId).toBe(testChatId)
		})

		it('creates a chat with initial messages', async () => {
			const messages: UIMessage[] = [createTestMessage('msg-1', 'user', 'Hello')]
			const session = await createChat({
				userId: testUserId,
				chatId: testChatId,
				messages,
			})

			expect(session.messages).toEqual(messages)
		})

		it('generates title from first user message', async () => {
			const messages: UIMessage[] = [
				createTestMessage('msg-1', 'user', 'What is the meaning of life?'),
			]
			const session = await createChat({
				userId: testUserId,
				chatId: testChatId,
				messages,
			})

			expect(session.title).toBe('What is the meaning of life?')
		})

		it('uses provided title over generated one', async () => {
			const messages: UIMessage[] = [
				createTestMessage('msg-1', 'user', 'What is the meaning of life?'),
			]
			const session = await createChat({
				userId: testUserId,
				chatId: testChatId,
				messages,
				title: 'Philosophy Discussion',
			})

			expect(session.title).toBe('Philosophy Discussion')
		})
	})

	describe('loadChat / loadChatMessages', () => {
		it('loads a chat session by userId and chatId', async () => {
			const messages: UIMessage[] = [
				createTestMessage('msg-1', 'user', 'Hello'),
				createTestMessage('msg-2', 'assistant', 'Hi there!'),
			]
			await createChat({ userId: testUserId, chatId: testChatId, messages })

			const session = await loadChat(testUserId, testChatId)

			expect(session).toBeDefined()
			expect(session?.userId).toBe(testUserId)
			expect(session?.chatId).toBe(testChatId)
			expect(session?.messages).toEqual(messages)
		})

		it('returns undefined for non-existent chat', async () => {
			const session = await loadChat(testUserId, 'non-existent-chat')
			expect(session).toBeUndefined()
		})

		it('loadChatMessages returns messages array', async () => {
			const messages: UIMessage[] = [createTestMessage('msg-1', 'user', 'Hello')]
			await createChat({ userId: testUserId, chatId: testChatId, messages })

			const loaded = await loadChatMessages(testUserId, testChatId)
			expect(loaded).toEqual(messages)
		})

		it('loadChatMessages returns empty array for non-existent chat', async () => {
			const loaded = await loadChatMessages(testUserId, 'non-existent-chat')
			expect(loaded).toEqual([])
		})

		it('isolates chats by userId', async () => {
			const userMessages: UIMessage[] = [
				createTestMessage('msg-1', 'user', 'User 1 message'),
			]
			const otherUserMessages: UIMessage[] = [
				createTestMessage('msg-2', 'user', 'User 2 message'),
			]

			await createChat({
				userId: testUserId,
				chatId: testChatId,
				messages: userMessages,
			})
			await createChat({
				userId: otherUserId,
				chatId: testChatId,
				messages: otherUserMessages,
			})

			expect(await loadChatMessages(testUserId, testChatId)).toEqual(userMessages)
			expect(await loadChatMessages(otherUserId, testChatId)).toEqual(
				otherUserMessages
			)
		})

		it('updates lastOpenedAt when requested', async () => {
			await createChat({ userId: testUserId, chatId: testChatId })

			const before = await loadChat(testUserId, testChatId)
			const originalLastOpened = before?.lastOpenedAt

			// Wait a bit
			await new Promise((resolve) => setTimeout(resolve, 10))

			// Load with updateLastOpened
			const after = await loadChat(testUserId, testChatId, true)
			const updatedLastOpened = after?.lastOpenedAt

			expect(originalLastOpened).toBeInstanceOf(Date)
			expect(updatedLastOpened).toBeInstanceOf(Date)

			if (
				!(originalLastOpened instanceof Date && updatedLastOpened instanceof Date)
			) {
				throw new Error('Expected lastOpenedAt to be a Date')
			}

			expect(updatedLastOpened.getTime()).toBeGreaterThan(
				originalLastOpened.getTime()
			)
		})
	})

	describe('saveChat', () => {
		it('saves messages to an existing chat', async () => {
			await createChat({ userId: testUserId, chatId: testChatId })

			const messages: UIMessage[] = [
				createTestMessage('msg-1', 'user', 'Hello'),
				createTestMessage('msg-2', 'assistant', 'Hi there!'),
			]
			await saveChat({ userId: testUserId, chatId: testChatId, messages })

			const loaded = await loadChatMessages(testUserId, testChatId)
			expect(loaded).toEqual(messages)
		})

		it('creates a chat if it does not exist', async () => {
			const messages: UIMessage[] = [createTestMessage('msg-1', 'user', 'Hello')]
			await saveChat({ userId: testUserId, chatId: testChatId, messages })

			const loaded = await loadChatMessages(testUserId, testChatId)
			expect(loaded).toEqual(messages)
		})

		it('preserves createdAt when updating', async () => {
			const session = await createChat({ userId: testUserId, chatId: testChatId })
			const originalCreatedAt = session.createdAt

			// Wait a bit to ensure different timestamps
			await new Promise((resolve) => setTimeout(resolve, 10))

			const messages: UIMessage[] = [createTestMessage('msg-1', 'user', 'Hello')]
			await saveChat({ userId: testUserId, chatId: testChatId, messages })

			const updated = await loadChat(testUserId, testChatId)
			expect(updated?.createdAt.getTime()).toBe(originalCreatedAt.getTime())
			expect(updated?.updatedAt.getTime()).toBeGreaterThan(
				originalCreatedAt.getTime()
			)
		})

		it('updates preview and messageCount', async () => {
			const messages: UIMessage[] = [
				createTestMessage('msg-1', 'user', 'Hello'),
				createTestMessage('msg-2', 'assistant', 'Hi there! How can I help you?'),
			]
			await saveChat({ userId: testUserId, chatId: testChatId, messages })

			const session = await loadChat(testUserId, testChatId)
			expect(session?.messageCount).toBe(2)
			expect(session?.lastMessagePreview).toBe('Hi there! How can I help you?')
		})

		it('replaces a blank stored title with the generated fallback title', async () => {
			await createChat({ userId: testUserId, chatId: testChatId })

			const messages: UIMessage[] = [
				createTestMessage(
					'msg-1',
					'user',
					'How do I optimize TanStack Query cache keys?'
				),
				createTestMessage(
					'msg-2',
					'assistant',
					'Keep keys stable and use array segments for filters.'
				),
			]
			await saveChat({ userId: testUserId, chatId: testChatId, messages })

			const session = await loadChat(testUserId, testChatId)
			expect(session?.title).toBe('How do I optimize TanStack Query cache keys?')
		})
	})

	describe('deleteChat', () => {
		it('deletes an existing chat', async () => {
			await createChat({ userId: testUserId, chatId: testChatId })

			const deleted = await deleteChat(testUserId, testChatId)

			expect(deleted).toBe(true)
			expect(await loadChat(testUserId, testChatId)).toBeUndefined()
		})

		it('returns false for non-existent chat', async () => {
			const deleted = await deleteChat(testUserId, 'non-existent')
			expect(deleted).toBe(false)
		})
	})

	describe('listUserChats', () => {
		it('returns all chats for a user sorted by lastOpenedAt', async () => {
			await createChat({
				userId: testUserId,
				chatId: 'chat-1',
				messages: [createTestMessage('msg-1', 'user', 'Chat 1')],
			})

			// Wait a tiny bit to ensure different timestamps
			await new Promise((resolve) => setTimeout(resolve, 10))

			await createChat({
				userId: testUserId,
				chatId: 'chat-2',
				messages: [createTestMessage('msg-2', 'user', 'Chat 2')],
			})

			const sessions = await listUserChats(testUserId)

			expect(sessions).toHaveLength(2)
			// Should be sorted by lastOpenedAt descending (most recent first)
			expect(sessions[0]?.chatId).toBe('chat-2')
			expect(sessions[1]?.chatId).toBe('chat-1')
		})

		it('does not return chats from other users', async () => {
			await createChat({
				userId: testUserId,
				chatId: testChatId,
				messages: [createTestMessage('msg-1', 'user', 'Test')],
			})
			await createChat({
				userId: otherUserId,
				chatId: 'other-chat',
				messages: [createTestMessage('msg-2', 'user', 'Other')],
			})

			const sessions = await listUserChats(testUserId)

			expect(sessions).toHaveLength(1)
			expect(sessions[0]?.userId).toBe(testUserId)
		})

		it('returns summaries without full messages', async () => {
			const messages: UIMessage[] = [
				createTestMessage('msg-1', 'user', 'Hello world this is a test'),
			]
			await createChat({
				userId: testUserId,
				chatId: testChatId,
				messages,
			})

			const sessions = await listUserChats(testUserId)
			const [firstSession] = sessions

			expect(sessions).toHaveLength(1)
			expect(firstSession).toBeDefined()

			if (!firstSession) {
				throw new Error('Expected first session to be defined')
			}

			// Summary should not have messages property
			expect('messages' in firstSession).toBe(false)
			expect(firstSession.messageCount).toBe(1)
			expect(firstSession.lastMessagePreview).toBe('Hello world this is a test')
		})
	})

	// ==========================================================================
	// Empty Session Management Tests
	// ==========================================================================

	describe('empty session management', () => {
		describe('isEmptySession', () => {
			it('returns true for session with no messages', async () => {
				const session = await createChat({ userId: testUserId })

				expect(isEmptySession(session)).toBe(true)
			})

			it('returns false for session with messages', async () => {
				const messages: UIMessage[] = [createTestMessage('msg-1', 'user', 'Hello')]
				const session = await createChat({
					userId: testUserId,
					chatId: testChatId,
					messages,
				})

				expect(isEmptySession(session)).toBe(false)
			})
		})

		describe('createChat empty session reuse', () => {
			it('reuses existing empty session when creating new empty session', async () => {
				// Create first empty session
				const first = await createChat({ userId: testUserId })

				// Create second empty session (should reuse first)
				const second = await createChat({ userId: testUserId })

				// Should return the same chatId
				expect(second.chatId).toBe(first.chatId)

				// Only one session should exist
				const sessions = await listUserChats(testUserId)
				expect(sessions).toHaveLength(1)
			})

			it('creates new session when chatId is explicitly provided', async () => {
				// Create first empty session
				const first = await createChat({ userId: testUserId })

				// Create second with explicit chatId
				const second = await createChat({
					userId: testUserId,
					chatId: 'explicit-id',
				})

				// Should be different
				expect(second.chatId).not.toBe(first.chatId)
				expect(second.chatId).toBe('explicit-id')
			})

			it('creates new session when messages are provided', async () => {
				// Create first empty session
				const first = await createChat({ userId: testUserId })

				// Create second with messages
				const messages: UIMessage[] = [createTestMessage('msg-1', 'user', 'Hello')]
				const second = await createChat({ userId: testUserId, messages })

				// Should be different
				expect(second.chatId).not.toBe(first.chatId)
			})

			it('creates new session when title is provided', async () => {
				// Create first empty session
				const first = await createChat({ userId: testUserId })

				// Create second with title
				const second = await createChat({
					userId: testUserId,
					title: 'My Chat',
				})

				// Should be different
				expect(second.chatId).not.toBe(first.chatId)
			})

			it('cleans up other empty sessions when reusing', async () => {
				// Create first empty session with explicit ID
				await createChat({ userId: testUserId, chatId: 'empty-1' })

				// Create second empty session with explicit ID
				await createChat({ userId: testUserId, chatId: 'empty-2' })

				// Verify both exist
				let sessions = await listUserChats(testUserId)
				// listUserChats will clean up duplicates, keeping only the most recent
				expect(sessions.length).toBeLessThanOrEqual(2)

				// Create third empty session (should reuse and clean up)
				const third = await createChat({ userId: testUserId })

				// Only one empty session should remain
				sessions = await listUserChats(testUserId)
				const emptySessions = sessions.filter((s) => s.messageCount === 0)
				expect(emptySessions).toHaveLength(1)
				expect(emptySessions[0]?.chatId).toBe(third.chatId)
			})
		})

		describe('deleteEmptyChat', () => {
			it('deletes an empty chat session', async () => {
				const session = await createChat({
					userId: testUserId,
					chatId: testChatId,
				})

				expect(isEmptySession(session)).toBe(true)

				const deleted = await deleteEmptyChat(testUserId, testChatId)

				expect(deleted).toBe(true)
				expect(await loadChat(testUserId, testChatId)).toBeUndefined()
			})

			it('does not delete non-empty chat session', async () => {
				const messages: UIMessage[] = [createTestMessage('msg-1', 'user', 'Hello')]
				await createChat({
					userId: testUserId,
					chatId: testChatId,
					messages,
				})

				const deleted = await deleteEmptyChat(testUserId, testChatId)

				expect(deleted).toBe(false)
				// Session should still exist
				const session = await loadChat(testUserId, testChatId)
				expect(session).toBeDefined()
			})

			it('returns false for non-existent chat', async () => {
				const deleted = await deleteEmptyChat(testUserId, 'non-existent')

				expect(deleted).toBe(false)
			})

			it('isolates by userId', async () => {
				// Create empty session for test user
				await createChat({ userId: testUserId, chatId: testChatId })

				// Try to delete with different user
				const deleted = await deleteEmptyChat(otherUserId, testChatId)

				expect(deleted).toBe(false)

				// Original session should still exist
				const session = await loadChat(testUserId, testChatId)
				expect(session).toBeDefined()
			})
		})

		describe('listUserChats empty session cleanup', () => {
			it('keeps only the most recent empty session in list', async () => {
				// Create multiple empty sessions with explicit IDs
				await createChat({ userId: testUserId, chatId: 'empty-old' })
				await new Promise((resolve) => setTimeout(resolve, 10))
				await createChat({ userId: testUserId, chatId: 'empty-new' })

				// Also create a non-empty session
				const messages: UIMessage[] = [createTestMessage('msg-1', 'user', 'Hello')]
				await createChat({
					userId: testUserId,
					chatId: 'has-messages',
					messages,
				})

				// List should clean up duplicates
				const sessions = await listUserChats(testUserId)

				// Should have non-empty session and at most one empty session
				const emptySessions = sessions.filter((s) => s.messageCount === 0)
				const nonEmptySessions = sessions.filter((s) => s.messageCount > 0)

				expect(emptySessions.length).toBeLessThanOrEqual(1)
				expect(nonEmptySessions).toHaveLength(1)
				expect(nonEmptySessions[0]?.chatId).toBe('has-messages')
			})
		})
	})

	// ==========================================================================
	// Legacy API Tests (backward compatibility)
	// ==========================================================================
})
