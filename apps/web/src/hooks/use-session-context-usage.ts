import { useMemo } from 'react'
import {
	contextHealth,
	getContextWindow,
	getTokenCosts,
	shouldCompact as tokenlensShouldCompact,
	tokensToCompact as tokenlensTokensToCompact,
} from 'tokenlens'
import {
	calculateTotalTokens,
	getTokenlensModelIdCandidates,
} from '@/features/knowledge/utils'
import type { KnowledgeChatMessage } from './use-knowledge-chat'

const FALLBACK_WARN_THRESHOLD = 75
const FALLBACK_COMPACT_THRESHOLD = 90
const PERCENT_MAX = 100

type ContextStatus = 'ok' | 'warn' | 'compact'

type SessionUsage = {
	inputTokens?: number
	outputTokens?: number
	totalTokens?: number
	reasoningTokens?: number
	cachedInputTokens?: number
	costUSD?: number
}

export type SessionContextUsage = {
	usedTokens: number
	maxTokens: number
	percent: number
	status: ContextStatus
	remaining?: number
	shouldCompact: boolean
	tokensToCompact: number
	isWarning: boolean
	isNearLimit: boolean
	isExceeded: boolean
	source: 'server' | 'estimated'
	sessionUsage: SessionUsage
	tokenlensModelId?: string
}

type UseSessionContextUsageInput = {
	messages: KnowledgeChatMessage[]
	providerId: string
	modelId: string
	modelContextWindowTokens?: number
}

type ContextNumbers = {
	percent: number
	remaining?: number
	status: ContextStatus
	shouldCompact: boolean
	tokensToCompact: number
}

const USAGE_FIELDS = [
	'inputTokens',
	'outputTokens',
	'totalTokens',
	'reasoningTokens',
	'cachedInputTokens',
	'costUSD',
] as const

type UsageField = (typeof USAGE_FIELDS)[number]

function getMaxTokensFromTokenlens(modelId: string): number | undefined {
	try {
		const window = getContextWindow(modelId)
		const resolvedMax =
			window.combinedMax ?? window.totalMax ?? window.inputMax ?? window.outputMax
		return resolvedMax && resolvedMax > 0 ? resolvedMax : undefined
	} catch {
		return undefined
	}
}

function aggregateSessionUsage(messages: KnowledgeChatMessage[]): SessionUsage {
	const totals: Record<UsageField, number> = {
		inputTokens: 0,
		outputTokens: 0,
		totalTokens: 0,
		reasoningTokens: 0,
		cachedInputTokens: 0,
		costUSD: 0,
	}
	const seenFields = new Set<UsageField>()

	for (const message of messages) {
		const usage = message.usage
		if (!usage) {
			continue
		}
		for (const field of USAGE_FIELDS) {
			const value = usage[field]
			if (typeof value === 'number') {
				totals[field] += value
				seenFields.add(field)
			}
		}
	}

	const aggregatedUsage: SessionUsage = {}
	for (const field of USAGE_FIELDS) {
		if (seenFields.has(field)) {
			aggregatedUsage[field] = totals[field]
		}
	}
	return aggregatedUsage
}

function estimateSessionCostUSD(
	messages: KnowledgeChatMessage[],
	tokenlensModelId?: string
): number | undefined {
	if (!tokenlensModelId) return undefined
	let totalCostUSD = 0
	let hasCost = false

	for (const message of messages) {
		const usage = message.usage
		if (!usage) continue

		if (typeof usage.costUSD === 'number') {
			totalCostUSD += usage.costUSD
			hasCost = true
			continue
		}

		try {
			const costs = getTokenCosts({
				modelId: tokenlensModelId,
				usage,
			})
			if (typeof costs.totalUSD === 'number') {
				totalCostUSD += costs.totalUSD
				hasCost = true
			}
		} catch {
			// Ignore tokenlens cost lookup failures; fallback paths still work.
		}
	}

	return hasCost ? totalCostUSD : undefined
}

function getLatestServerUsage(
	messages: KnowledgeChatMessage[]
): SessionUsage | undefined {
	for (let index = messages.length - 1; index >= 0; index -= 1) {
		const usage = messages[index]?.usage
		if (!usage) continue
		if (
			typeof usage.inputTokens === 'number' ||
			typeof usage.totalTokens === 'number'
		) {
			return usage
		}
	}
	return undefined
}

function getStatusFromPercent(percent: number): ContextStatus {
	if (percent >= FALLBACK_COMPACT_THRESHOLD) return 'compact'
	if (percent >= FALLBACK_WARN_THRESHOLD) return 'warn'
	return 'ok'
}

function hasSelectedModel(providerId: string, modelId: string): boolean {
	return providerId.trim().length > 0 && modelId.trim().length > 0
}

function resolveTokenlensModel(
	providerId: string,
	modelId: string
): { tokenlensModelId?: string; tokenlensMaxTokens?: number } {
	const candidates = getTokenlensModelIdCandidates(providerId, modelId)
	const matchedCandidate = candidates.find((candidate) => {
		const maxTokens = getMaxTokensFromTokenlens(candidate)
		return typeof maxTokens === 'number' && maxTokens > 0
	})
	const tokenlensModelId = matchedCandidate ?? candidates[0]
	const tokenlensMaxTokens = tokenlensModelId
		? getMaxTokensFromTokenlens(tokenlensModelId)
		: undefined
	return { tokenlensModelId, tokenlensMaxTokens }
}

function resolveMaxTokens(
	tokenlensMaxTokens: number | undefined,
	modelContextWindowTokens: number | undefined
): number | undefined {
	if (typeof tokenlensMaxTokens === 'number' && tokenlensMaxTokens > 0) {
		return tokenlensMaxTokens
	}
	if (typeof modelContextWindowTokens === 'number' && modelContextWindowTokens > 0) {
		return modelContextWindowTokens
	}
	return undefined
}

function resolveUsageForContext(messages: KnowledgeChatMessage[]): {
	source: 'server' | 'estimated'
	usedTokens: number
	usageForContext: SessionUsage
	hasServerUsage: boolean
} {
	const latestServerUsage = getLatestServerUsage(messages)
	const usedTokensFromServer =
		latestServerUsage?.inputTokens ?? latestServerUsage?.totalTokens
	const hasServerUsage = typeof usedTokensFromServer === 'number'
	if (hasServerUsage) {
		return {
			source: 'server',
			usedTokens: usedTokensFromServer,
			hasServerUsage: true,
			usageForContext: {
				inputTokens: usedTokensFromServer,
				outputTokens: latestServerUsage?.outputTokens,
				totalTokens: latestServerUsage?.totalTokens,
				reasoningTokens: latestServerUsage?.reasoningTokens,
				cachedInputTokens: latestServerUsage?.cachedInputTokens,
			},
		}
	}

	const estimatedUsedTokens = calculateTotalTokens(messages)
	return {
		source: 'estimated',
		usedTokens: estimatedUsedTokens,
		hasServerUsage: false,
		usageForContext: { inputTokens: estimatedUsedTokens },
	}
}

function getFallbackContextNumbers(
	usedTokens: number,
	maxTokens: number
): ContextNumbers {
	const percent = Math.round((usedTokens / maxTokens) * PERCENT_MAX)
	const status = getStatusFromPercent(percent)
	const shouldCompact = status === 'compact'
	return {
		percent,
		remaining: Math.max(0, maxTokens - usedTokens),
		status,
		shouldCompact,
		tokensToCompact: shouldCompact ? Math.max(0, usedTokens - maxTokens * 0.6) : 0,
	}
}

function getTokenlensContextNumbers(args: {
	tokenlensModelId?: string
	tokenlensMaxTokens?: number
	hasServerUsage: boolean
	usageForContext: SessionUsage
	fallback: ContextNumbers
}): ContextNumbers {
	const {
		tokenlensModelId,
		tokenlensMaxTokens,
		hasServerUsage,
		usageForContext,
		fallback,
	} = args
	const canUseTokenlensContext =
		hasServerUsage && Boolean(tokenlensModelId) && Boolean(tokenlensMaxTokens)
	if (!canUseTokenlensContext) {
		return fallback
	}
	const resolvedTokenlensModelId = tokenlensModelId as string

	try {
		const health = contextHealth({
			modelId: resolvedTokenlensModelId,
			usage: usageForContext,
		})
		return {
			percent: Math.round(health.percentUsed * PERCENT_MAX),
			remaining: health.remaining ?? fallback.remaining,
			status: health.status,
			shouldCompact: tokenlensShouldCompact({
				modelId: resolvedTokenlensModelId,
				usage: usageForContext,
			}),
			tokensToCompact: tokenlensTokensToCompact({
				modelId: resolvedTokenlensModelId,
				usage: usageForContext,
			}),
		}
	} catch {
		return fallback
	}
}

function buildSessionUsageWithCost(
	messages: KnowledgeChatMessage[],
	tokenlensModelId: string | undefined
): SessionUsage {
	const sessionUsage = aggregateSessionUsage(messages)
	const estimatedCostUSD = estimateSessionCostUSD(messages, tokenlensModelId)
	return {
		...sessionUsage,
		costUSD: sessionUsage.costUSD ?? estimatedCostUSD,
	}
}

function computeSessionContextUsage({
	messages,
	providerId,
	modelId,
	modelContextWindowTokens,
}: UseSessionContextUsageInput): SessionContextUsage | null {
	if (!hasSelectedModel(providerId, modelId)) {
		return null
	}

	const { tokenlensModelId, tokenlensMaxTokens } = resolveTokenlensModel(
		providerId,
		modelId
	)
	const maxTokens = resolveMaxTokens(tokenlensMaxTokens, modelContextWindowTokens)
	if (!maxTokens) {
		return null
	}

	const { source, usedTokens, usageForContext, hasServerUsage } =
		resolveUsageForContext(messages)
	const fallbackContext = getFallbackContextNumbers(usedTokens, maxTokens)
	const contextNumbers = getTokenlensContextNumbers({
		tokenlensModelId,
		tokenlensMaxTokens,
		hasServerUsage,
		usageForContext,
		fallback: fallbackContext,
	})
	const sessionUsage = buildSessionUsageWithCost(messages, tokenlensModelId)

	return {
		usedTokens,
		maxTokens,
		percent: contextNumbers.percent,
		status: contextNumbers.status,
		remaining: contextNumbers.remaining,
		shouldCompact: contextNumbers.shouldCompact,
		tokensToCompact: Math.max(0, Math.round(contextNumbers.tokensToCompact)),
		isWarning: contextNumbers.status === 'warn',
		isNearLimit:
			contextNumbers.status === 'warn' || contextNumbers.status === 'compact',
		isExceeded: contextNumbers.status === 'compact',
		source,
		sessionUsage,
		tokenlensModelId,
	}
}

export function useSessionContextUsage(
	input: UseSessionContextUsageInput
): SessionContextUsage | null {
	return useMemo(
		() => computeSessionContextUsage(input),
		[input.messages, input.providerId, input.modelId, input.modelContextWindowTokens]
	)
}
