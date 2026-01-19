import { AI_PROVIDER_IDS } from '@folionote/constants'
import type { ApiProviderId, ChatMessage, CitationSource } from './types'

// ============================================================================
// Provider Mapping Utilities
// ============================================================================

/**
 * API supported providers derived from canonical list.
 */
const API_SUPPORTED_PROVIDERS: readonly string[] = AI_PROVIDER_IDS

/**
 * Map model-list provider IDs to API provider IDs.
 * model-list uses: openai, deepseek, google, anthropic, qwen, xai, moonshot
 * API uses: openai, deepseek, gemini, claude, qwen, moonshot
 */
const PROVIDER_ID_MAPPING: Record<string, ApiProviderId> = {
	openai: 'openai',
	anthropic: 'claude',
	google: 'gemini',
	deepseek: 'deepseek',
	qwen: 'qwen',
	xai: 'deepseek', // xAI maps to deepseek for now (both use similar API)
	moonshot: 'moonshot',
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
// Citation Parsing Utilities
// ============================================================================

/** Regex pattern to match citation markers like [1], [2], etc. */
const CITATION_MARKER_REGEX = /\[(\d+)\]/g

/**
 * Parse citation markers from content and return structured data
 * This extracts [1], [2], etc. markers from text
 */
export function parseCitationMarkers(content: string): number[] {
	const markers: number[] = []
	const matches = content.matchAll(CITATION_MARKER_REGEX)

	for (const match of matches) {
		const numStr = match[1]
		if (numStr) {
			const num = Number.parseInt(numStr, 10)
			if (!markers.includes(num)) {
				markers.push(num)
			}
		}
	}

	return markers.sort((a, b) => a - b)
}

/**
 * Get citation source by index (1-based)
 */
export function getCitationByIndex(
	citations: CitationSource[],
	index: number
): CitationSource | undefined {
	return citations[index - 1]
}

/**
 * Split content into parts with citation markers
 * Returns an array of { type: 'text' | 'citation', value: string | number }
 */
export type ContentPart =
	| { type: 'text'; value: string }
	| { type: 'citation'; value: number }

export function parseContentWithCitations(content: string): ContentPart[] {
	const parts: ContentPart[] = []
	let lastIndex = 0
	const matches = [...content.matchAll(CITATION_MARKER_REGEX)]

	for (const match of matches) {
		const matchIndex = match.index
		const numStr = match[1]

		if (matchIndex === undefined || !numStr) continue

		// Add text before the citation
		if (matchIndex > lastIndex) {
			parts.push({
				type: 'text',
				value: content.slice(lastIndex, matchIndex),
			})
		}

		// Add the citation marker
		parts.push({
			type: 'citation',
			value: Number.parseInt(numStr, 10),
		})

		lastIndex = matchIndex + match[0].length
	}

	// Add remaining text
	if (lastIndex < content.length) {
		parts.push({
			type: 'text',
			value: content.slice(lastIndex),
		})
	}

	return parts
}

// ============================================================================
// Chat Persistence Utilities (Lightweight Local Cache)
// ============================================================================

/** localStorage key for last opened chat ID */
const LAST_CHAT_ID_STORAGE_KEY = 'folionote:knowledge:lastChatId'

/** localStorage key for chat messages (legacy, kept for migration) */
const CHAT_MESSAGES_STORAGE_KEY_PREFIX = 'folionote:knowledge:messages:'

/** Serialized message format for localStorage */
type SerializedChatMessage = Omit<ChatMessage, 'timestamp'> & {
	timestamp: string
}

/**
 * Generate a new chat ID using crypto.randomUUID
 */
export function generateChatId(): string {
	return crypto.randomUUID()
}

/**
 * Get the last opened chat ID from localStorage
 */
export function getLastChatId(): string | null {
	if (typeof window === 'undefined') return null
	return localStorage.getItem(LAST_CHAT_ID_STORAGE_KEY)
}

/**
 * Set the last opened chat ID in localStorage
 */
export function setLastChatId(chatId: string): void {
	if (typeof window === 'undefined') return
	localStorage.setItem(LAST_CHAT_ID_STORAGE_KEY, chatId)
}

/**
 * Clear the last opened chat ID from localStorage
 */
export function clearLastChatId(): void {
	if (typeof window === 'undefined') return
	localStorage.removeItem(LAST_CHAT_ID_STORAGE_KEY)
}

/**
 * @deprecated Use getLastChatId instead. Kept for backward compatibility.
 */
export function getOrCreateChatId(): string {
	if (typeof window === 'undefined') return generateChatId()

	const stored = localStorage.getItem(LAST_CHAT_ID_STORAGE_KEY)
	if (stored) return stored

	const newId = generateChatId()
	localStorage.setItem(LAST_CHAT_ID_STORAGE_KEY, newId)
	return newId
}

/**
 * @deprecated Use setLastChatId instead. Kept for backward compatibility.
 */
export function setChatId(chatId: string): void {
	setLastChatId(chatId)
}

/**
 * @deprecated Use clearLastChatId instead. Kept for backward compatibility.
 */
export function clearChatId(): void {
	clearLastChatId()
}

/**
 * Serialize a ChatMessage for storage (converts Date to ISO string)
 */
export function serializeMessage(message: ChatMessage): SerializedChatMessage {
	return {
		...message,
		timestamp: message.timestamp.toISOString(),
	}
}

/**
 * Deserialize a ChatMessage from storage (converts ISO string to Date)
 */
export function deserializeMessage(message: SerializedChatMessage): ChatMessage {
	return {
		...message,
		timestamp: new Date(message.timestamp),
	}
}

/**
 * Serialize an array of ChatMessages for storage
 */
export function serializeMessages(messages: ChatMessage[]): SerializedChatMessage[] {
	return messages.map(serializeMessage)
}

/**
 * Deserialize an array of ChatMessages from storage
 */
export function deserializeMessages(
	messages: SerializedChatMessage[]
): ChatMessage[] {
	return messages.map(deserializeMessage)
}

/**
 * @deprecated Messages are now stored server-side. This is kept for migration only.
 */
export function saveChatMessages(chatId: string, messages: ChatMessage[]): void {
	if (typeof window === 'undefined') return

	const key = `${CHAT_MESSAGES_STORAGE_KEY_PREFIX}${chatId}`
	const serialized = serializeMessages(messages)
	localStorage.setItem(key, JSON.stringify(serialized))
}

/**
 * @deprecated Messages are now stored server-side. This is kept for migration only.
 */
export function loadChatMessages(chatId: string): ChatMessage[] {
	if (typeof window === 'undefined') return []

	const key = `${CHAT_MESSAGES_STORAGE_KEY_PREFIX}${chatId}`
	const stored = localStorage.getItem(key)
	if (!stored) return []

	try {
		const parsed = JSON.parse(stored) as SerializedChatMessage[]
		return deserializeMessages(parsed)
	} catch {
		return []
	}
}

/**
 * @deprecated Messages are now stored server-side. This is kept for migration only.
 */
export function clearChatMessages(chatId: string): void {
	if (typeof window === 'undefined') return
	const key = `${CHAT_MESSAGES_STORAGE_KEY_PREFIX}${chatId}`
	localStorage.removeItem(key)
}
