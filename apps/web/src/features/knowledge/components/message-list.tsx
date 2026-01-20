import { Spinner } from '@folionote/ui/spinner'
import { AiBrain01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
	Conversation,
	ConversationContent,
	ConversationEmptyState,
	ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import { Message, MessageContent } from '@/components/chat-message'
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

	// Derive waiting state from messages - show only when pending but no streaming content
	const showWaiting = useMemo(() => {
		if (!isPending) return false
		const hasToolParts = (message: ChatMessage) =>
			(message.parts ?? []).some(
				(part) =>
					'type' in part &&
					typeof part.type === 'string' &&
					part.type.startsWith('tool-')
			)
		return !messages.some(
			(m) =>
				m.isStreaming &&
				(m.content.length > 0 || (m.thinking?.length ?? 0) > 0 || hasToolParts(m))
		)
	}, [isPending, messages])

	const hasMessages = messages.length > 0 || showWaiting

	return (
		<Conversation className="h-full">
			<ConversationContent className="gap-4 p-4">
				{hasMessages ? (
					<>
						{messages.map((message) => (
							<MessageBubble
								key={message.id}
								message={message}
								thinkingEnabled={thinkingEnabled}
							/>
						))}
						{showWaiting ? <WaitingIndicator /> : null}
					</>
				) : (
					<ConversationEmptyState
						description={t('knowledge.emptyState.description')}
						icon={
							<HugeiconsIcon
								className="size-12 text-muted-foreground/50"
								icon={AiBrain01Icon}
							/>
						}
						title={t('knowledge.emptyState.title')}
					/>
				)}
			</ConversationContent>
			<ConversationScrollButton />
		</Conversation>
	)
}
