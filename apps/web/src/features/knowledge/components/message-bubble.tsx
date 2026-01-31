import { Copy01Icon, RefreshIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
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
import {
	Source,
	Sources,
	SourcesContent,
	SourcesTrigger,
} from '@/components/ai-elements/sources'
import {
	Message,
	MessageAction,
	MessageActions,
	MessageContent,
	MessageResponse,
} from '@/components/chat-message'
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
	onRegenerate?: () => void
}

export const MessageBubble = memo(function MessageBubble({
	message,
	onRegenerate,
}: MessageBubbleProps) {
	const { t } = useTranslation()
	const isUser = message.role === 'user'
	const isMessageStreaming = Boolean(message.isStreaming)
	const hasAssistantContent = message.content.length > 0
	const messageParts = message.parts ?? []
	const sources = messageParts.filter(isSourceUrlPart)
	const hasSources = sources.length > 0
	const hasToolCards =
		!isUser &&
		messageParts.some(
			(part) =>
				isDisplayWeatherPart(part) ||
				isStockPricePart(part) ||
				isStockTrendPart(part)
		)
	const shouldRenderBubble = isUser || hasAssistantContent || hasToolCards

	// Pre-compute derived values
	const outputTokens = formatTokenCount(message.usage?.outputTokens)
	const costDisplay = formatCost(message.usage?.costUSD)
	const showFooter = !isMessageStreaming
	const showActions = !isUser && hasAssistantContent

	const handleCopy = useCallback(() => {
		if (!hasAssistantContent) return
		if (!navigator.clipboard?.writeText) return
		navigator.clipboard.writeText(message.content)
	}, [hasAssistantContent, message.content])

	const handleRegenerate = useCallback(() => {
		onRegenerate?.()
	}, [onRegenerate])

	if (!shouldRenderBubble) {
		return null
	}

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
				{/* Sources */}
				{!isUser && hasSources ? (
					<Sources>
						<SourcesTrigger count={sources.length} />
						<SourcesContent>
							{sources.map((source, index) => (
								<Source
									href={source.url}
									key={getSourceKey(message.id, source, index)}
									title={source.title ?? source.url}
								/>
							))}
						</SourcesContent>
					</Sources>
				) : null}

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

				{/* Message actions */}
				{showActions ? (
					<MessageActions className="mt-2 justify-end">
						<MessageAction
							disabled={!onRegenerate || isMessageStreaming}
							label={t('knowledge.messageActions.retry')}
							onClick={handleRegenerate}
							tooltip={t('knowledge.messageActions.retry')}
						>
							<HugeiconsIcon icon={RefreshIcon} size={14} />
						</MessageAction>
						<MessageAction
							disabled={isMessageStreaming}
							label={t('knowledge.messageActions.copy')}
							onClick={handleCopy}
							tooltip={t('knowledge.messageActions.copy')}
						>
							<HugeiconsIcon icon={Copy01Icon} size={14} />
						</MessageAction>
					</MessageActions>
				) : null}
			</MessageContent>
		</Message>
	)
})

type MessagePart = NonNullable<ChatMessage['parts']>[number]

type SourceUrlPart = MessagePart & {
	type: 'source-url'
	url: string
	title?: string
}

const SOURCE_URL_PART_TYPE = 'source-url'

function isSourceUrlPart(part: MessagePart): part is SourceUrlPart {
	return (
		Boolean(part) &&
		typeof part === 'object' &&
		'type' in part &&
		part.type === SOURCE_URL_PART_TYPE &&
		'url' in part &&
		typeof part.url === 'string'
	)
}

function getSourceKey(
	messageId: string,
	source: SourceUrlPart,
	index: number
): string {
	return `${messageId}-source-${source.url}-${index}`
}
