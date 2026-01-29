import { CollapsibleContent } from '@folionote/ui/collapsible'
import { AiBrain01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Fragment, memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
	ChainOfThought,
	ChainOfThoughtContent,
	ChainOfThoughtHeader,
	ChainOfThoughtStep,
} from '@/components/ai-elements/chain-of-thoughts'
import {
	Conversation,
	ConversationContent,
	ConversationEmptyState,
	ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import {
	Reasoning,
	ReasoningContent,
	ReasoningTrigger,
} from '@/components/ai-elements/reasoning'
import { Shimmer } from '@/components/ai-elements/shimmer'
import {
	ToolApprovalButtons,
	type ToolApprovalHandler,
} from '@/components/ai-elements/tool-approval'
import { Message } from '@/components/chat-message'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '../types'
import { MessageBubble } from './message-bubble'

// ============================================================================
// Waiting Indicator
// ============================================================================

const WAITING_SHIMMER_DURATION = 1

const WaitingIndicator = memo(function WaitingIndicator() {
	const { t } = useTranslation()

	return (
		<Message from="assistant">
			<Reasoning className="mb-0" defaultOpen={false} isStreaming>
				<ReasoningTrigger
					getThinkingMessage={() => (
						<Shimmer duration={WAITING_SHIMMER_DURATION}>
							{t('knowledge.thinkingInProgress')}
						</Shimmer>
					)}
				/>
			</Reasoning>
		</Message>
	)
})

// ============================================================================
// Message Process Components
// ============================================================================

type ToolMessagePart = NonNullable<ChatMessage['parts']>[number]

const TOOL_TYPE_LABELS: Record<string, string> = {
	'tool-displayWeather': 'Weather',
	'tool-getStockPrice': 'Stock Price',
	'tool-getStockTrend': 'Stock Trend',
}

const TOOL_INPUT_PAIR_SEPARATOR = ': '
const TOOL_INPUT_SEPARATOR = ', '
const TOOL_CALLS_LABEL = 'Tool Calls'
const TOOL_LABEL_FALLBACK = 'Tool'
const TOOL_CALLS_FALLBACK_STATE = 'tool'

const REASONING_TOOL_CALLS_CLASSNAME = [
	'mt-3 space-y-3 text-sm outline-none',
	'data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2',
	'data-[state=open]:slide-in-from-top-2 data-[state=closed]:animate-out',
	'data-[state=open]:animate-in',
].join(' ')

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isToolInvocationPart(
	part: ToolMessagePart
): part is ToolMessagePart & { type: string } {
	return (
		Boolean(part) &&
		typeof part === 'object' &&
		'type' in part &&
		typeof part.type === 'string' &&
		part.type.startsWith('tool-')
	)
}

function getToolLabel(part: ToolMessagePart): string {
	if ('toolName' in part && typeof part.toolName === 'string') {
		return part.toolName
	}
	if ('type' in part && typeof part.type === 'string') {
		return TOOL_TYPE_LABELS[part.type] ?? part.type
	}
	return TOOL_LABEL_FALLBACK
}

function getToolStatus(
	part: ToolMessagePart,
	isStreaming: boolean
): 'complete' | 'active' | 'pending' {
	const state = 'state' in part && typeof part.state === 'string' ? part.state : null
	if (state === 'output-available' || state === 'output-error') {
		return 'complete'
	}
	if (state === 'input-available') {
		return 'active'
	}
	return isStreaming ? 'active' : 'pending'
}

function isApprovalRequested(part: ToolMessagePart): boolean {
	return (
		'state' in part &&
		part.state === 'approval-requested' &&
		'approval' in part &&
		typeof part.approval === 'object' &&
		part.approval !== null &&
		'id' in part.approval
	)
}

type ApprovalInfo = {
	id: string
	toolName: string
	input: unknown
}

function getApprovalInfo(part: ToolMessagePart): ApprovalInfo | null {
	if (!isApprovalRequested(part)) return null

	const approval = (part as { approval: { id: string } }).approval
	const toolName = getToolLabel(part)
	const input = 'input' in part ? part.input : undefined

	return {
		id: approval.id,
		toolName,
		input,
	}
}

function getToolInputSummary(part: ToolMessagePart): string | undefined {
	if (!('input' in part)) return undefined
	const input = part.input
	if (!isRecord(input)) return undefined
	const fragments: string[] = []
	for (const [key, value] of Object.entries(input)) {
		if (
			typeof value === 'string' ||
			typeof value === 'number' ||
			typeof value === 'boolean'
		) {
			fragments.push(`${key}${TOOL_INPUT_PAIR_SEPARATOR}${value}`)
		}
	}
	return fragments.length > 0 ? fragments.join(TOOL_INPUT_SEPARATOR) : undefined
}

function getToolKey(messageId: string, part: ToolMessagePart): string {
	const toolState =
		'state' in part && typeof part.state === 'string'
			? part.state
			: TOOL_CALLS_FALLBACK_STATE
	if ('toolCallId' in part && typeof part.toolCallId === 'string') {
		return part.toolCallId
	}
	return `${messageId}-${part.type}-${toolState}`
}

type ToolCallStepsProps = {
	messageId: string
	isStreaming: boolean
	toolInvocations: ToolMessagePart[]
	className?: string
	onToolApprovalResponse?: ToolApprovalHandler
}

const ToolCallSteps = memo(function ToolCallSteps({
	messageId,
	isStreaming,
	toolInvocations,
	className,
	onToolApprovalResponse,
}: ToolCallStepsProps) {
	// Separate tools that need approval from regular tools
	const approvalRequestedTools = toolInvocations.filter(isApprovalRequested)
	const regularTools = toolInvocations.filter((t) => !isApprovalRequested(t))

	return (
		<div className={cn('space-y-3', className)}>
			{/* Regular tool calls in chain-of-thought format */}
			{regularTools.length > 0 ? (
				<ChainOfThought>
					<ChainOfThoughtHeader>{TOOL_CALLS_LABEL}</ChainOfThoughtHeader>
					<ChainOfThoughtContent>
						{regularTools.map((tool) => (
							<ChainOfThoughtStep
								description={getToolInputSummary(tool)}
								key={getToolKey(messageId, tool)}
								label={getToolLabel(tool)}
								status={getToolStatus(tool, isStreaming)}
							/>
						))}
					</ChainOfThoughtContent>
				</ChainOfThought>
			) : null}

			{/* Approval requested tools with action buttons */}
			{onToolApprovalResponse
				? approvalRequestedTools.map((tool) => {
						const approvalInfo = getApprovalInfo(tool)
						if (!approvalInfo) return null

						return (
							<ToolApprovalButtons
								approvalId={approvalInfo.id}
								input={approvalInfo.input}
								key={getToolKey(messageId, tool)}
								onApprovalResponse={onToolApprovalResponse}
								toolName={approvalInfo.toolName}
							/>
						)
					})
				: null}
		</div>
	)
})

type MessageProcessProps = {
	message: ChatMessage
	thinkingEnabled: boolean
	onToolApprovalResponse?: ToolApprovalHandler
}

const MessageProcess = memo(function MessageProcess({
	message,
	thinkingEnabled,
	onToolApprovalResponse,
}: MessageProcessProps) {
	if (message.role !== 'assistant') return null

	const toolInvocations = (message.parts ?? []).filter(isToolInvocationPart)
	const hasToolInvocations = toolInvocations.length > 0
	const hasThinking = Boolean(message.thinking && message.thinking.length > 0)
	const shouldShowReasoning = thinkingEnabled && hasThinking
	const shouldRenderProcess = shouldShowReasoning || hasToolInvocations

	if (!shouldRenderProcess) {
		return null
	}

	const isMessageStreaming = Boolean(message.isStreaming)

	if (shouldShowReasoning) {
		return (
			<Message from="assistant">
				<Reasoning className="mb-0" isStreaming={isMessageStreaming}>
					<ReasoningTrigger />
					{hasThinking ? (
						<ReasoningContent>{message.thinking ?? ''}</ReasoningContent>
					) : null}
					{hasToolInvocations ? (
						<CollapsibleContent className={REASONING_TOOL_CALLS_CLASSNAME}>
							<ToolCallSteps
								isStreaming={isMessageStreaming}
								messageId={message.id}
								onToolApprovalResponse={onToolApprovalResponse}
								toolInvocations={toolInvocations}
							/>
						</CollapsibleContent>
					) : null}
				</Reasoning>
			</Message>
		)
	}

	return (
		<Message from="assistant">
			<ToolCallSteps
				isStreaming={isMessageStreaming}
				messageId={message.id}
				onToolApprovalResponse={onToolApprovalResponse}
				toolInvocations={toolInvocations}
			/>
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
	onToolApprovalResponse?: ToolApprovalHandler
}

export function MessageList({
	messages,
	isPending,
	thinkingEnabled,
	onToolApprovalResponse,
}: MessageListProps) {
	const { t } = useTranslation()

	// Derive waiting state from messages - show only when pending but no streaming content
	const showWaiting = useMemo(() => {
		if (!isPending) return false
		const hasToolParts = (message: ChatMessage) =>
			(message.parts ?? []).some(isToolInvocationPart)
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
							<Fragment key={message.id}>
								<MessageProcess
									message={message}
									onToolApprovalResponse={onToolApprovalResponse}
									thinkingEnabled={thinkingEnabled}
								/>
								<MessageBubble message={message} />
							</Fragment>
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
