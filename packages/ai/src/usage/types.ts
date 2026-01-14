/**
 * AI Usage / Token tracking types
 *
 * Based on ai_runs.usage JSONB structure from docs/ai-mvp-byok-v0.md
 */

import type { PromptVersion } from '../prompts/versions'
import type { AiProvider } from '../providers/types'

/**
 * Token usage breakdown
 */
export interface TokenUsage {
	/** Prompt tokens (input) */
	prompt?: number
	/** Completion tokens (output) */
	completion?: number
	/** Total tokens */
	total?: number
	/** Embedding tokens (if applicable) */
	embedding?: number
}

/**
 * Cost estimation
 */
export interface CostEstimate {
	/** Currency code */
	currency: string
	/** Estimated cost */
	estimated?: number
	/** Pricing reference version */
	pricingRef?: string
}

/**
 * Context usage statistics
 */
export interface ContextUsage {
	/** Input text character count */
	inputTextChars?: number
	/** Estimated input text tokens */
	inputTextTokensEstimated?: number
	/** RAG top-K setting */
	ragTopK?: number
	/** Retrieved chunk IDs */
	ragRetrievedChunkIds?: string[]
	/** RAG context character count */
	ragContextChars?: number
	/** Estimated RAG context tokens */
	ragContextTokensEstimated?: number
	/** Conversation context (for future chat feature) */
	conversation?: ConversationContext
}

/**
 * Conversation context (reserved for future chat feature)
 */
export interface ConversationContext {
	conversationId?: string
	messageIdsIncluded?: string[]
	windowStrategy?: 'last_n' | 'token_budget'
	windowMessagesCount?: number
	windowTokensEstimated?: number
}

/**
 * Complete usage record (stored in ai_runs.usage)
 */
export interface AiUsage {
	tokens?: TokenUsage
	cost?: CostEstimate
	context?: ContextUsage
}

/**
 * AI run status
 */
export type AiRunStatus = 'pending' | 'success' | 'error' | 'timeout'

/**
 * AI run type
 */
export type AiRunType = 'summarize' | 'review_suggest' | 'embedding' | 'chat'

/**
 * AI run record (maps to ai_runs table)
 */
export interface AiRun {
	id: string
	userId: string
	type: AiRunType
	provider: AiProvider
	model: string
	promptVersion: PromptVersion
	/** References to input data (e.g., entryId, chunkIds) */
	inputRefs?: Record<string, unknown>
	/** Latency in milliseconds */
	latencyMs?: number
	status: AiRunStatus
	error?: string
	usage?: AiUsage
	createdAt: Date
}

/**
 * Daily usage aggregation (optional, for user dashboard)
 */
export interface DailyUsage {
	userId: string
	date: string // YYYY-MM-DD
	provider: AiProvider
	runCount: number
	totalTokens: number
	estimatedCost?: number
}
