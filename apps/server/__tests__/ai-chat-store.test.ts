import type { UIMessage } from 'ai'
import { beforeEach, describe, expect, it } from 'vitest'
import {
	createChat,
	deleteChat,
	// Legacy API (for backward compatibility tests)
	deleteChatSession,
	generateChatId,
	getChatMessages,
	getChatSession,
	getUserChatSessions,
	isStreamInProgress,
	listUserChats,
	loadChat,
	loadChatMessages,
	saveChat,
	saveChatMessages,
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

	beforeEach(() => {
		// Clean up test data
		deleteChat(testUserId, testChatId)
		deleteChat(otherUserId, testChatId)
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
		it('creates a new chat session with generated ID', () => {
			const session = createChat({ userId: testUserId })

			expect(session).toBeDefined()
			expect(session.userId).toBe(testUserId)
			expect(session.chatId).toBeDefined()
			expect(session.chatId.length).toBe(16)
			expect(session.messages).toEqual([])
			expect(session.createdAt).toBeInstanceOf(Date)
			expect(session.updatedAt).toBeInstanceOf(Date)

			// Clean up
			deleteChat(testUserId, session.chatId)
		})

		it('creates a chat with provided ID', () => {
			const session = createChat({
				userId: testUserId,
				chatId: testChatId,
			})

			expect(session.chatId).toBe(testChatId)
		})

		it('creates a chat with initial messages', () => {
			const messages: UIMessage[] = [createTestMessage('msg-1', 'user', 'Hello')]
			const session = createChat({
				userId: testUserId,
				chatId: testChatId,
				messages,
			})

			expect(session.messages).toEqual(messages)
		})
	})

	describe('loadChat / loadChatMessages', () => {
		it('loads a chat session by userId and chatId', () => {
			const messages: UIMessage[] = [
				createTestMessage('msg-1', 'user', 'Hello'),
				createTestMessage('msg-2', 'assistant', 'Hi there!'),
			]
			createChat({ userId: testUserId, chatId: testChatId, messages })

			const session = loadChat(testUserId, testChatId)

			expect(session).toBeDefined()
			expect(session?.userId).toBe(testUserId)
			expect(session?.chatId).toBe(testChatId)
			expect(session?.messages).toEqual(messages)
		})

		it('returns undefined for non-existent chat', () => {
			const session = loadChat(testUserId, 'non-existent-chat')
			expect(session).toBeUndefined()
		})

		it('loadChatMessages returns messages array', () => {
			const messages: UIMessage[] = [createTestMessage('msg-1', 'user', 'Hello')]
			createChat({ userId: testUserId, chatId: testChatId, messages })

			const loaded = loadChatMessages(testUserId, testChatId)
			expect(loaded).toEqual(messages)
		})

		it('loadChatMessages returns empty array for non-existent chat', () => {
			const loaded = loadChatMessages(testUserId, 'non-existent-chat')
			expect(loaded).toEqual([])
		})

		it('isolates chats by userId', () => {
			const userMessages: UIMessage[] = [
				createTestMessage('msg-1', 'user', 'User 1 message'),
			]
			const otherUserMessages: UIMessage[] = [
				createTestMessage('msg-2', 'user', 'User 2 message'),
			]

			createChat({
				userId: testUserId,
				chatId: testChatId,
				messages: userMessages,
			})
			createChat({
				userId: otherUserId,
				chatId: testChatId,
				messages: otherUserMessages,
			})

			expect(loadChatMessages(testUserId, testChatId)).toEqual(userMessages)
			expect(loadChatMessages(otherUserId, testChatId)).toEqual(otherUserMessages)

			// Clean up
			deleteChat(otherUserId, testChatId)
		})
	})

	describe('saveChat', () => {
		it('saves messages to an existing chat', () => {
			createChat({ userId: testUserId, chatId: testChatId })

			const messages: UIMessage[] = [
				createTestMessage('msg-1', 'user', 'Hello'),
				createTestMessage('msg-2', 'assistant', 'Hi there!'),
			]
			saveChat({ userId: testUserId, chatId: testChatId, messages })

			const loaded = loadChatMessages(testUserId, testChatId)
			expect(loaded).toEqual(messages)
		})

		it('creates a chat if it does not exist', () => {
			const messages: UIMessage[] = [createTestMessage('msg-1', 'user', 'Hello')]
			saveChat({ userId: testUserId, chatId: testChatId, messages })

			const loaded = loadChatMessages(testUserId, testChatId)
			expect(loaded).toEqual(messages)
		})

		it('preserves createdAt when updating', async () => {
			const session = createChat({ userId: testUserId, chatId: testChatId })
			const originalCreatedAt = session.createdAt

			// Wait a bit to ensure different timestamps
			await new Promise((resolve) => setTimeout(resolve, 10))

			const messages: UIMessage[] = [createTestMessage('msg-1', 'user', 'Hello')]
			saveChat({ userId: testUserId, chatId: testChatId, messages })

			const updated = loadChat(testUserId, testChatId)
			expect(updated?.createdAt.getTime()).toBe(originalCreatedAt.getTime())
			expect(updated?.updatedAt.getTime()).toBeGreaterThan(
				originalCreatedAt.getTime()
			)
		})
	})

	describe('deleteChat', () => {
		it('deletes an existing chat', () => {
			createChat({ userId: testUserId, chatId: testChatId })

			const deleted = deleteChat(testUserId, testChatId)

			expect(deleted).toBe(true)
			expect(loadChat(testUserId, testChatId)).toBeUndefined()
		})

		it('returns false for non-existent chat', () => {
			const deleted = deleteChat(testUserId, 'non-existent')
			expect(deleted).toBe(false)
		})
	})

	describe('listUserChats', () => {
		it('returns all chats for a user sorted by updatedAt', async () => {
			createChat({
				userId: testUserId,
				chatId: 'chat-1',
				messages: [createTestMessage('msg-1', 'user', 'Chat 1')],
			})

			// Wait a tiny bit to ensure different timestamps
			await new Promise((resolve) => setTimeout(resolve, 10))

			createChat({
				userId: testUserId,
				chatId: 'chat-2',
				messages: [createTestMessage('msg-2', 'user', 'Chat 2')],
			})

			const sessions = listUserChats(testUserId)

			expect(sessions).toHaveLength(2)
			// Should be sorted by updatedAt descending (most recent first)
			expect(sessions[0].chatId).toBe('chat-2')
			expect(sessions[1].chatId).toBe('chat-1')

			// Clean up
			deleteChat(testUserId, 'chat-1')
			deleteChat(testUserId, 'chat-2')
		})

		it('does not return chats from other users', () => {
			createChat({
				userId: testUserId,
				chatId: testChatId,
				messages: [createTestMessage('msg-1', 'user', 'Test')],
			})
			createChat({
				userId: otherUserId,
				chatId: 'other-chat',
				messages: [createTestMessage('msg-2', 'user', 'Other')],
			})

			const sessions = listUserChats(testUserId)

			expect(sessions).toHaveLength(1)
			expect(sessions[0].userId).toBe(testUserId)

			// Clean up
			deleteChat(otherUserId, 'other-chat')
		})
	})

	// ==========================================================================
	// Legacy API Tests (backward compatibility)
	// ==========================================================================

	describe('legacy API', () => {
		it('saveChatMessages / getChatMessages work as aliases', () => {
			const messages: UIMessage[] = [
				createTestMessage('msg-1', 'user', 'Hello'),
				createTestMessage('msg-2', 'assistant', 'Hi there!'),
			]

			saveChatMessages(testUserId, testChatId, messages)
			const retrieved = getChatMessages(testUserId, testChatId)

			expect(retrieved).toEqual(messages)
		})

		it('getChatSession returns session data', () => {
			const messages: UIMessage[] = [createTestMessage('msg-1', 'user', 'Test')]
			createChat({ userId: testUserId, chatId: testChatId, messages })

			const session = getChatSession(testUserId, testChatId)

			expect(session).toBeDefined()
			expect(session?.userId).toBe(testUserId)
			expect(session?.chatId).toBe(testChatId)
			expect(session?.messages).toEqual(messages)
		})

		it('deleteChatSession works as alias', () => {
			createChat({ userId: testUserId, chatId: testChatId })

			const deleted = deleteChatSession(testUserId, testChatId)

			expect(deleted).toBe(true)
			expect(loadChat(testUserId, testChatId)).toBeUndefined()
		})

		it('getUserChatSessions works as alias', () => {
			createChat({ userId: testUserId, chatId: testChatId })

			const sessions = getUserChatSessions(testUserId)

			expect(sessions).toHaveLength(1)
			expect(sessions[0].chatId).toBe(testChatId)
		})

		it('isStreamInProgress always returns false (deprecated)', () => {
			createChat({ userId: testUserId, chatId: testChatId })

			// Stream tracking is deprecated; always returns false
			expect(isStreamInProgress(testUserId, testChatId)).toBe(false)
		})
	})
})
