import type { AiProvider, DecryptedCredential } from "@folionote/ai"
import type { UIMessage } from "ai"

/**
 * Request body for AI stream endpoint (AI SDK v6 aligned)
 *
 * Two modes supported:
 * 1. Full messages mode: Send all messages, server persists on completion
 * 2. Last message mode: Send only the last message + chatId, server loads history
 */
export interface AiStreamRequestBody {
  /** Chat session ID for persistence. If omitted for new chat, server generates one. */
  chatId?: string
  /** Provider ID */
  provider: string
  /** API key (BYOK) */
  apiKey: string
  /** Optional base URL override */
  baseUrl?: string
  /** Optional model override */
  model?: string
  /**
   * The user's prompt/question.
   * Used for RAG query even when messages are provided.
   * May be empty during tool-calling follow-ups or regeneration.
   */
  prompt?: string
  /**
   * Conversation history as UIMessage array.
   * For bandwidth optimization, can send only the last message
   * when chatId is provided (server loads history).
   */
  messages?: UIMessage[]
  /** Optional: IDs of notes to attach as context */
  noteEntryIds?: string[]
  /** Optional: Number of notes to retrieve via RAG */
  ragTopK?: number
  /** Optional: Enable extended thinking/reasoning */
  enableReasoning?: boolean
  /** Optional: Enable web search tool */
  enableWebSearch?: boolean
  /** Optional: Enable image generation tool */
  enableImageGeneration?: boolean
}

export interface AiCompactRequestBody {
  chatId: string
  provider: string
  apiKey: string
  baseUrl?: string
  model?: string
  messages?: UIMessage[]
  keepRecentCount?: number
  tokensToCompact?: number
}

export interface CaptionImageRequestBody {
  attachmentId: string
  provider?: string
  apiKey?: string
  baseUrl?: string
  model?: string
  force?: boolean
}

export interface InternalCaptionImageRequestBody {
  userId: string
  attachmentId: string
  model?: string
  force?: boolean
}

export interface UsageMetadata {
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  reasoningTokens?: number
  cachedInputTokens?: number
  costUSD?: number
}

export interface CompactInfo {
  compactedAt: string
  originalMessageCount: number
  compactedMessageCount: number
  keptMessageCount: number
  summaryTokens: number
}

export interface CompactRouteResponse {
  chatId: string
  messages: UIMessage[]
  summary: string
  compactedCount: number
  keptCount: number
  compactInfo?: CompactInfo
}

export interface CompactExecutionInput {
  userId: string
  chatId: string
  provider: AiProvider
  model?: string
  credential: DecryptedCredential
  providedMessages?: UIMessage[]
  keepRecentCount?: number
  tokensToCompact?: number
}

export interface AuthenticatedUser {
  userId: string
  locale: string
}
