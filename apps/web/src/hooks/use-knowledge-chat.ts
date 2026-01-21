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
import { DefaultChatTransport } from 'ai'
import { useCallback, useMemo, useRef, useState } from 'react'
import { getServerUrl } from '@/utils/api-environment'

// =============================================================================
// Types
// =============================================================================

export type KnowledgeChatMessage = {
	id: string
	role: 'user' | 'assistant'
	content: string
	timestamp: Date
	/** Raw UIMessage parts for tool rendering */
	parts?: UIMessage['parts']
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
		costUSD?: number
	}
	/** Mention titles for rendering @mentions in user messages */
	mentionTitles?: string[]
}

export type KnowledgeChatConfig = {
	/** Chat session ID */
	chatId: string
	/** Initial messages to load */
	initialMessages?: KnowledgeChatMessage[]
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
}

export type SendMessageOptions = {
	/** The message text to send */
	text: string
	/** Mention titles for display */
	mentionTitles?: string[]
	/** Note IDs to attach */
	noteEntryIds?: string[]
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
}

/**
 * Convert UIMessage to KnowledgeChatMessage for UI rendering
 */
function uiMessageToKnowledgeMessage(msg: UIMessage): KnowledgeChatMessage {
	const parts = msg.parts ?? []

	// Extract text content from parts
	const textPart = parts.find((p) => p.type === 'text')
	const content = textPart && 'text' in textPart ? textPart.text : ''

	// Extract reasoning/thinking content if present
	const reasoningPart = msg.parts?.find((p) => p.type === 'reasoning')
	const thinking =
		reasoningPart && 'reasoning' in reasoningPart
			? (reasoningPart as { type: 'reasoning'; reasoning: string }).reasoning
			: undefined

	// Extract usage from metadata (sent via messageMetadata on server)
	const metadata = msg.metadata as MessageMetadata | undefined
	const usage = metadata?.usage

	return {
		id: msg.id,
		role: msg.role as 'user' | 'assistant',
		content,
		timestamp: new Date(),
		parts,
		thinking,
		usage,
	}
}

/**
 * Convert KnowledgeChatMessage to UIMessage for the API
 */
function knowledgeMessageToUIMessage(msg: KnowledgeChatMessage): UIMessage {
	const fallbackParts: UIMessage['parts'] = [
		{ type: 'text' as const, text: msg.content },
	]
	const parts = msg.parts && msg.parts.length > 0 ? msg.parts : fallbackParts

	return {
		id: msg.id,
		role: msg.role,
		parts,
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
	} = config

	// Use refs for values that change but shouldn't trigger transport recreation
	const configRef = useRef({
		provider,
		apiKey,
		baseUrl,
		model,
		enableReasoning,
	})
	configRef.current = { provider, apiKey, baseUrl, model, enableReasoning }

	// Track current request's note IDs (can be overridden per-message)
	const currentNoteEntryIdsRef = useRef<string[]>(defaultNoteEntryIds)

	// Track mention titles by message content (since we don't have ID until after send)
	const mentionTitlesMapRef = useRef<Map<string, string[]>>(new Map())

	// State for last chatId returned from server
	const [serverChatId, setServerChatId] = useState<string>(chatId)

	// Convert initial messages to UIMessage format
	const uiInitialMessages = useMemo(
		() => initialMessages.map(knowledgeMessageToUIMessage),
		[initialMessages]
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
	} = useChat({
		id: chatId,
		messages: uiInitialMessages,
		transport,
	})

	// Convert UIMessages to KnowledgeChatMessages for UI
	const messages = useMemo<KnowledgeChatMessage[]>(() => {
		return uiMessages.map((msg) => {
			const base = uiMessageToKnowledgeMessage(msg)

			// For user messages, look up mentionTitles by content
			if (msg.role === 'user') {
				const mentionTitles = mentionTitlesMapRef.current.get(base.content)
				if (mentionTitles) {
					return { ...base, mentionTitles }
				}
			}

			return base
		})
	}, [uiMessages])

	// Derived states
	const isStreaming = status === 'streaming'
	const isLoading = status === 'submitted' || status === 'streaming'

	// Send a message with optional note attachments
	const sendMessage = useCallback(
		(options: SendMessageOptions) => {
			const { text, mentionTitles, noteEntryIds = [] } = options

			// Store mention titles by message text for later lookup
			if (mentionTitles && mentionTitles.length > 0) {
				mentionTitlesMapRef.current.set(text, mentionTitles)
			}

			// Update note IDs for this request
			currentNoteEntryIdsRef.current =
				noteEntryIds.length > 0 ? noteEntryIds : defaultNoteEntryIds

			// Send via useChat
			aiSendMessage({ text })
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
			clearMessages()
		},
		[clearMessages]
	)

	// Load messages from server for a given chat
	const loadMessages = useCallback(
		async (targetChatId: string) => {
			try {
				const response = await fetch(
					`${getServerUrl()}/api/ai/chat/${targetChatId}`,
					{ credentials: 'include' }
				)

				if (!response.ok) {
					if (response.status === 404) {
						// Chat not found, clear messages
						clearMessages()
						return
					}
					throw new Error(`Failed to load chat: ${response.status}`)
				}

				const data = (await response.json()) as {
					chatId: string
					messages: UIMessage[]
				}

				// Update messages
				setUIMessages(data.messages)
				setServerChatId(data.chatId)
			} catch (err) {
				console.error('Failed to load chat messages:', err)
				throw err
			}
		},
		[clearMessages, setUIMessages]
	)

	// Switch to a different chat
	const switchChat = useCallback(
		async (newChatId: string) => {
			if (newChatId === serverChatId) return

			setServerChatId(newChatId)
			await loadMessages(newChatId)
		},
		[serverChatId, loadMessages]
	)

	return {
		// State
		messages,
		isStreaming,
		isLoading,
		error,
		chatId: serverChatId,

		// Actions
		sendMessage,
		clearMessages,
		resetChat,
		loadMessages,
		switchChat,
		stop,
	}
}
