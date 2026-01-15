import { ArrowDown01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useStickToBottom } from 'use-stick-to-bottom'
import { Message, MessageContent } from '@/components/chat-message'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import type { ChatMessage } from '../types'
import { MessageBubble } from './message-bubble'

// ============================================================================
// Waiting Indicator
// ============================================================================

const WaitingIndicator = memo(function WaitingIndicator() {
	const { t } = useTranslation()

	return (
		<Message from="assistant">
			<MessageContent>
				<div className="flex items-center gap-2">
					<Spinner className="size-4" />
					<span className="text-muted-foreground text-sm">
						{t('knowledge.waiting')}
					</span>
				</div>
			</MessageContent>
		</Message>
	)
})

// ============================================================================
// Message List Component
// ============================================================================

type MessageListProps = {
	messages: ChatMessage[]
	isPending: boolean
	thinkingEnabled: boolean
}

export function MessageList({
	messages,
	isPending,
	thinkingEnabled,
}: MessageListProps) {
	const { t } = useTranslation()

	// Use stick-to-bottom for auto-scroll behavior
	const { scrollRef, contentRef, isAtBottom, scrollToBottom } = useStickToBottom()

	// Derive waiting state from messages - show only when pending but no streaming content
	const showWaiting = useMemo(() => {
		if (!isPending) return false
		return !messages.some(
			(m) => m.isStreaming && (m.content.length > 0 || (m.thinking?.length ?? 0) > 0)
		)
	}, [isPending, messages])

	return (
		<div className="relative h-full">
			<div className="h-full overflow-y-auto overscroll-contain p-4" ref={scrollRef}>
				<div className="space-y-4" ref={contentRef}>
					{messages.map((message) => (
						<MessageBubble
							key={message.id}
							message={message}
							thinkingEnabled={thinkingEnabled}
						/>
					))}
					{showWaiting ? <WaitingIndicator /> : null}
				</div>
			</div>

			{/* Scroll to bottom button */}
			{isAtBottom ? null : (
				<Button
					aria-label={t('knowledge.scrollToBottom')}
					className="absolute right-4 bottom-4 size-8 rounded-full shadow-lg"
					onClick={() => scrollToBottom()}
					size="icon"
					variant="secondary"
				>
					<HugeiconsIcon className="size-4" icon={ArrowDown01Icon} />
				</Button>
			)}
		</div>
	)
}
