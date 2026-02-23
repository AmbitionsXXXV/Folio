import { CollapsibleContent } from '@folionote/ui/collapsible'
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

const REASONING_TOOL_CLASSNAME = [
	'mt-3 space-y-3 text-sm outline-none',
	'data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2',
	'data-[state=open]:slide-in-from-top-2 data-[state=closed]:animate-out',
	'data-[state=open]:animate-in duration-200 ease-out',
	'motion-reduce:transition-none motion-reduce:animate-none',
].join(' ')

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
	const toolInvocations = useMemo(
		() => (message.parts ?? []).filter(isToolInvocationPart),
		[message.parts]
	)
	const toolCardParts = useMemo(
		() => (message.parts ?? []).filter(isToolCardPart),
		[message.parts]
	)
	const hasToolInvocations = toolInvocations.length > 0
	const hasToolCards = message.role === 'assistant' && toolCardParts.length > 0
	const hasThinking = Boolean(message.thinking && message.thinking.length > 0)
	const shouldShowReasoning =
		message.role === 'assistant' && thinkingEnabled && hasThinking
	const isMessageStreaming = Boolean(message.isStreaming)

	return (
		<>
			{message.role === 'assistant' &&
			(shouldShowReasoning || hasToolInvocations) ? (
				<Message from="assistant">
					{shouldShowReasoning ? (
						<Reasoning className="mb-0" isStreaming={isMessageStreaming}>
							<ReasoningTrigger />
							{hasThinking ? (
								<ReasoningContent>{message.thinking ?? ''}</ReasoningContent>
							) : null}
							{hasToolInvocations ? (
								<CollapsibleContent className={REASONING_TOOL_CLASSNAME}>
									<ToolCalls
										isStreaming={isMessageStreaming}
										messageId={message.id}
										onToolApprovalResponse={onToolApprovalResponse}
										tools={toolInvocations}
									/>
								</CollapsibleContent>
							) : null}
						</Reasoning>
					) : (
						<ToolCalls
							className="fade-in-0 slide-in-from-top-2 animate-in duration-200 ease-out motion-reduce:animate-none"
							isStreaming={isMessageStreaming}
							messageId={message.id}
							onToolApprovalResponse={onToolApprovalResponse}
							tools={toolInvocations}
						/>
					)}
				</Message>
			) : null}

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
