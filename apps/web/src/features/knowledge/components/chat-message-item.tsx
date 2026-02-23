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
	isDisplayWeatherPart,
	isStockPricePart,
	isStockTrendPart,
	isWebSearchPart,
	StockToolCard,
	StockTrendToolCard,
	WeatherToolCard,
	WebSearchToolCard,
} from './tool-cards'

const WAITING_SHIMMER_DURATION = 1.4
const WAITING_SHIMMER_SPREAD = 3
const WAITING_LOADER_SIZE = 14

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
}

export const ChatMessageItem = memo(function ChatMessageItem({
	message,
	thinkingEnabled,
	onToolApprovalResponse,
}: ChatMessageItemProps) {
	const parts = message.parts ?? []
	const isMessageStreaming = Boolean(message.isStreaming)

	const processSegments = useMemo(() => groupProcessSegments(parts), [parts])

	const toolCardParts = useMemo(() => parts.filter(isToolCardPart), [parts])

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

			{message.content ? (
				<Message from={message.role}>
					<MessageContent>
						<MessageResponse>{message.content}</MessageResponse>
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
								if (isWebSearchPart(part)) {
									return (
										<WebSearchToolCard key={`web-search-${toolKey}`} part={part} />
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
