/**
 * Hook for managing chat sessions
 *
 * Provides:
 * - List of chat sessions for the current user
 * - Create/delete/switch chat operations
 * - Auto-select most recent chat on mount
 * - Empty session cleanup on switch
 */

import { startTransition, useCallback, useEffect, useRef, useState } from 'react'
import type { ChatSessionSummary } from '@/features/knowledge/types'
import { getLastChatId, setLastChatId } from '@/features/knowledge/utils'
import { getServerUrl } from '@/utils/api-environment'

// =============================================================================
// Types
// =============================================================================

export type UseChatSessionsConfig = {
	/** Whether to auto-load sessions on mount */
	autoLoad?: boolean
	/** Auto-create first chat when session list is empty */
	autoCreateIfEmpty?: boolean
}

export type RefreshSessionsOptions = {
	/** Skip isLoading toggle to avoid Skeleton flicker when data already exists */
	silent?: boolean
}

export type UseChatSessionsReturn = {
	/** List of chat sessions */
	sessions: ChatSessionSummary[]
	/** Currently selected chat ID */
	selectedChatId: string | null
	/** Loading state */
	isLoading: boolean
	/** Error state */
	error: Error | null
	/** Refresh the session list */
	refreshSessions: (options?: RefreshSessionsOptions) => Promise<void>
	/** Select a chat session */
	selectChat: (chatId: string) => void
	/** Create a new chat session */
	createChat: (title?: string) => Promise<string>
	/** Delete a chat session */
	deleteChat: (chatId: string) => Promise<boolean>
	/** Delete an empty chat session (best-effort cleanup) */
	deleteEmptyChat: (chatId: string) => Promise<boolean>
	/** Check if a session is empty */
	isSessionEmpty: (chatId: string) => boolean
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Check if a session summary represents an empty session
 */
function isEmptySession(session: ChatSessionSummary): boolean {
	return session.messageCount === 0 && session.lastMessageAt === null
}

// =============================================================================
// Hook
// =============================================================================

export function useChatSessions(
	config: UseChatSessionsConfig = {}
): UseChatSessionsReturn {
	const { autoLoad = true, autoCreateIfEmpty = false } = config

	const [sessions, setSessions] = useState<ChatSessionSummary[]>([])
	const [selectedChatId, setSelectedChatId] = useState<string | null>(null)
	const [isLoading, setIsLoading] = useState(autoLoad)
	const [error, setError] = useState<Error | null>(null)

	// Track previous chat ID for cleanup on switch
	const previousChatIdRef = useRef<string | null>(null)
	const selectedChatIdRef = useRef<string | null>(null)
	const hasAutoCreatedInitialChatRef = useRef(false)
	const hasCompletedInitialLoadRef = useRef(false)

	const fetchChatSessions = useCallback(async (): Promise<ChatSessionSummary[]> => {
		const response = await fetch(`${getServerUrl()}/api/ai/chats`, {
			credentials: 'include',
		})

		if (!response.ok) {
			throw new Error(`Failed to fetch chat sessions: ${response.status}`)
		}

		const data = (await response.json()) as { chats: ChatSessionSummary[] }
		return data.chats
	}, [])

	const selectInitialChatIfNeeded = useCallback(
		(chatList: ChatSessionSummary[], currentSelectedChatId: string | null) => {
			if (currentSelectedChatId || chatList.length === 0) return

			const lastChatId = getLastChatId()
			const restoredChat = lastChatId
				? chatList.find((chat) => chat.chatId === lastChatId)
				: null
			const targetChat = restoredChat ?? chatList[0]

			if (!targetChat) return

			setSelectedChatId(targetChat.chatId)
			setLastChatId(targetChat.chatId)
		},
		[]
	)

	const createInitialChatAndRefresh = useCallback(async () => {
		const createResponse = await fetch(`${getServerUrl()}/api/ai/chat`, {
			method: 'POST',
			credentials: 'include',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({}),
		})

		if (!createResponse.ok) {
			throw new Error(`Failed to create initial chat: ${createResponse.status}`)
		}

		const createdChat = (await createResponse.json()) as { chatId: string }
		setSelectedChatId(createdChat.chatId)
		setLastChatId(createdChat.chatId)
		previousChatIdRef.current = createdChat.chatId

		const refreshedChats = await fetchChatSessions()
		setSessions(refreshedChats)
	}, [fetchChatSessions])

	const refreshSessions = useCallback(
		async (options?: RefreshSessionsOptions) => {
			const silent = options?.silent ?? hasCompletedInitialLoadRef.current
			if (!silent) {
				setIsLoading(true)
			}
			setError(null)

			try {
				const chatList = await fetchChatSessions()
				startTransition(() => {
					setSessions(chatList)
				})
				const currentSelectedChatId = selectedChatIdRef.current
				selectInitialChatIfNeeded(chatList, currentSelectedChatId)

				const shouldCreateInitialChat =
					autoCreateIfEmpty &&
					chatList.length === 0 &&
					!hasAutoCreatedInitialChatRef.current &&
					!currentSelectedChatId

				if (shouldCreateInitialChat) {
					hasAutoCreatedInitialChatRef.current = true
					await createInitialChatAndRefresh()
				}
			} catch (err) {
				setError(err instanceof Error ? err : new Error('Unknown error'))
			} finally {
				hasCompletedInitialLoadRef.current = true
				if (!silent) {
					setIsLoading(false)
				}
			}
		},
		[
			autoCreateIfEmpty,
			fetchChatSessions,
			selectInitialChatIfNeeded,
			createInitialChatAndRefresh,
		]
	)

	// Check if a session is empty by chatId
	const isSessionEmpty = useCallback(
		(chatId: string): boolean => {
			const session = sessions.find((s) => s.chatId === chatId)
			return session ? isEmptySession(session) : false
		},
		[sessions]
	)

	// Delete an empty chat session (best-effort cleanup, silent failure)
	const deleteEmptyChat = useCallback(async (chatId: string): Promise<boolean> => {
		try {
			const response = await fetch(`${getServerUrl()}/api/ai/chat/${chatId}/empty`, {
				method: 'DELETE',
				credentials: 'include',
			})

			if (!response.ok) {
				return false
			}

			const data = (await response.json()) as { success: boolean; deleted: boolean }

			if (data.deleted) {
				// Update local state
				setSessions((prev) => prev.filter((s) => s.chatId !== chatId))
			}

			return data.deleted
		} catch {
			// Silent failure for cleanup
			return false
		}
	}, [])

	// Select a chat (with cleanup of previous empty session)
	const selectChat = useCallback(
		(chatId: string) => {
			const previousChatId = previousChatIdRef.current

			// Update selection first
			setSelectedChatId(chatId)
			setLastChatId(chatId)
			previousChatIdRef.current = chatId

			// Touch the chat to update lastOpenedAt
			fetch(`${getServerUrl()}/api/ai/chat/${chatId}/touch`, {
				method: 'POST',
				credentials: 'include',
			}).catch(() => {
				// Ignore errors for touch - non-critical
			})

			// Cleanup previous empty session if different from current
			if (previousChatId && previousChatId !== chatId) {
				// Check if previous session was empty and delete it
				const prevSession = sessions.find((s) => s.chatId === previousChatId)
				if (prevSession && isEmptySession(prevSession)) {
					deleteEmptyChat(previousChatId).catch(() => {
						// Silent failure for cleanup
					})
				}
			}
		},
		[sessions, deleteEmptyChat]
	)

	// Create a new chat
	const createChat = useCallback(
		async (title?: string): Promise<string> => {
			const response = await fetch(`${getServerUrl()}/api/ai/chat`, {
				method: 'POST',
				credentials: 'include',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({ title }),
			})

			if (!response.ok) {
				throw new Error(`Failed to create chat: ${response.status}`)
			}

			const data = (await response.json()) as { chatId: string }
			const newChatId = data.chatId
			const now = new Date().toISOString()

			// Optimistic update: prepend the new session immediately
			const optimisticSession: ChatSessionSummary = {
				chatId: newChatId,
				userId: '',
				title: title || '',
				messageCount: 0,
				lastMessagePreview: '',
				lastMessageAt: null,
				lastOpenedAt: now,
				updatedAt: now,
				createdAt: now,
			}

			setSelectedChatId(newChatId)
			setLastChatId(newChatId)
			startTransition(() => {
				setSessions((prev) => [optimisticSession, ...prev])
			})

			// Background revalidate — fire and forget
			refreshSessions({ silent: true }).catch(() => {
				// Non-critical: optimistic state is already visible
			})

			return newChatId
		},
		[refreshSessions]
	)

	// Delete a chat
	const deleteChat = useCallback(
		async (chatId: string): Promise<boolean> => {
			const response = await fetch(`${getServerUrl()}/api/ai/chat/${chatId}`, {
				method: 'DELETE',
				credentials: 'include',
			})

			if (!response.ok) {
				if (response.status === 404) return false
				throw new Error(`Failed to delete chat: ${response.status}`)
			}

			// Update local state
			setSessions((prev) => prev.filter((s) => s.chatId !== chatId))

			// If we deleted the selected chat, select another one
			if (selectedChatId === chatId) {
				const remaining = sessions.filter((s) => s.chatId !== chatId)
				const nextChat = remaining[0]
				if (nextChat) {
					setSelectedChatId(nextChat.chatId)
					setLastChatId(nextChat.chatId)
				} else {
					setSelectedChatId(null)
				}
			}

			return true
		},
		[selectedChatId, sessions]
	)

	// Auto-load sessions on mount
	useEffect(() => {
		if (autoLoad) {
			refreshSessions()
		}
	}, [autoLoad, refreshSessions])

	// Update previous chat ID ref when selected chat changes externally
	useEffect(() => {
		if (selectedChatId) {
			previousChatIdRef.current = selectedChatId
		}
		selectedChatIdRef.current = selectedChatId
	}, [selectedChatId])

	return {
		sessions,
		selectedChatId,
		isLoading,
		error,
		refreshSessions,
		selectChat,
		createChat,
		deleteChat,
		deleteEmptyChat,
		isSessionEmpty,
	}
}
