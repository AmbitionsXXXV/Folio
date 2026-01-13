/**
 * Shared Zod schemas for AI module
 *
 * These schemas are used for:
 * - API input/output validation
 * - Type inference
 * - Runtime validation
 */

import { z } from 'zod'
import { AI_PROVIDERS } from './providers/types'

/**
 * Provider selection schema
 */
export const ProviderSchema = z.enum(AI_PROVIDERS)

/**
 * AI run status
 */
export const AiRunStatusSchema = z.enum(['pending', 'success', 'error', 'timeout'])

/**
 * AI run type
 */
export const AiRunTypeSchema = z.enum([
	'summarize',
	'review_suggest',
	'embedding',
	'chat',
])

/**
 * Token usage schema (matches ai_runs.usage JSONB structure)
 */
export const TokenUsageSchema = z.object({
	tokens: z
		.object({
			prompt: z.number().optional(),
			completion: z.number().optional(),
			total: z.number().optional(),
			embedding: z.number().optional(),
		})
		.optional(),
	cost: z
		.object({
			currency: z.string().default('CNY'),
			estimated: z.number().optional(),
			pricingRef: z.string().optional(),
		})
		.optional(),
	context: z
		.object({
			inputTextChars: z.number().optional(),
			inputTextTokensEstimated: z.number().optional(),
			ragTopK: z.number().optional(),
			ragRetrievedChunkIds: z.array(z.string()).optional(),
			ragContextChars: z.number().optional(),
			ragContextTokensEstimated: z.number().optional(),
			conversation: z
				.object({
					conversationId: z.string().optional(),
					messageIdsIncluded: z.array(z.string()).optional(),
					windowStrategy: z.enum(['last_n', 'token_budget']).optional(),
					windowMessagesCount: z.number().optional(),
					windowTokensEstimated: z.number().optional(),
				})
				.optional(),
		})
		.optional(),
})
