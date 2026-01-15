import { AiBrain01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { renderTextWithMentions } from '@/components/ai-elements/mention-badge'
import { Message, MessageContent, MessageResponse } from '@/components/chat-message'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '../types'
import { formatCost, formatTokenCount } from '../utils'

// ============================================================================
// Thinking Collapse Component
// ============================================================================

type ThinkingCollapseProps = {
	thinking: string
	isStreaming: boolean
	isThinkingOnly: boolean
	reasoningTokens: string | null
}

const ThinkingCollapse = memo(function ThinkingCollapse({
	thinking,
	isStreaming,
	isThinkingOnly,
	reasoningTokens,
}: ThinkingCollapseProps) {
	const { t } = useTranslation()
	const [isOpen, setIsOpen] = useState(false)

	const label =
		isStreaming && isThinkingOnly
			? t('knowledge.thinkingInProgress')
			: t('knowledge.viewThinking')

	return (
		<Collapsible onOpenChange={setIsOpen} open={isOpen}>
			<CollapsibleTrigger
				className={cn(
					'mb-2 flex w-full items-center gap-2 rounded-lg px-2 py-1.5',
					'bg-muted/50 text-muted-foreground text-xs',
					'transition-colors hover:bg-muted',
					'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
				)}
			>
				<HugeiconsIcon className="size-3.5" icon={AiBrain01Icon} />
				<span className="flex-1 text-left">{label}</span>
				{reasoningTokens && !isStreaming ? (
					<span className="font-[tabular-nums] text-[10px] opacity-60">
						{reasoningTokens} tokens
					</span>
				) : null}
				<svg
					aria-hidden="true"
					className={cn('size-3 transition-transform', isOpen && 'rotate-180')}
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						d="M19 9l-7 7-7-7"
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
					/>
				</svg>
			</CollapsibleTrigger>
			<CollapsibleContent>
				<div
					className={cn(
						'mb-2 rounded-lg bg-muted/30 p-3',
						'prose prose-sm dark:prose-invert max-w-none text-xs',
						'border-primary/30 border-l-2',
						isStreaming && isThinkingOnly && 'streaming-cursor'
					)}
				>
					<MessageResponse isAnimating={isStreaming && isThinkingOnly}>
						{thinking}
					</MessageResponse>
				</div>
			</CollapsibleContent>
		</Collapsible>
	)
})

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
				isUser ? 'text-primary-foreground/70' : 'text-muted-foreground'
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
// Content Components
// ============================================================================

type UserMessageContentProps = {
	content: string
}

const UserMessageContent = memo(function UserMessageContent({
	content,
}: UserMessageContentProps) {
	return (
		<p className="whitespace-pre-wrap text-pretty text-sm">
			{renderTextWithMentions(content, 'user-message')}
		</p>
	)
})

type AssistantMessageContentProps = {
	content: string
	isStreaming?: boolean
}

const AssistantMessageContent = memo(
	function AssistantMessageContent({
		content,
		isStreaming = false,
	}: AssistantMessageContentProps) {
		return (
			<div
				className={cn(
					'streamdown-content prose prose-sm dark:prose-invert max-w-none text-sm',
					isStreaming && 'streaming-cursor'
				)}
			>
				<MessageResponse isAnimating={isStreaming}>{content}</MessageResponse>
			</div>
		)
	},
	(prevProps, nextProps) =>
		prevProps.content === nextProps.content &&
		prevProps.isStreaming === nextProps.isStreaming
)

// ============================================================================
// Message Bubble Component
// ============================================================================

type MessageBubbleProps = {
	message: ChatMessage
	thinkingEnabled: boolean
}

export const MessageBubble = memo(function MessageBubble({
	message,
	thinkingEnabled,
}: MessageBubbleProps) {
	const isUser = message.role === 'user'
	const hasThinking = Boolean(message.thinking && message.thinking.length > 0)
	const isThinkingOnly = hasThinking && !message.content

	// Don't render completely empty streaming messages
	if (message.isStreaming && !message.content && !message.thinking) {
		return null
	}

	// Pre-compute derived values
	const outputTokens = formatTokenCount(message.usage?.outputTokens)
	const reasoningTokens = formatTokenCount(message.usage?.reasoningTokens)
	const costDisplay = formatCost(message.usage?.costUSD)
	const showFooter = !message.isStreaming

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
				{/* Thinking content for assistant messages */}
				{!isUser && hasThinking && thinkingEnabled ? (
					<ThinkingCollapse
						isStreaming={message.isStreaming ?? false}
						isThinkingOnly={isThinkingOnly}
						reasoningTokens={reasoningTokens}
						thinking={message.thinking ?? ''}
					/>
				) : null}

				{/* Main content */}
				{isUser ? (
					<UserMessageContent content={message.content} />
				) : (
					<AssistantMessageContent
						content={message.content}
						isStreaming={message.isStreaming && !isThinkingOnly}
					/>
				)}

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
