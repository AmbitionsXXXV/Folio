/**
 * Prompt versions and constants
 *
 * Prompt versioning allows:
 * - Cache invalidation when prompts change
 * - A/B testing different prompt versions
 * - Tracking which prompt version produced which output
 */

/**
 * Current prompt versions
 *
 * Update these when prompt content changes significantly
 */
export const PROMPT_VERSIONS = {
	/** AI Summarize Entry prompt version */
	summarize: 'summarize_v0',
	/** AI Review Suggest prompt version */
	reviewSuggest: 'review_suggest_v0',
} as const

export type PromptType = keyof typeof PROMPT_VERSIONS
export type PromptVersion = (typeof PROMPT_VERSIONS)[PromptType]

/**
 * Get current prompt version for a type
 */
export function getPromptVersion(type: PromptType): PromptVersion {
	return PROMPT_VERSIONS[type]
}

/**
 * Supported locales for prompts
 */
export const SUPPORTED_LOCALES = ['en-US', 'zh-CN', 'ja-JP'] as const

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number]

/**
 * Check if a locale is supported
 */
export function isSupportedLocale(locale: string): locale is SupportedLocale {
	return SUPPORTED_LOCALES.includes(locale as SupportedLocale)
}
