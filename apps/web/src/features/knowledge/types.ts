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

/** API-compatible provider IDs (subset that the backend supports) */
export type ApiProviderId = 'openai' | 'deepseek' | 'gemini' | 'claude' | 'qwen'
