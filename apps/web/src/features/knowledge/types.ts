/** Citation source for AI-generated content */
export type CitationSource = {
	/** Unique identifier for the citation */
	id: string
	/** Source URL */
	url: string
	/** Source title */
	title?: string
	/** Source description or snippet */
	description?: string
	/** Relevant quote from the source */
	quote?: string
}

/** Chat message type for the knowledge page */
export type ChatMessage = {
	id: string
	role: 'user' | 'assistant'
	content: string
	timestamp: Date
	/** Whether this message is currently being streamed */
	isStreaming?: boolean
	/** Thinking/reasoning content (for models that support extended thinking) */
	thinking?: string
	/** Citations/sources referenced in the message */
	citations?: CitationSource[]
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

/** Context usage information */
export type ContextUsage = {
	used: number
	total: number
	percent: number
	isWarning: boolean
	isExceeded: boolean
}

/**
 * API-compatible provider IDs (subset that the backend supports).
 * Re-exported from @folionote/constants for convenience.
 */
export type { AiProviderId as ApiProviderId } from '@folionote/constants'

// =============================================================================
// Chat Session Types
// =============================================================================

/** Chat session summary for the chat list (without full messages) */
export type ChatSessionSummary = {
	/** Chat ID */
	chatId: string
	/** User ID (owner) */
	userId: string
	/** Session title */
	title: string
	/** Message count */
	messageCount: number
	/** Last message preview (truncated) */
	lastMessagePreview: string
	/** Last message timestamp (ISO string from server) */
	lastMessageAt: string | null
	/** Last opened timestamp (ISO string from server) */
	lastOpenedAt: string
	/** Last update timestamp (ISO string from server) */
	updatedAt: string
	/** Creation timestamp (ISO string from server) */
	createdAt: string
}

/** Full chat session with messages */
export type ChatSessionFull = ChatSessionSummary & {
	/** Full message array (UIMessage[] format stored as JSON) */
	messages: unknown[]
}
