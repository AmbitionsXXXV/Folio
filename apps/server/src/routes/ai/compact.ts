import { createVercelAiChatModel } from '@folionote/ai/vercel-ai'
import {
	generateText as aiGenerateText,
	createIdGenerator,
	type UIMessage,
} from 'ai'
import { loadChatMessages, saveChat } from '../../services/ai-chat-store'
import { calculateCostFromUsage } from '../../utils/cost'
import type {
	CompactExecutionInput,
	CompactInfo,
	CompactRouteResponse,
	UsageMetadata,
} from './types'

const DEFAULT_KEEP_RECENT_COUNT = 4
const MIN_KEEP_RECENT_COUNT = 2
const MAX_KEEP_RECENT_COUNT = 12
const ESTIMATED_CHARS_PER_TOKEN = 4
const COMPACT_SUMMARY_FALLBACK = 'Conversation context compacted.'

export const COMPACT_SUMMARY_SYSTEM_PROMPT = [
	'You are compacting a long conversation for future turns.',
	'Summarize key user goals, constraints, facts, decisions, open questions, and pending tasks.',
	'Preserve concrete values (numbers, dates, names, code identifiers, URLs).',
	'Do not invent details and do not include unnecessary prose.',
	'Return concise markdown bullet points.',
].join('\n')

export function sanitizeKeepRecentCount(value: number | undefined): number {
	if (typeof value !== 'number' || Number.isNaN(value)) {
		return DEFAULT_KEEP_RECENT_COUNT
	}
	return Math.min(
		MAX_KEEP_RECENT_COUNT,
		Math.max(MIN_KEEP_RECENT_COUNT, Math.floor(value))
	)
}

export function extractMessageText(message: UIMessage): string {
	const parts = message.parts ?? []
	const fragments: string[] = []
	for (const part of parts) {
		if (part.type === 'text' && typeof part.text === 'string') {
			fragments.push(part.text)
		}
		if (
			part.type === 'reasoning' &&
			'text' in part &&
			typeof part.text === 'string'
		) {
			fragments.push(`[Reasoning] ${part.text}`)
		}
	}
	return fragments.join('\n').trim()
}

export function estimateMessageTokens(message: UIMessage): number {
	return Math.ceil(extractMessageText(message).length / ESTIMATED_CHARS_PER_TOKEN)
}

export function resolveCompactionSplitIndex(
	messages: UIMessage[],
	keepRecentCount: number,
	tokensToCompact: number | undefined
): number {
	const minimumSplitIndex = Math.max(0, messages.length - keepRecentCount)
	if (!(tokensToCompact && tokensToCompact > 0)) {
		return minimumSplitIndex
	}

	let compactedTokens = 0
	let splitIndex = 0
	while (splitIndex < minimumSplitIndex && compactedTokens < tokensToCompact) {
		compactedTokens += estimateMessageTokens(messages[splitIndex] as UIMessage)
		splitIndex += 1
	}

	return Math.max(splitIndex, Math.min(1, minimumSplitIndex))
}

export function buildCompactTranscript(messages: UIMessage[]): string {
	return messages
		.map((message, index) => {
			const text = extractMessageText(message)
			if (!text) return null
			return `#${index + 1} [${message.role}]\n${text}`
		})
		.filter((item): item is string => Boolean(item))
		.join('\n\n')
}

const USAGE_KEYS = [
	'inputTokens',
	'outputTokens',
	'totalTokens',
	'reasoningTokens',
	'cachedInputTokens',
] as const

export function normalizeUsageMetadata(value: unknown): UsageMetadata | undefined {
	if (!value || typeof value !== 'object') return undefined
	const raw = value as Record<string, unknown>
	const result: Record<string, number> = {}
	let hasValue = false
	for (const key of USAGE_KEYS) {
		if (typeof raw[key] === 'number') {
			result[key] = raw[key]
			hasValue = true
		}
	}
	return hasValue ? (result as UsageMetadata) : undefined
}

export function createNoCompactResponse(
	chatId: string,
	messages: UIMessage[]
): CompactRouteResponse {
	return {
		chatId,
		messages,
		summary: '',
		compactedCount: 0,
		keptCount: messages.length,
	}
}

export async function executeContextCompaction(
	input: CompactExecutionInput
): Promise<CompactRouteResponse> {
	const {
		userId,
		chatId,
		provider,
		model,
		credential,
		providedMessages,
		keepRecentCount,
		tokensToCompact,
	} = input

	const currentMessages =
		providedMessages && providedMessages.length > 0
			? providedMessages
			: await loadChatMessages(userId, chatId)
	const effectiveKeepRecentCount = sanitizeKeepRecentCount(keepRecentCount)
	if (currentMessages.length <= effectiveKeepRecentCount) {
		return createNoCompactResponse(chatId, currentMessages)
	}

	const splitIndex = resolveCompactionSplitIndex(
		currentMessages,
		effectiveKeepRecentCount,
		tokensToCompact
	)
	if (splitIndex <= 0 || splitIndex >= currentMessages.length) {
		return createNoCompactResponse(chatId, currentMessages)
	}

	const oldMessages = currentMessages.slice(0, splitIndex)
	const recentMessages = currentMessages.slice(splitIndex)
	const transcript = buildCompactTranscript(oldMessages)
	if (!transcript) {
		return createNoCompactResponse(chatId, currentMessages)
	}

	const compactModel = createVercelAiChatModel(credential, { model })
	const compactResult = await aiGenerateText({
		model: compactModel,
		system: COMPACT_SUMMARY_SYSTEM_PROMPT,
		prompt: [
			'Conversation transcript (older turns to compact):',
			transcript,
			'',
			'Return only the compact summary.',
		].join('\n'),
	})

	const summaryText = compactResult.text.trim() || COMPACT_SUMMARY_FALLBACK
	const compactInfo: CompactInfo = {
		compactedAt: new Date().toISOString(),
		originalMessageCount: currentMessages.length,
		compactedMessageCount: oldMessages.length,
		keptMessageCount: recentMessages.length,
		summaryTokens: Math.ceil(summaryText.length / ESTIMATED_CHARS_PER_TOKEN),
	}
	const summaryUsage = normalizeUsageMetadata(compactResult.usage)
	const summaryUsageWithCost =
		summaryUsage && compactModel.modelId
			? {
					...summaryUsage,
					costUSD:
						summaryUsage.costUSD ??
						calculateCostFromUsage(provider, compactModel.modelId, summaryUsage),
				}
			: summaryUsage

	const generateSummaryMessageId = createIdGenerator({
		prefix: 'msg',
		size: 16,
	})
	const summaryMessage: UIMessage = {
		id: generateSummaryMessageId(),
		role: 'assistant',
		parts: [{ type: 'text', text: summaryText }],
		metadata: {
			compactInfo,
			usage: summaryUsageWithCost,
		},
	}
	const compactedMessages = [summaryMessage, ...recentMessages]

	await saveChat({
		userId,
		chatId,
		messages: compactedMessages,
	})

	return {
		chatId,
		messages: compactedMessages,
		summary: summaryText,
		compactedCount: oldMessages.length,
		keptCount: recentMessages.length,
		compactInfo,
	}
}
