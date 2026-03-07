/**
 * Knowledge Chat Hook
 *
 * Wraps AI SDK v6's useChat hook for the Knowledge page.
 * Handles:
 * - Server-side message persistence
 * - RAG context (attached notes)
 * - BYOK credentials
 * - Thinking/reasoning toggle
 *
 * The server handles:
 * - Message ID generation (createIdGenerator)
 * - Message persistence (onFinish -> saveChat)
 * - Stream completion on disconnect (consumeStream)
 */

import { type UIMessage, useChat } from '@ai-sdk/react'
import {
	DefaultChatTransport,
	type FileUIPart,
	lastAssistantMessageIsCompleteWithToolCalls,
} from 'ai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { getServerUrl } from '@/utils/api-environment'

// =============================================================================
// Types
// =============================================================================

export type KnowledgeChatMessage = UIMessage & {
	content: string
	timestamp: Date
	/** Whether this message is currently being streamed */
	isStreaming?: boolean
	/** Thinking/reasoning content (for models that support extended thinking) */
	thinking?: string
	/** Token usage from the AI provider */
	usage?: {
		inputTokens?: number
		outputTokens?: number
		totalTokens?: number
		reasoningTokens?: number
		cachedInputTokens?: number
		costUSD?: number
	}
	/** Mention titles for rendering @mentions in user messages */
	mentionTitles?: string[]
	/** Context compaction metadata for summary messages */
	compactInfo?: CompactInfo
}

type CompactInfo = {
	compactedAt: string
	originalMessageCount: number
	compactedMessageCount: number
	keptMessageCount: number
	summaryTokens: number
}

export type KnowledgeChatConfig = {
	/** Chat session ID */
	chatId: string
	/** Initial messages to load */
	initialMessages?: UIMessage[]
	/** Provider ID (e.g., 'openai', 'claude') */
	provider: string
	/** API key for BYOK */
	apiKey: string
	/** Optional base URL override */
	baseUrl?: string
	/** Model ID */
	model: string
	/** IDs of notes to attach as RAG context */
	noteEntryIds?: string[]
	/** Enable extended thinking/reasoning */
	enableReasoning?: boolean
	/** Enable web search tool */
	enableWebSearch?: boolean
	/** Called after one full stream finishes successfully */
	onMessageComplete?: (chatId: string) => void | Promise<void>
}

export type SendMessageOptions = {
	/** The message text to send */
	text: string
	/** Optional file attachments */
	files?: FileUIPart[]
	/** Mention titles for display */
	mentionTitles?: string[]
	/** Note IDs to attach */
	noteEntryIds?: string[]
}

export type CompactContextOptions = {
	keepRecentCount?: number
	tokensToCompact?: number
}

export type CompactContextResult = {
	chatId: string
	messages: UIMessage[]
	summary: string
	compactedCount: number
	keptCount: number
	compactInfo?: CompactInfo
}

type GenerateChatTitleResponse = {
	success: boolean
	generated: boolean
	title: string
}

// =============================================================================
// Message Cache (module-level, survives re-renders and component remounts)
// =============================================================================

const MAX_CACHED_CHATS = 20

const chatMessageCache = new Map<string, UIMessage[]>()

export function getCachedMessages(chatId: string): UIMessage[] | undefined {
	return chatMessageCache.get(chatId)
}

function setCachedMessages(chatId: string, messages: UIMessage[]): void {
	if (chatMessageCache.size >= MAX_CACHED_CHATS) {
		const oldest = chatMessageCache.keys().next().value
		if (oldest) chatMessageCache.delete(oldest)
	}
	chatMessageCache.set(chatId, messages)
}

export function clearCachedMessages(chatId: string): void {
	chatMessageCache.delete(chatId)
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Message metadata type from server
 * Contains usage information attached via messageMetadata callback
 */
type MessageMetadata = {
	usage?: KnowledgeChatMessage['usage']
	compactInfo?: CompactInfo
}

/**
 * Convert UIMessage to KnowledgeChatMessage for UI rendering
 */
function uiMessageToKnowledgeMessage(
	msg: UIMessage,
	isStreaming: boolean
): KnowledgeChatMessage {
	const content = getTextFromParts(msg.parts)
	const thinking = getReasoningFromParts(msg.parts)

	// Extract usage from metadata (sent via messageMetadata on server)
	const metadata = msg.metadata as MessageMetadata | undefined
	const usage = metadata?.usage
	const compactInfo = isCompactInfo(metadata?.compactInfo)
		? metadata.compactInfo
		: undefined

	return {
		...msg,
		content,
		timestamp: new Date(),
		isStreaming,
		thinking,
		usage,
		compactInfo,
	}
}

// =============================================================================
// Hook
// =============================================================================

export function useKnowledgeChat(config: KnowledgeChatConfig) {
	const {
		chatId,
		initialMessages = [],
		provider,
		apiKey,
		baseUrl,
		model,
		noteEntryIds: defaultNoteEntryIds = [],
		enableReasoning = false,
		enableWebSearch = false,
		onMessageComplete,
	} = config

	// Use refs for values that change but shouldn't trigger transport recreation
	const configRef = useRef({
		provider,
		apiKey,
		baseUrl,
		model,
		enableReasoning,
		enableWebSearch,
	})
	configRef.current = {
		provider,
		apiKey,
		baseUrl,
		model,
		enableReasoning,
		enableWebSearch,
	}

	// Track current request's note IDs (can be overridden per-message)
	const currentNoteEntryIdsRef = useRef<string[]>(defaultNoteEntryIds)

	// Track mention titles by message content (since we don't have ID until after send)
	const mentionTitlesMapRef = useRef<Map<string, string[]>>(new Map())
	const resolvedTitleChatIdsRef = useRef<Set<string>>(new Set())

	// State for last chatId returned from server
	const [serverChatId, setServerChatId] = useState<string>(chatId)
	const [isCompacting, setIsCompacting] = useState(false)
	const previousStatusRef = useRef<'submitted' | 'streaming' | 'ready' | 'error'>(
		'ready'
	)

	// Create transport with stable reference
	const transport = useMemo(
		() =>
			new DefaultChatTransport({
				api: `${getServerUrl()}/api/ai/stream`,
				credentials: 'include',
				// Custom request body with BYOK and RAG context
				prepareSendMessagesRequest: ({
					id,
					messages,
				}: {
					id: string
					messages: UIMessage[]
				}) => {
					const currentConfig = configRef.current

					// Get the last user message as the prompt (for RAG query)
					const lastMessage = messages.at(-1)
					const prompt =
						lastMessage?.role === 'user'
							? lastMessage.parts
									?.filter(
										(p): p is { type: 'text'; text: string } => p.type === 'text'
									)
									.map((p) => p.text)
									.join('') || ''
							: ''

					return {
						body: {
							chatId: id,
							provider: currentConfig.provider,
							apiKey: currentConfig.apiKey,
							baseUrl: currentConfig.baseUrl?.trim() || undefined,
							model: currentConfig.model.trim() || undefined,
							prompt,
							messages,
							noteEntryIds:
								currentNoteEntryIdsRef.current.length > 0
									? currentNoteEntryIdsRef.current
									: undefined,
							enableReasoning: currentConfig.enableReasoning,
							enableWebSearch: currentConfig.enableWebSearch,
						},
					}
				},
			}),
		[] // Stable - uses refs for dynamic values
	)

	// Use AI SDK's useChat hook
	const {
		messages: uiMessages,
		sendMessage: aiSendMessage,
		status,
		error,
		setMessages: setUIMessages,
		stop,
		regenerate,
		addToolApprovalResponse,
	} = useChat({
		id: serverChatId,
		messages: initialMessages ?? [],
		transport,
		sendAutomaticallyWhen: ({ messages }) =>
			hasApprovalResponse(messages) ||
			lastAssistantMessageIsCompleteWithToolCalls({ messages }),
	})

	// Convert UIMessages to KnowledgeChatMessages for UI
	const messages = useMemo<KnowledgeChatMessage[]>(() => {
		const lastAssistantMessageId = getLastAssistantMessageId(uiMessages)

		return uiMessages.map((msg) => {
			const isMessageStreaming =
				status === 'streaming' &&
				msg.role === 'assistant' &&
				msg.id === lastAssistantMessageId
			const base = uiMessageToKnowledgeMessage(msg, isMessageStreaming)

			// For user messages, look up mentionTitles by content
			if (msg.role === 'user') {
				const mentionTitles = mentionTitlesMapRef.current.get(base.content)
				if (mentionTitles) {
					return { ...base, mentionTitles }
				}
			}

			return base
		})
	}, [uiMessages, status])

	// Derived states
	const isStreaming = status === 'streaming'
	const isLoading = status === 'submitted' || status === 'streaming'

	useEffect(() => {
		if (chatId && chatId !== serverChatId) {
			setServerChatId(chatId)
		}
	}, [chatId, serverChatId])

	// Send a message with optional note attachments
	const sendMessage = useCallback(
		(options: SendMessageOptions) => {
			const { text, files = [], mentionTitles, noteEntryIds = [] } = options

			if (!serverChatId.trim()) {
				return
			}

			if (!text.trim() && files.length === 0) {
				return
			}

			// Store mention titles by message text for later lookup
			if (mentionTitles && mentionTitles.length > 0) {
				mentionTitlesMapRef.current.set(text, mentionTitles)
			}

			// Update note IDs for this request
			currentNoteEntryIdsRef.current =
				noteEntryIds.length > 0 ? noteEntryIds : defaultNoteEntryIds

			// Send via useChat
			aiSendMessage({ text, files })
		},
		[aiSendMessage, defaultNoteEntryIds]
	)

	// Clear all messages (for new chat)
	const clearMessages = useCallback(() => {
		setUIMessages([])
		mentionTitlesMapRef.current.clear()
	}, [setUIMessages])

	// Reset for new chat
	const resetChat = useCallback(
		(newChatId: string) => {
			setServerChatId(newChatId)
			resolvedTitleChatIdsRef.current.delete(newChatId)
			clearMessages()
		},
		[clearMessages]
	)

	// Synchronously restore messages from cache (returns true if cache hit)
	const restoreFromCache = useCallback(
		(targetChatId: string): boolean => {
			const cached = getCachedMessages(targetChatId)
			if (cached) {
				setUIMessages(cached)
				setServerChatId(targetChatId)
				return true
			}
			return false
		},
		[setUIMessages]
	)

	// Load messages from server for a given chat (writes to cache on success)
	const loadMessages = useCallback(
		async (targetChatId: string) => {
			if (!targetChatId.trim()) {
				clearMessages()
				return
			}

			const response = await fetch(`${getServerUrl()}/api/ai/chat/${targetChatId}`, {
				credentials: 'include',
			})

			if (!response.ok) {
				if (response.status === 404) {
					clearMessages()
					clearCachedMessages(targetChatId)
					return
				}
				throw new Error(`Failed to load chat: ${response.status}`)
			}

			const data = (await response.json()) as {
				chatId: string
				title: string
				messages: UIMessage[]
			}

			setUIMessages(data.messages)
			setServerChatId(data.chatId)
			setCachedMessages(targetChatId, data.messages)
			if (data.title.trim()) {
				resolvedTitleChatIdsRef.current.add(targetChatId)
			}
		},
		[clearMessages, setUIMessages]
	)

	const generateChatTitleIfNeeded = useCallback(
		async (targetChatId: string, targetMessages: UIMessage[]): Promise<void> => {
			if (resolvedTitleChatIdsRef.current.has(targetChatId)) {
				return
			}
			if (targetMessages.length === 0) {
				return
			}

			const currentConfig = configRef.current
			const response = await fetch(
				`${getServerUrl()}/api/ai/chat/${targetChatId}/title`,
				{
					method: 'POST',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						provider: currentConfig.provider,
						apiKey: currentConfig.apiKey,
						baseUrl: currentConfig.baseUrl?.trim() || undefined,
						model: currentConfig.model.trim() || undefined,
						messages: targetMessages,
					}),
				}
			)

			if (!response.ok) {
				throw new Error(`Failed to generate chat title: ${response.status}`)
			}

			const data = (await response.json()) as GenerateChatTitleResponse
			if (data.title.trim()) {
				resolvedTitleChatIdsRef.current.add(targetChatId)
			}
		},
		[]
	)

	useEffect(() => {
		const previousStatus = previousStatusRef.current
		const hadActiveStream =
			previousStatus === 'submitted' || previousStatus === 'streaming'

		if (status === 'ready' && hadActiveStream && serverChatId) {
			const handlePostStreamSideEffects = async () => {
				try {
					await generateChatTitleIfNeeded(serverChatId, uiMessages)
				} catch {
					// Ignore title generation errors to avoid breaking the chat flow.
				}

				if (!onMessageComplete) {
					return
				}

				Promise.resolve(onMessageComplete(serverChatId)).catch(() => {
					// Ignore callback errors to avoid breaking the chat flow.
				})
			}

			handlePostStreamSideEffects().catch(() => undefined)
		}

		previousStatusRef.current = status
	}, [
		status,
		onMessageComplete,
		serverChatId,
		uiMessages,
		generateChatTitleIfNeeded,
	])

	const compactContext = useCallback(
		async (
			options: CompactContextOptions = {}
		): Promise<CompactContextResult | null> => {
			const currentConfig = configRef.current
			if (!serverChatId.trim()) return null
			if (status === 'submitted' || status === 'streaming') return null

			setIsCompacting(true)
			try {
				const response = await fetch(`${getServerUrl()}/api/ai/compact`, {
					method: 'POST',
					credentials: 'include',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						chatId: serverChatId,
						provider: currentConfig.provider,
						apiKey: currentConfig.apiKey,
						baseUrl: currentConfig.baseUrl?.trim() || undefined,
						model: currentConfig.model.trim() || undefined,
						messages: uiMessages,
						keepRecentCount: options.keepRecentCount,
						tokensToCompact: options.tokensToCompact,
					}),
				})

				if (!response.ok) {
					throw new Error(`Failed to compact context: ${response.status}`)
				}

				const data = (await response.json()) as CompactContextResult
				setUIMessages(data.messages)
				setServerChatId(data.chatId)

				if (onMessageComplete && data.chatId) {
					await Promise.resolve(onMessageComplete(data.chatId))
				}

				return data
			} finally {
				setIsCompacting(false)
			}
		},
		[onMessageComplete, serverChatId, setUIMessages, status, uiMessages]
	)

	return {
		// State
		messages,
		isStreaming,
		isLoading,
		error,
		chatId: serverChatId,
		isCompacting,

		// Actions
		sendMessage,
		clearMessages,
		resetChat,
		loadMessages,
		restoreFromCache,
		compactContext,
		stop,

		// Tool approval
		addToolApprovalResponse,

		// Regenerate
		regenerate,
	}
}

function hasApprovalResponse(messages: UIMessage[]): boolean {
	const lastMessage = messages.at(-1)
	if (!lastMessage || lastMessage.role !== 'assistant') return false
	return lastMessage.parts.some(
		(part) => 'state' in part && part.state === 'approval-responded'
	)
}

function isCompactInfo(value: unknown): value is CompactInfo {
	if (!value || typeof value !== 'object') return false
	const info = value as Record<string, unknown>
	return (
		typeof info.compactedAt === 'string' &&
		typeof info.originalMessageCount === 'number' &&
		typeof info.compactedMessageCount === 'number' &&
		typeof info.keptMessageCount === 'number' &&
		typeof info.summaryTokens === 'number'
	)
}

function getLastAssistantMessageId(messages: UIMessage[]): string | undefined {
	return messages.findLast((m) => m.role === 'assistant')?.id
}

function getTextFromParts(parts: UIMessage['parts']): string {
	return (parts ?? [])
		.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
		.map((p) => p.text)
		.join('')
}

function getReasoningFromParts(parts: UIMessage['parts']): string | undefined {
	const fragments: string[] = []
	for (const part of parts ?? []) {
		if (part.type !== 'reasoning') continue
		if ('text' in part && typeof part.text === 'string') {
			fragments.push(part.text)
		} else if ('reasoning' in part && typeof part.reasoning === 'string') {
			fragments.push(part.reasoning)
		}
	}
	return fragments.length > 0 ? fragments.join('\n') : undefined
}
