import { memo } from 'react'
import {
	InlineCitation,
	InlineCitationCard,
	InlineCitationCardBody,
	InlineCitationCardTrigger,
	InlineCitationCarousel,
	InlineCitationCarouselContent,
	InlineCitationCarouselHeader,
	InlineCitationCarouselIndex,
	InlineCitationCarouselItem,
	InlineCitationCarouselNext,
	InlineCitationCarouselPrev,
	InlineCitationQuote,
	InlineCitationSource,
} from '@/components/ai-elements/inline-citation'
import { renderTextWithMentions } from '@/components/ai-elements/mention-badge'
import { Message, MessageContent, MessageResponse } from '@/components/chat-message'
import { cn } from '@/lib/utils'
import type { ChatMessage, CitationSource } from '../types'
import { formatCost, formatTokenCount } from '../utils'
import {
	isDisplayWeatherPart,
	isStockPricePart,
	isStockTrendPart,
	StockToolCard,
	StockTrendToolCard,
	WeatherToolCard,
} from './tool-cards'

// ============================================================================
// Message Footer Component
// ============================================================================

type MessageFooterProps = {
	timestamp: Date
	outputTokens: string | null
	costDisplay: string | null
	isUser: boolean
}

const MessageFooter = memo(function MessageFooter({
	timestamp,
	outputTokens,
	costDisplay,
	isUser,
}: MessageFooterProps) {
	return (
		<div
			className={cn(
				'mt-1 flex items-center gap-2 font-[tabular-nums] text-[10px]',
				isUser ? 'text-primary' : 'text-foreground'
			)}
		>
			<span>{timestamp.toLocaleTimeString()}</span>
			{outputTokens ? (
				<span className="opacity-60">• {outputTokens} tokens</span>
			) : null}
			{costDisplay ? <span className="opacity-60">• {costDisplay}</span> : null}
		</div>
	)
})

// ============================================================================
// Citation Badge Component
// ============================================================================

type CitationBadgeProps = {
	citations: CitationSource[]
}

const CitationBadge = memo(function CitationBadge({
	citations,
}: CitationBadgeProps) {
	if (citations.length === 0) return null

	const sources = citations.map((c) => c.url)

	return (
		<InlineCitation>
			<InlineCitationCard>
				<InlineCitationCardTrigger sources={sources} />
				<InlineCitationCardBody>
					<InlineCitationCarousel>
						<InlineCitationCarouselHeader>
							<InlineCitationCarouselPrev />
							<InlineCitationCarouselIndex />
							<InlineCitationCarouselNext />
						</InlineCitationCarouselHeader>
						<InlineCitationCarouselContent>
							{citations.map((citation) => (
								<InlineCitationCarouselItem key={citation.id}>
									<InlineCitationSource
										description={citation.description}
										title={citation.title}
										url={citation.url}
									/>
									{citation.quote ? (
										<InlineCitationQuote>{citation.quote}</InlineCitationQuote>
									) : null}
								</InlineCitationCarouselItem>
							))}
						</InlineCitationCarouselContent>
					</InlineCitationCarousel>
				</InlineCitationCardBody>
			</InlineCitationCard>
		</InlineCitation>
	)
})

// ============================================================================
// Content Components
// ============================================================================

type UserMessageContentProps = {
	content: string
	mentionTitles?: string[]
}

const UserMessageContent = memo(function UserMessageContent({
	content,
	mentionTitles,
}: UserMessageContentProps) {
	return (
		<p className="whitespace-pre-wrap text-pretty text-sm">
			{renderTextWithMentions(content, 'user-message', mentionTitles)}
		</p>
	)
})

type AssistantMessageContentProps = {
	content: string
	isStreaming?: boolean
	citations?: CitationSource[]
}

const AssistantMessageContent = memo(
	function AssistantMessageContent({
		content,
		isStreaming = false,
		citations,
	}: AssistantMessageContentProps) {
		const hasCitations = citations && citations.length > 0

		return (
			<div
				className={cn(
					'streamdown-content prose prose-sm dark:prose-invert max-w-none text-sm',
					isStreaming && 'streaming-cursor'
				)}
			>
				<MessageResponse isAnimating={isStreaming}>{content}</MessageResponse>
				{hasCitations ? <CitationBadge citations={citations} /> : null}
			</div>
		)
	},
	(prevProps, nextProps) =>
		prevProps.content === nextProps.content &&
		prevProps.isStreaming === nextProps.isStreaming &&
		prevProps.citations === nextProps.citations
)

// ============================================================================
// Message Bubble Component
// ============================================================================

type MessageBubbleProps = {
	message: ChatMessage
}

export const MessageBubble = memo(function MessageBubble({
	message,
}: MessageBubbleProps) {
	const isUser = message.role === 'user'
	const isMessageStreaming = Boolean(message.isStreaming)
	const hasAssistantContent = message.content.length > 0
	const messageParts = message.parts ?? []
	const hasToolCards =
		!isUser &&
		messageParts.some(
			(part) =>
				isDisplayWeatherPart(part) ||
				isStockPricePart(part) ||
				isStockTrendPart(part)
		)
	const shouldRenderBubble = isUser || hasAssistantContent || hasToolCards

	if (!shouldRenderBubble) {
		return null
	}

	// Pre-compute derived values
	const outputTokens = formatTokenCount(message.usage?.outputTokens)
	const costDisplay = formatCost(message.usage?.costUSD)
	const showFooter = !isMessageStreaming

	return (
		<Message from={message.role}>
			<MessageContent
				className={cn(
					'max-w-[85%] rounded-2xl px-4 py-2',
					isUser
						? 'bg-primary text-primary-foreground'
						: 'border bg-card text-card-foreground shadow-sm'
				)}
			>
				{/* Main content */}
				{isUser ? (
					<UserMessageContent
						content={message.content}
						mentionTitles={message.mentionTitles}
					/>
				) : null}
				{!isUser && hasAssistantContent ? (
					<AssistantMessageContent
						citations={message.citations}
						content={message.content}
						isStreaming={isMessageStreaming}
					/>
				) : null}

				{/* Tool UI cards for assistant messages */}
				{!isUser && hasToolCards ? (
					<div className="mt-2 grid gap-2">
						{messageParts.map((part) => {
							const fallbackState =
								'state' in part && typeof part.state === 'string'
									? part.state
									: 'tool'
							const toolKey =
								'toolCallId' in part && typeof part.toolCallId === 'string'
									? part.toolCallId
									: `${message.id}-${part.type}-${fallbackState}`
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
				) : null}

				{/* Footer: timestamp, token count and cost */}
				{showFooter ? (
					<MessageFooter
						costDisplay={costDisplay}
						isUser={isUser}
						outputTokens={outputTokens}
						timestamp={message.timestamp}
					/>
				) : null}
			</MessageContent>
		</Message>
	)
})
