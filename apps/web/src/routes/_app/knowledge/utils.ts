import type { ApiProviderId, ChatMessage } from './types'

// ============================================================================
// Provider Mapping Utilities
// ============================================================================

const API_SUPPORTED_PROVIDERS: ApiProviderId[] = [
	'openai',
	'deepseek',
	'gemini',
	'claude',
	'qwen',
]

/** Map new model-list provider IDs to old API provider IDs */
const PROVIDER_ID_MAPPING: Record<string, ApiProviderId> = {
	openai: 'openai',
	anthropic: 'claude',
	google: 'gemini',
	deepseek: 'deepseek',
	qwen: 'qwen',
	xai: 'deepseek', // xAI maps to deepseek for now (both use similar API)
}

export function isApiSupportedProvider(id: string): id is ApiProviderId {
	const mappedId = PROVIDER_ID_MAPPING[id] || id
	return API_SUPPORTED_PROVIDERS.includes(mappedId as ApiProviderId)
}

export function mapProviderIdToApi(id: string): ApiProviderId {
	const mappedId = PROVIDER_ID_MAPPING[id] || id
	if (!API_SUPPORTED_PROVIDERS.includes(mappedId as ApiProviderId)) {
		throw new Error(`Provider "${id}" is not supported by the API`)
	}
	return mappedId as ApiProviderId
}

// ============================================================================
// Token Estimation Utilities
// ============================================================================

/** Approximate characters per token (conservative estimate) */
const CHARS_PER_TOKEN = 4

/** Estimate token count from text */
export function estimateTokenCount(text: string): number {
	return Math.ceil(text.length / CHARS_PER_TOKEN)
}

/** Calculate total estimated tokens for all messages */
export function calculateTotalTokens(messages: ChatMessage[]): number {
	return messages.reduce((total, msg) => {
		const contentTokens = estimateTokenCount(msg.content)
		const thinkingTokens = msg.thinking ? estimateTokenCount(msg.thinking) : 0
		return total + contentTokens + thinkingTokens
	}, 0)
}

// ============================================================================
// Formatting Utilities
// ============================================================================

/** Format token count for display */
export function formatTokenCount(count?: number): string | null {
	if (!count) return null
	if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
	if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
	return String(count)
}

/** Format cost for display */
export function formatCost(cost?: number): string | null {
	if (!cost) return null
	if (cost < 0.0001) return '<$0.0001'
	if (cost < 0.01) return `$${cost.toFixed(4)}`
	return `$${cost.toFixed(3)}`
}

// ============================================================================
// Constants
// ============================================================================

/** Context usage percentage thresholds */
export const CONTEXT_WARNING_THRESHOLD = 80
export const CONTEXT_CRITICAL_THRESHOLD = 95
