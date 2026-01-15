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
	/** Token usage from the AI provider */
	usage?: {
		inputTokens?: number
		outputTokens?: number
		totalTokens?: number
		reasoningTokens?: number
		costUSD?: number
	}
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
