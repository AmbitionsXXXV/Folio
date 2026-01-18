/**
 * AI Provider IDs - Single source of truth
 *
 * All provider ID types and lists should derive from this file.
 * When adding a new provider, only modify this file.
 */

/**
 * Canonical list of supported AI provider IDs.
 * Order determines display order in UI components.
 */
export const AI_PROVIDER_IDS = [
	'openai',
	'deepseek',
	'gemini',
	'claude',
	'qwen',
	'moonshot',
] as const

/**
 * Type for AI provider IDs (derived from the canonical list)
 */
export type AiProviderId = (typeof AI_PROVIDER_IDS)[number]
