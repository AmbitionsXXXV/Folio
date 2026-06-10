/**
 * AI Usage / Token tracking types
 *
 * Based on ai_runs.usage JSONB structure from docs/ai-mvp-byok-v0.md
 */

import type { PromptVersion } from "../prompts/versions"
import type { AiProvider } from "../providers/types"

/**
 * Token usage breakdown
 */
export interface TokenUsage {
  /** Completion tokens (output) */
  completion?: number
  /** Embedding tokens (if applicable) */
  embedding?: number
  /** Prompt tokens (input) */
  prompt?: number
  /** Total tokens */
  total?: number
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
  /** Conversation context (for future chat feature) */
  conversation?: ConversationContext
  /** Input text character count */
  inputTextChars?: number
  /** Estimated input text tokens */
  inputTextTokensEstimated?: number
  /** RAG context character count */
  ragContextChars?: number
  /** Estimated RAG context tokens */
  ragContextTokensEstimated?: number
  /** Retrieved chunk IDs */
  ragRetrievedChunkIds?: string[]
  /** RAG top-K setting */
  ragTopK?: number
}

/**
 * Conversation context (reserved for future chat feature)
 */
export interface ConversationContext {
  conversationId?: string
  messageIdsIncluded?: string[]
  windowMessagesCount?: number
  windowStrategy?: "last_n" | "token_budget"
  windowTokensEstimated?: number
}

/**
 * Complete usage record (stored in ai_runs.usage)
 */
export interface AiUsage {
  context?: ContextUsage
  cost?: CostEstimate
  tokens?: TokenUsage
}

/**
 * AI run status
 */
export type AiRunStatus = "pending" | "success" | "error" | "timeout"

/**
 * AI run type
 */
export type AiRunType = "summarize" | "review_suggest" | "embedding" | "chat"

/**
 * AI run record (maps to ai_runs table)
 */
export interface AiRun {
  createdAt: Date
  error?: string
  id: string
  /** References to input data (e.g., entryId, chunkIds) */
  inputRefs?: Record<string, unknown>
  /** Latency in milliseconds */
  latencyMs?: number
  model: string
  promptVersion: PromptVersion
  provider: AiProvider
  status: AiRunStatus
  type: AiRunType
  usage?: AiUsage
  userId: string
}

/**
 * Daily usage aggregation (optional, for user dashboard)
 */
export interface DailyUsage {
  date: string // YYYY-MM-DD
  estimatedCost?: number
  provider: AiProvider
  runCount: number
  totalTokens: number
  userId: string
}
