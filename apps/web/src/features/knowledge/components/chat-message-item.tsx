import type { WebSearchResult } from '@folionote/ai-tools'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader } from '@/components/ai-elements/loader'
import {
	Reasoning,
	ReasoningContent,
	ReasoningTrigger,
} from '@/components/ai-elements/reasoning'
import { Shimmer } from '@/components/ai-elements/shimmer'
import type { ToolApprovalHandler } from '@/components/ai-elements/tool-approval'
import { Message, MessageContent, MessageResponse } from '@/components/chat-message'
import type { KnowledgeChatMessage } from '@/hooks/use-knowledge-chat'
import type { ToolMessagePart } from './tool-calls'
import {
	getToolKey,
	isToolCardPart,
	isToolInvocationPart,
	ToolCalls,
} from './tool-calls'
import {
	extractWebSearchData,
	isDisplayWeatherPart,
	isStockPricePart,
	isStockTrendPart,
	isWebSearchPart,
	StockToolCard,
	StockTrendToolCard,
	WeatherToolCard,
	WebSearchToolCard,
} from './tool-cards'

export type WebSearchPanelOpenHandler = (data: {
	query: string
	results: WebSearchResult[]
}) => void

const WAITING_SHIMMER_DURATION = 1.4
const WAITING_SHIMMER_SPREAD = 3
const WAITING_LOADER_SIZE = 14
const MAX_VISIBLE_REFERENCES = 3

function getHostname(url: string): string {
	try {
		return new URL(url).hostname
	} catch {
		return url
	}
}

function getFaviconUrl(url: string): string {
	const hostname = getHostname(url)
	return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`
}

const WebSearchReferences = memo(function WebSearchReferences({
	results,
	onViewAll,
}: {
	results: WebSearchResult[]
	onViewAll?: () => void
}) {
	const { t } = useTranslation()
	if (results.length === 0) return null

	const visible = results.slice(0, MAX_VISIBLE_REFERENCES)
	const remaining = results.length - MAX_VISIBLE_REFERENCES

	return (
		<div className="flex flex-wrap items-center gap-2 pt-1 text-muted-foreground text-xs">
			{visible.map((result) => (
				<a
					className="inline-flex items-center gap-1.5 rounded-md border border-border/40 bg-muted/30 px-2 py-1 transition-colors duration-150 hover:border-border/60 hover:bg-muted/50"
					href={result.url}
					key={result.url}
					rel="noopener noreferrer"
					target="_blank"
				>
					<img
						alt=""
						className="size-3.5 shrink-0 rounded-sm"
						loading="lazy"
						src={getFaviconUrl(result.url)}
					/>
					<span className="max-w-[140px] truncate">{getHostname(result.url)}</span>
				</a>
			))}
			{remaining > 0 && onViewAll ? (
				<button
					className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-border/40 bg-muted/30 px-2 py-1 transition-colors duration-150 hover:border-border/60 hover:bg-muted/50"
					onClick={onViewAll}
					type="button"
				>
					<span>+{remaining}</span>
					<span>{t('knowledge.toolCards.webSearch.reference')}</span>
				</button>
			) : null}
		</div>
	)
})

export const WaitingIndicator = memo(function WaitingIndicator() {
	const { t } = useTranslation()

	return (
		<Message from="assistant">
			<Reasoning
				className="fade-in-0 slide-in-from-bottom-2 mb-0 animate-in duration-200 motion-reduce:animate-none"
				defaultOpen={false}
				isStreaming
			>
				<ReasoningTrigger
					getThinkingMessage={() => (
						<span className="flex items-center gap-2">
							<Loader size={WAITING_LOADER_SIZE} />
							<Shimmer
								duration={WAITING_SHIMMER_DURATION}
								spread={WAITING_SHIMMER_SPREAD}
							>
								{t('knowledge.thinkingInProgress')}
							</Shimmer>
						</span>
					)}
				/>
			</Reasoning>
		</Message>
	)
})

// =============================================================================
// Parts Grouping
// =============================================================================

type ReasoningSegment = { kind: 'reasoning'; text: string; index: number }
type ToolSegment = {
	kind: 'tool'
	tools: ToolMessagePart[]
	index: number
}
type ProcessSegment = ReasoningSegment | ToolSegment

function isReasoningPart(
	part: ToolMessagePart
): part is ToolMessagePart & { type: 'reasoning' } {
	return (
		Boolean(part) &&
		typeof part === 'object' &&
		'type' in part &&
		part.type === 'reasoning'
	)
}

function getReasoningText(part: ToolMessagePart): string {
	if ('text' in part && typeof part.text === 'string') return part.text
	if ('reasoning' in part && typeof part.reasoning === 'string')
		return part.reasoning
	return ''
}

/**
 * Group message.parts into ordered segments of reasoning and tool-invocation,
 * preserving the interleaved order they appear in the stream.
 */
function groupProcessSegments(parts: ToolMessagePart[]): ProcessSegment[] {
	const segments: ProcessSegment[] = []
	let segmentIndex = 0

	for (const part of parts) {
		if (isReasoningPart(part)) {
			const text = getReasoningText(part)
			if (!text) continue
			const last = segments.at(-1)
			if (last?.kind === 'reasoning') {
				last.text += `\n${text}`
			} else {
				segments.push({ kind: 'reasoning', text, index: segmentIndex++ })
			}
		} else if (isToolInvocationPart(part) && !isToolCardPart(part)) {
			const last = segments.at(-1)
			if (last?.kind === 'tool') {
				last.tools.push(part)
			} else {
				segments.push({ kind: 'tool', tools: [part], index: segmentIndex++ })
			}
		}
	}

	return segments
}

// =============================================================================
// ChatMessageItem
// =============================================================================

type ChatMessageItemProps = {
	message: KnowledgeChatMessage
	thinkingEnabled: boolean
	onToolApprovalResponse?: ToolApprovalHandler
	onOpenWebSearchPanel?: WebSearchPanelOpenHandler
}

export const ChatMessageItem = memo(function ChatMessageItem({
	message,
	thinkingEnabled,
	onToolApprovalResponse,
	onOpenWebSearchPanel,
}: ChatMessageItemProps) {
	const parts = message.parts ?? []
	const isMessageStreaming = Boolean(message.isStreaming)

	const processSegments = useMemo(() => groupProcessSegments(parts), [parts])

	const toolCardParts = useMemo(
		() => parts.filter((p) => isToolCardPart(p) && !isWebSearchPart(p)),
		[parts]
	)

	const webSearchData = useMemo(
		() => (message.role === 'assistant' ? extractWebSearchData(parts) : null),
		[message.role, parts]
	)

	const hasProcessSegments =
		message.role === 'assistant' && processSegments.length > 0
	const hasToolCards = message.role === 'assistant' && toolCardParts.length > 0

	return (
		<>
			{hasProcessSegments
				? processSegments.map((segment) => {
						if (segment.kind === 'reasoning' && thinkingEnabled) {
							return (
								<Message from="assistant" key={`reason-${segment.index}`}>
									<Reasoning
										className="mb-0"
										defaultOpen={isMessageStreaming}
										isStreaming={isMessageStreaming}
									>
										<ReasoningTrigger />
										<ReasoningContent>{segment.text}</ReasoningContent>
									</Reasoning>
								</Message>
							)
						}
						if (segment.kind === 'tool') {
							return (
								<Message from="assistant" key={`tool-${segment.index}`}>
									<ToolCalls
										className="fade-in-0 slide-in-from-top-2 animate-in duration-200 ease-out motion-reduce:animate-none"
										isStreaming={isMessageStreaming}
										messageId={message.id}
										onToolApprovalResponse={onToolApprovalResponse}
										tools={segment.tools}
									/>
								</Message>
							)
						}
						return null
					})
				: null}

			{message.content || webSearchData ? (
				<Message from={message.role === 'assistant' ? 'assistant' : message.role}>
					<MessageContent>
						{webSearchData ? (
							<WebSearchToolCard
								onOpenPanel={onOpenWebSearchPanel}
								webSearchData={webSearchData}
							/>
						) : null}
						{message.content ? (
							<MessageResponse>{message.content}</MessageResponse>
						) : null}
						{webSearchData &&
						!webSearchData.isLoading &&
						webSearchData.results.length > 0 ? (
							<WebSearchReferences
								onViewAll={
									onOpenWebSearchPanel
										? () =>
												onOpenWebSearchPanel({
													query: webSearchData.query,
													results: webSearchData.results,
												})
										: undefined
								}
								results={webSearchData.results}
							/>
						) : null}
					</MessageContent>
				</Message>
			) : null}

			{hasToolCards ? (
				<Message from="assistant">
					<MessageContent>
						<div className="grid gap-2">
							{toolCardParts.map((part) => {
								const toolKey = getToolKey(message.id, part)
								if (isDisplayWeatherPart(part)) {
									return <WeatherToolCard key={`weather-${toolKey}`} part={part} />
								}
								if (isStockPricePart(part)) {
									return <StockToolCard key={`stock-${toolKey}`} part={part} />
								}
								if (isStockTrendPart(part)) {
									return (
										<StockTrendToolCard key={`stock-trend-${toolKey}`} part={part} />
									)
								}
								return null
							})}
						</div>
					</MessageContent>
				</Message>
			) : null}
		</>
	)
})
