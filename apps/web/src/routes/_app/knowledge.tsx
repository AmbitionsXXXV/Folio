import { Button } from '@folionote/ui/button'
import { CollapsibleContent } from '@folionote/ui/collapsible'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@folionote/ui/sheet'
import { Tooltip, TooltipContent, TooltipTrigger } from '@folionote/ui/tooltip'
import {
	AiBrain01Icon,
	Cancel01Icon,
	MessageAdd01Icon,
	Setting06Icon,
	SidebarLeftIcon,
	Tick02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { createFileRoute, Link } from '@tanstack/react-router'
import type { FileUIPart } from 'ai'
import {
	Fragment,
	lazy,
	memo,
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
	Confirmation,
	ConfirmationAccepted,
	ConfirmationAction,
	ConfirmationActions,
	ConfirmationRejected,
	ConfirmationRequest,
	ConfirmationTitle,
} from '@/components/ai-elements/confirmation'
import {
	Context,
	ContextCacheUsage,
	ContextContent,
	ContextContentBody,
	ContextContentFooter,
	ContextContentHeader,
	ContextInputUsage,
	ContextOutputUsage,
	ContextReasoningUsage,
	ContextTrigger,
} from '@/components/ai-elements/context-usage'
import {
	Conversation,
	ConversationContent,
	ConversationEmptyState,
	ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import { Loader } from '@/components/ai-elements/loader'
import { AiModelSelector } from '@/components/ai-elements/model-selector'
import {
	PromptInput,
	PromptInputActionAddAttachments,
	PromptInputActionMenu,
	PromptInputActionMenuContent,
	PromptInputActionMenuTrigger,
	PromptInputAttachments,
	PromptInputBody,
	PromptInputButton,
	PromptInputFooter,
	PromptInputHeader,
	type PromptInputMessage,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputTools,
	usePromptInputAttachments,
} from '@/components/ai-elements/prompt-input'
import {
	Reasoning,
	ReasoningContent,
	ReasoningTrigger,
} from '@/components/ai-elements/reasoning'
import { Shimmer } from '@/components/ai-elements/shimmer'
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion'
import {
	Tool,
	ToolContent,
	ToolHeader,
	ToolInput,
	ToolOutput,
} from '@/components/ai-elements/tool'
import type { ToolApprovalHandler } from '@/components/ai-elements/tool-approval'
import { Message, MessageContent, MessageResponse } from '@/components/chat-message'
import { isApiSupportedProvider, mapProviderIdToApi } from '@/features/knowledge'
import { CompactMessage } from '@/features/knowledge/components/compact-message'
import {
	isDisplayWeatherPart,
	isStockPricePart,
	isStockTrendPart,
	StockToolCard,
	StockTrendToolCard,
	WeatherToolCard,
} from '@/features/knowledge/components/tool-cards'
import { useAiModelCatalog } from '@/hooks/use-ai-model-catalog'
import { useAiProviderConfig } from '@/hooks/use-ai-provider-config'
import { useChatSessions } from '@/hooks/use-chat-sessions'
import {
	type KnowledgeChatMessage,
	useKnowledgeChat,
} from '@/hooks/use-knowledge-chat'
import { useLastUsedModel } from '@/hooks/use-last-used-model'
import { useModelProviderConfig } from '@/hooks/use-model-provider-config'
import {
	type SessionContextUsage,
	useSessionContextUsage,
} from '@/hooks/use-session-context-usage'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/knowledge')({
	component: KnowledgePage,
})

// ============================================================================
// Constants
// ============================================================================

const FILE_ATTACHMENT_ACCEPT = 'image/*,application/pdf'
const FILE_ATTACHMENT_MAX_FILES = 5
const FILE_ATTACHMENT_MAX_BYTES = 5_242_880
const SIDEBAR_COLLAPSED_STORAGE_KEY = 'folionote:knowledge:sidebarCollapsed'

const LazyChatHistoryPanel = lazy(async () => {
	const module = await import('@/features/knowledge/components/chat-history-panel')
	return { default: module.ChatHistoryPanel }
})

function preloadChatHistoryPanel(): void {
	import('@/features/knowledge/components/chat-history-panel').catch(() => {
		// Ignore preload failures; the regular lazy load will still run.
	})
}

const SUGGESTIONS = [
	'What are the latest trends in AI?',
	'How does machine learning work?',
	'Explain quantum computing',
	'Best practices for React development',
	'Tell me about TypeScript benefits',
	'How to optimize database queries?',
]

// ============================================================================
// WaitingIndicator
// ============================================================================

const WAITING_SHIMMER_DURATION = 1.4
const WAITING_SHIMMER_SPREAD = 3
const WAITING_LOADER_SIZE = 14

const WaitingIndicator = memo(function WaitingIndicator() {
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

// ============================================================================
// Tool rendering helpers
// ============================================================================

type ToolMessagePart = NonNullable<KnowledgeChatMessage['parts']>[number]

const TOOL_DETAILS_OPEN_STATES = new Set([
	'approval-requested',
	'output-error',
	'output-denied',
])

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
		return part.type
	}
	return 'Tool'
}

function getToolPartState(part: ToolMessagePart, isStreaming: boolean): string {
	if ('state' in part && typeof part.state === 'string') {
		return part.state
	}
	return isStreaming ? 'input-streaming' : 'input-available'
}

function getToolKey(messageId: string, part: ToolMessagePart): string {
	if ('toolCallId' in part && typeof part.toolCallId === 'string') {
		return part.toolCallId
	}
	const state =
		'state' in part && typeof part.state === 'string' ? part.state : 'tool'
	return `${messageId}-${part.type}-${state}`
}

type ToolApprovalInfo =
	| { id: string; approved?: never; reason?: never }
	| { id: string; approved: boolean; reason?: string }

function getToolApproval(part: ToolMessagePart): ToolApprovalInfo | undefined {
	if (
		!('approval' in part) ||
		typeof part.approval !== 'object' ||
		part.approval === null ||
		!('id' in part.approval)
	) {
		return undefined
	}
	const raw = part.approval as Record<string, unknown>
	const id = raw.id as string
	if (typeof raw.approved === 'boolean') {
		return {
			id,
			approved: raw.approved,
			reason: typeof raw.reason === 'string' ? raw.reason : undefined,
		}
	}
	return { id }
}

function isToolCardPart(part: ToolMessagePart): boolean {
	return (
		isDisplayWeatherPart(part) || isStockPricePart(part) || isStockTrendPart(part)
	)
}

// ============================================================================
// Inline tool calls
// ============================================================================

type ToolCallsProps = {
	messageId: string
	isStreaming: boolean
	tools: ToolMessagePart[]
	className?: string
	onToolApprovalResponse?: ToolApprovalHandler
}

const ToolCalls = memo(function ToolCalls({
	messageId,
	isStreaming,
	tools,
	className,
	onToolApprovalResponse,
}: ToolCallsProps) {
	const { t } = useTranslation()
	const detailedTools = tools.filter((tool) => !isToolCardPart(tool))

	if (detailedTools.length === 0) return null

	return (
		<div className={cn('space-y-2', className)}>
			{detailedTools.map((tool) => {
				const key = getToolKey(messageId, tool)
				const state = getToolPartState(tool, isStreaming)
				const label = getToolLabel(tool)
				const input = 'input' in tool ? tool.input : undefined
				const output = 'output' in tool ? tool.output : undefined
				const errorText =
					'errorText' in tool && typeof tool.errorText === 'string'
						? tool.errorText
						: undefined
				const defaultOpen = TOOL_DETAILS_OPEN_STATES.has(state)
				const approval = getToolApproval(tool)

				return (
					<Tool defaultOpen={defaultOpen} key={`detail-${key}`}>
						<ToolHeader label={label} state={state} />
						<ToolContent>
							{input !== undefined ? <ToolInput input={input} /> : null}
							<Confirmation
								approval={approval}
								state={state as Parameters<typeof Confirmation>[0]['state']}
							>
								<ConfirmationTitle>
									<ConfirmationRequest>
										{t('knowledge.toolApproval.description')}
									</ConfirmationRequest>
									<ConfirmationAccepted>
										<span className="flex items-center gap-1.5">
											<HugeiconsIcon
												className="size-4 text-emerald-600"
												icon={Tick02Icon}
											/>
											<span>{t('knowledge.toolApproval.accepted')}</span>
										</span>
									</ConfirmationAccepted>
									<ConfirmationRejected>
										<span className="flex items-center gap-1.5">
											<HugeiconsIcon
												className="size-4 text-destructive"
												icon={Cancel01Icon}
											/>
											<span>{t('knowledge.toolApproval.rejected')}</span>
										</span>
									</ConfirmationRejected>
								</ConfirmationTitle>
								{onToolApprovalResponse && approval ? (
									<ConfirmationActions>
										<ConfirmationAction
											onClick={() =>
												onToolApprovalResponse({
													id: approval.id,
													approved: false,
													reason: 'User rejected',
												})
											}
											variant="outline"
										>
											{t('knowledge.toolApproval.reject')}
										</ConfirmationAction>
										<ConfirmationAction
											onClick={() =>
												onToolApprovalResponse({
													id: approval.id,
													approved: true,
												})
											}
										>
											{t('knowledge.toolApproval.approve')}
										</ConfirmationAction>
									</ConfirmationActions>
								) : null}
							</Confirmation>
							{output !== undefined || errorText ? (
								<ToolOutput errorText={errorText} output={output} />
							) : null}
						</ToolContent>
					</Tool>
				)
			})}
		</div>
	)
})

// ============================================================================
// Chat message rendering
// ============================================================================

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

const ChatMessageItem = memo(function ChatMessageItem({
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
			{/* Reasoning + tool calls (assistant only) */}
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

			{/* Main message content */}
			{message.content ? (
				<Message from={message.role}>
					<MessageContent>
						<MessageResponse>{message.content}</MessageResponse>
					</MessageContent>
				</Message>
			) : null}

			{/* Tool card UIs (weather, stock, stock trend) */}
			{hasToolCards ? (
				<Message from="assistant">
					<MessageContent>
						<div className="grid gap-2">
							{toolCardParts.map((part) => {
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
					</MessageContent>
				</Message>
			) : null}
		</>
	)
})

// ============================================================================
// Attachment display in PromptInput header
// ============================================================================

function AttachmentDisplay() {
	const attachments = usePromptInputAttachments()

	if (attachments.files.length === 0) return null

	return (
		<PromptInputHeader className="gap-2 px-3 pt-2">
			<PromptInputAttachments>
				{(file) => <FileAttachmentChip file={file} onRemove={attachments.remove} />}
			</PromptInputAttachments>
		</PromptInputHeader>
	)
}

type FileAttachmentChipProps = {
	file: FileUIPart & { id: string }
	onRemove: (id: string) => void
}

function FileAttachmentChip({ file, onRemove }: FileAttachmentChipProps) {
	const handleRemove = useCallback(() => {
		onRemove(file.id)
	}, [onRemove, file.id])

	const isImage = file.mediaType?.startsWith('image/') && file.url
	const label = file.filename || (isImage ? 'Image' : 'Attachment')

	return (
		<PromptInputButton
			className="gap-1.5 rounded-lg px-2 text-xs"
			onClick={handleRemove}
			size="sm"
			variant="outline"
		>
			{isImage ? (
				<img
					alt={label}
					className="size-4 rounded-sm object-cover"
					height={16}
					src={file.url}
					width={16}
				/>
			) : null}
			<span className="max-w-24 truncate">{label}</span>
			<span className="text-muted-foreground">&times;</span>
		</PromptInputButton>
	)
}

// ============================================================================
// Thinking toggle
// ============================================================================

type ThinkingToggleProps = {
	thinkingActive: boolean
	thinkingEnabled: boolean
	hasToggleableReasoning: boolean
	onToggle: (enabled: boolean) => void
}

type ContextCompactBannerProps = {
	contextUsage: SessionContextUsage
	isCompacting: boolean
	onCompact: () => void
}

type ContextDetailRowProps = {
	label: string
	value: string
}

type ContextPopoverDetails = {
	maxTokens: number
	remainingTokens: number
	modelId: string
	status: SessionContextUsage['status']
	source: SessionContextUsage['source']
}

function formatCompactTokenCount(tokenCount: number): string {
	return new Intl.NumberFormat('en-US', {
		notation: 'compact',
	}).format(tokenCount)
}

function ContextDetailRow({ label, value }: ContextDetailRowProps) {
	return (
		<div className="flex items-center justify-between gap-3 text-xs">
			<span className="text-muted-foreground">{label}</span>
			<span className="max-w-52 truncate text-right font-mono">{value}</span>
		</div>
	)
}

function buildContextPopoverDetails(
	contextUsage: SessionContextUsage | null,
	selectedModel: string
): ContextPopoverDetails | null {
	if (!contextUsage) {
		return null
	}

	const remainingTokens =
		typeof contextUsage.remaining === 'number'
			? Math.max(0, contextUsage.remaining)
			: Math.max(0, contextUsage.maxTokens - contextUsage.usedTokens)

	return {
		maxTokens: contextUsage.maxTokens,
		remainingTokens,
		modelId: contextUsage.tokenlensModelId ?? selectedModel,
		status: contextUsage.status,
		source: contextUsage.source,
	}
}

type ContextPopoverDetailRowsProps = {
	contextPopoverDetails: ContextPopoverDetails | null
}

function ContextPopoverDetailRows({
	contextPopoverDetails,
}: ContextPopoverDetailRowsProps) {
	const { t } = useTranslation()

	if (!contextPopoverDetails) {
		return null
	}

	return (
		<div className="space-y-1.5 pb-1.5">
			<ContextDetailRow
				label={t('knowledge.contextUsageComponent.details.remaining')}
				value={`${formatCompactTokenCount(contextPopoverDetails.remainingTokens)} / ${formatCompactTokenCount(contextPopoverDetails.maxTokens)}`}
			/>
			<ContextDetailRow
				label={t('knowledge.contextUsageComponent.details.model')}
				value={`${contextPopoverDetails.modelId} (${formatCompactTokenCount(contextPopoverDetails.maxTokens)})`}
			/>
			<ContextDetailRow
				label={t('knowledge.contextUsageComponent.details.status')}
				value={t(
					`knowledge.contextUsageComponent.details.statusValue.${contextPopoverDetails.status}`
				)}
			/>
			<ContextDetailRow
				label={t('knowledge.contextUsageComponent.details.source')}
				value={t(
					`knowledge.contextUsageComponent.details.sourceValue.${contextPopoverDetails.source}`
				)}
			/>
		</div>
	)
}

type ContextUsagePopoverProps = {
	sessionContextUsage: SessionContextUsage | null
	selectedModel: string
	contextPopoverDetails: ContextPopoverDetails | null
}

function ContextUsagePopover({
	sessionContextUsage,
	selectedModel,
	contextPopoverDetails,
}: ContextUsagePopoverProps) {
	if (!sessionContextUsage || sessionContextUsage.usedTokens <= 0) {
		return null
	}

	return (
		<Context
			maxTokens={sessionContextUsage.maxTokens}
			modelId={sessionContextUsage.tokenlensModelId ?? selectedModel}
			usage={sessionContextUsage.sessionUsage}
			usedTokens={sessionContextUsage.usedTokens}
		>
			<ContextTrigger className="h-8 gap-1.5 rounded-lg px-2 text-xs" size="sm" />
			<ContextContent align="start" side="top">
				<ContextContentHeader />
				<ContextContentBody className="space-y-1.5">
					<ContextPopoverDetailRows contextPopoverDetails={contextPopoverDetails} />
					<ContextInputUsage />
					<ContextOutputUsage />
					<ContextReasoningUsage />
					<ContextCacheUsage />
				</ContextContentBody>
				<ContextContentFooter />
			</ContextContent>
		</Context>
	)
}

function ContextCompactBanner({
	contextUsage,
	isCompacting,
	onCompact,
}: ContextCompactBannerProps) {
	const { t } = useTranslation()

	if (!contextUsage.shouldCompact) return null

	return (
		<div
			className={cn(
				'mb-2 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs',
				contextUsage.status === 'compact'
					? 'border-destructive/60 bg-destructive/5 text-destructive'
					: 'border-yellow-500/50 bg-yellow-500/5 text-yellow-700 dark:text-yellow-400'
			)}
		>
			<p className="font-medium">
				{t('knowledge.compactMessage.banner', {
					percent: contextUsage.percent,
					tokens: contextUsage.tokensToCompact,
				})}
			</p>
			<Button
				className="h-7 px-2 text-xs"
				disabled={isCompacting}
				onClick={onCompact}
				size="sm"
				variant={contextUsage.status === 'compact' ? 'destructive' : 'outline'}
			>
				{isCompacting
					? t('knowledge.compactMessage.compacting')
					: t('knowledge.compactMessage.compactNow')}
			</Button>
		</div>
	)
}

function ThinkingToggle({
	thinkingActive,
	thinkingEnabled,
	hasToggleableReasoning,
	onToggle,
}: ThinkingToggleProps) {
	const { t } = useTranslation()

	const getTooltip = () => {
		if (hasToggleableReasoning) {
			return thinkingEnabled
				? t('knowledge.thinkingEnabled')
				: t('knowledge.enableThinking')
		}
		return t('knowledge.thinkingBuiltIn')
	}

	return (
		<Tooltip>
			<TooltipTrigger
				aria-label={t('knowledge.toggleThinking')}
				aria-pressed={thinkingActive}
				className={cn(
					'relative inline-flex size-8 items-center justify-center rounded-lg',
					'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
					'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
					'transition-all duration-200 ease-out active:scale-95 motion-reduce:transition-none',
					thinkingActive &&
						'bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20'
				)}
				disabled={!hasToggleableReasoning}
				onClick={() => hasToggleableReasoning && onToggle(!thinkingEnabled)}
				type="button"
			>
				<HugeiconsIcon className="size-4" icon={AiBrain01Icon} />
				{thinkingActive ? (
					<span className="absolute top-0.5 right-0.5 size-2 rounded-full bg-primary" />
				) : null}
			</TooltipTrigger>
			<TooltipContent side="top">
				<p>{getTooltip()}</p>
			</TooltipContent>
		</Tooltip>
	)
}

// ============================================================================
// useProviderApiKey - Extract API key resolution
// ============================================================================

function useProviderApiKey(selectedProvider: string) {
	const {
		isLoaded: isModelConfigLoaded,
		getProviderConfig: getModelProviderConfig,
	} = useModelProviderConfig()
	const {
		isLoaded: isAiProviderConfigLoaded,
		getProviderConfig: getAiProviderConfig,
	} = useAiProviderConfig()

	const apiProviderId = useMemo(
		() => mapProviderIdToApi(selectedProvider),
		[selectedProvider]
	)
	const providerConfig = useMemo(
		() => getModelProviderConfig(selectedProvider),
		[getModelProviderConfig, selectedProvider]
	)
	const apiProviderConfig = useMemo(
		() => getAiProviderConfig(apiProviderId),
		[getAiProviderConfig, apiProviderId]
	)
	const activeApiKey =
		providerConfig?.apiKey?.trim() || apiProviderConfig?.apiKey?.trim() || ''
	const activeBaseUrl =
		providerConfig?.baseUrl?.trim() ||
		apiProviderConfig?.baseUrl?.trim() ||
		undefined
	const hasApiKey =
		(isModelConfigLoaded || isAiProviderConfigLoaded) && Boolean(activeApiKey)

	return {
		apiProviderId,
		activeApiKey,
		activeBaseUrl,
		hasApiKey,
		isModelConfigLoaded,
	}
}

// ============================================================================
// Main page
// ============================================================================

function KnowledgePage() {
	const { t } = useTranslation()

	// ---- Provider & model config ----
	const { config } = useModelProviderConfig()
	const {
		providers: catalogProviders,
		models: catalogModels,
		isLoaded: isCatalogLoaded,
	} = useAiModelCatalog()
	const { lastUsedProvider, lastUsedModel, saveLastUsed } = useLastUsedModel()

	const [selectedProvider, setSelectedProvider] = useState(config.defaultProvider)
	const [selectedModel, setSelectedModel] = useState(config.defaultModel ?? '')
	const [thinkingEnabled, setThinkingEnabled] = useState(false)
	const [inputValue, setInputValue] = useState('')
	const [isHistoryCollapsed, setIsHistoryCollapsed] = useState<boolean>(() => {
		if (typeof window === 'undefined') return false
		return localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY) === 'true'
	})
	const [isMobileHistoryOpen, setMobileHistoryOpen] = useState(false)
	const loadedChatIdRef = useRef<string | null>(null)
	const autoCompactKeyRef = useRef<string | null>(null)

	const {
		sessions,
		selectedChatId,
		isLoading: isSessionsLoading,
		error: sessionsError,
		refreshSessions,
		selectChat,
		createChat,
		deleteChat,
		deleteEmptyChat,
		isSessionEmpty,
	} = useChatSessions({
		autoLoad: true,
		autoCreateIfEmpty: true,
	})

	// ---- Resolve API key ----
	const {
		apiProviderId,
		activeApiKey,
		activeBaseUrl,
		hasApiKey,
		isModelConfigLoaded,
	} = useProviderApiKey(selectedProvider)

	const handleMessageComplete = useCallback(async () => {
		await refreshSessions()
	}, [refreshSessions])

	// ---- Chat hook ----
	const {
		messages,
		isStreaming,
		isLoading,
		isCompacting,
		error: chatError,
		sendMessage,
		compactContext,
		addToolApprovalResponse,
		clearMessages,
		loadMessages,
		resetChat,
	} = useKnowledgeChat({
		chatId: selectedChatId ?? '',
		provider: apiProviderId,
		apiKey: activeApiKey,
		baseUrl: activeBaseUrl,
		model: selectedModel.trim() || '',
		enableReasoning: thinkingEnabled,
		onMessageComplete: handleMessageComplete,
	})

	const isPending = isStreaming || isLoading || isCompacting
	const firstSessionId = sessions[0]?.chatId

	const getErrorMessage = useCallback(
		(error: unknown): string =>
			error instanceof Error ? error.message : t('knowledge.requestFailed'),
		[t]
	)

	// ---- Model selection helpers ----
	const getEnabledChatModels = useCallback(
		(providerId: string) =>
			catalogModels.filter(
				(m) => m.providerId === providerId && m.type === 'chat' && m.enabled
			),
		[catalogModels]
	)

	const findValidProviderAndModel = useCallback(
		(
			currentProvider: string,
			currentModel: string
		): { provider: string; model: string } => {
			const enabledModels = getEnabledChatModels(currentProvider)
			if (enabledModels.length > 0) {
				if (enabledModels.some((m) => m.id === currentModel)) {
					return { provider: currentProvider, model: currentModel }
				}
				return { provider: currentProvider, model: enabledModels[0]?.id ?? '' }
			}
			for (const provider of catalogProviders) {
				const models = getEnabledChatModels(provider.id)
				const first = models[0]
				if (first) return { provider: provider.id, model: first.id }
			}
			return { provider: currentProvider, model: '' }
		},
		[getEnabledChatModels, catalogProviders]
	)

	useEffect(() => {
		if (!(isModelConfigLoaded && isCatalogLoaded)) return
		const preferredProvider = lastUsedProvider || config.defaultProvider
		const preferredModel = lastUsedModel || config.defaultModel || ''
		const { provider, model } = findValidProviderAndModel(
			preferredProvider,
			preferredModel
		)
		setSelectedProvider(provider)
		setSelectedModel(model)
	}, [
		isModelConfigLoaded,
		isCatalogLoaded,
		config.defaultProvider,
		config.defaultModel,
		lastUsedProvider,
		lastUsedModel,
		findValidProviderAndModel,
	])

	// ---- Model info for thinking ----
	const selectedModelInfo = useMemo(
		() =>
			catalogModels.find(
				(m) => m.providerId === selectedProvider && m.id === selectedModel
			),
		[catalogModels, selectedProvider, selectedModel]
	)
	const supportsThinking = Boolean(selectedModelInfo?.reasoning)
	const hasToggleableReasoning = Boolean(
		selectedModelInfo?.settings?.extendParams?.includes('enableReasoning')
	)
	const thinkingActive = hasToggleableReasoning ? thinkingEnabled : true
	const sessionContextUsage = useSessionContextUsage({
		messages,
		providerId: selectedProvider,
		modelId: selectedModel,
		modelContextWindowTokens: selectedModelInfo?.contextWindowTokens,
	})

	useEffect(() => {
		if (!supportsThinking) {
			setThinkingEnabled(false)
			return
		}
		if (hasToggleableReasoning) return
		setThinkingEnabled(true)
	}, [supportsThinking, hasToggleableReasoning])

	useEffect(() => {
		if (chatError) {
			toast.error(chatError.message || t('knowledge.requestFailed'))
		}
	}, [chatError, t])

	useEffect(() => {
		if (sessionsError) {
			toast.error(sessionsError.message || t('knowledge.requestFailed'))
		}
	}, [sessionsError, t])

	useEffect(() => {
		if (typeof window === 'undefined') return
		localStorage.setItem(
			SIDEBAR_COLLAPSED_STORAGE_KEY,
			isHistoryCollapsed ? 'true' : 'false'
		)
	}, [isHistoryCollapsed])

	useEffect(() => {
		if (!selectedChatId) {
			loadedChatIdRef.current = null
			autoCompactKeyRef.current = null
			clearMessages()
			return
		}

		if (loadedChatIdRef.current === selectedChatId) return

		loadedChatIdRef.current = selectedChatId
		loadMessages(selectedChatId).catch((error: unknown) => {
			loadedChatIdRef.current = null
			toast.error(getErrorMessage(error))
		})
	}, [selectedChatId, clearMessages, loadMessages, getErrorMessage])

	useEffect(() => {
		autoCompactKeyRef.current = null
	}, [selectedChatId])

	useEffect(() => {
		if (!selectedChatId) return
		if (!sessionContextUsage?.shouldCompact) return
		if (isPending || isCompacting) return

		const autoCompactKey = [
			selectedChatId,
			messages.length,
			sessionContextUsage.tokensToCompact,
		].join(':')
		if (autoCompactKeyRef.current === autoCompactKey) return
		autoCompactKeyRef.current = autoCompactKey

		compactContext({
			tokensToCompact: sessionContextUsage.tokensToCompact,
		})
			.then((result) => {
				if (!result) return
				toast.success(
					t('knowledge.compactMessage.success', {
						count: result.compactedCount,
					})
				)
			})
			.catch((error: unknown) => {
				toast.error(getErrorMessage(error))
			})
	}, [
		compactContext,
		getErrorMessage,
		isCompacting,
		isPending,
		messages.length,
		selectedChatId,
		sessionContextUsage,
		t,
	])

	useEffect(() => {
		if (isSessionsLoading || selectedChatId) return

		if (firstSessionId) {
			selectChat(firstSessionId)
			return
		}

		createChat()
			.then((newChatId) => {
				loadedChatIdRef.current = newChatId
				resetChat(newChatId)
			})
			.catch((error: unknown) => {
				toast.error(getErrorMessage(error))
			})
	}, [
		isSessionsLoading,
		selectedChatId,
		firstSessionId,
		selectChat,
		createChat,
		resetChat,
		getErrorMessage,
	])

	// ---- Handlers ----
	const handleModelChange = useCallback(
		(modelId: string, providerId?: string) => {
			const matchedProviderId =
				providerId ??
				catalogModels.find((m) => m.id === modelId)?.providerId ??
				selectedProvider
			setSelectedProvider(matchedProviderId)
			setSelectedModel(modelId)
			saveLastUsed(matchedProviderId, modelId)
		},
		[catalogModels, selectedProvider, saveLastUsed]
	)

	const handleSelectChat = useCallback(
		(chatSessionId: string) => {
			if (isPending || chatSessionId === selectedChatId) {
				setMobileHistoryOpen(false)
				return
			}

			selectChat(chatSessionId)
			setMobileHistoryOpen(false)
		},
		[isPending, selectedChatId, selectChat]
	)

	const handleNewChat = useCallback(async () => {
		if (isPending) return

		try {
			if (selectedChatId && isSessionEmpty(selectedChatId)) {
				await deleteEmptyChat(selectedChatId)
			}

			const newChatId = await createChat()
			loadedChatIdRef.current = newChatId
			resetChat(newChatId)
			setInputValue('')
			setMobileHistoryOpen(false)
		} catch (error: unknown) {
			toast.error(getErrorMessage(error))
		}
	}, [
		isPending,
		selectedChatId,
		isSessionEmpty,
		deleteEmptyChat,
		createChat,
		resetChat,
		getErrorMessage,
	])

	const handleDeleteChat = useCallback(
		async (chatSessionId: string) => {
			if (isPending) return

			try {
				const wasDeleted = await deleteChat(chatSessionId)
				if (!wasDeleted) return

				if (chatSessionId === selectedChatId) {
					loadedChatIdRef.current = null
					clearMessages()
				}

				setMobileHistoryOpen(false)
				await refreshSessions()
			} catch (error: unknown) {
				toast.error(getErrorMessage(error))
			}
		},
		[
			isPending,
			deleteChat,
			selectedChatId,
			clearMessages,
			refreshSessions,
			getErrorMessage,
		]
	)

	const handleDesktopHistoryToggle = useCallback(() => {
		setIsHistoryCollapsed((isCollapsed) => !isCollapsed)
	}, [])

	const handleOpenMobileHistory = useCallback(() => {
		setMobileHistoryOpen(true)
	}, [])

	const handleCompactNow = useCallback(() => {
		if (!sessionContextUsage || isPending || isCompacting) return
		compactContext({
			tokensToCompact: sessionContextUsage.tokensToCompact,
		})
			.then((result) => {
				if (!result) return
				toast.success(
					t('knowledge.compactMessage.success', {
						count: result.compactedCount,
					})
				)
			})
			.catch((error: unknown) => {
				toast.error(getErrorMessage(error))
			})
	}, [
		compactContext,
		getErrorMessage,
		isCompacting,
		isPending,
		sessionContextUsage,
		t,
	])

	const handleSubmit = useCallback(
		(message: PromptInputMessage) => {
			const trimmedText = message.text.trim()
			const hasFiles = message.files.length > 0
			if (!(trimmedText || hasFiles) || isPending || !selectedChatId) return

			if (!isApiSupportedProvider(selectedProvider)) {
				toast.error(`Provider "${selectedProvider}" is not yet supported by the API`)
				return
			}

			const promptText = trimmedText || t('knowledge.attachmentFallback')
			setInputValue('')
			sendMessage({ text: promptText, files: message.files })
		},
		[isPending, selectedChatId, selectedProvider, sendMessage, t]
	)

	const handleSuggestionClick = useCallback(
		(suggestion: string) => {
			if (isPending || !selectedChatId) return
			if (!isApiSupportedProvider(selectedProvider)) {
				toast.error(`Provider "${selectedProvider}" is not yet supported by the API`)
				return
			}
			setInputValue('')
			sendMessage({ text: suggestion })
		},
		[isPending, selectedChatId, selectedProvider, sendMessage]
	)

	const handleTextChange = useCallback(
		(e: React.ChangeEvent<HTMLTextAreaElement>) => {
			setInputValue(e.target.value)
		},
		[]
	)

	// ---- Waiting state ----
	const showWaiting = useMemo(() => {
		if (!isPending) return false
		return !messages.some(
			(m) =>
				m.isStreaming &&
				(m.content.length > 0 ||
					(m.thinking?.length ?? 0) > 0 ||
					(m.parts ?? []).some(isToolInvocationPart))
		)
	}, [isPending, messages])

	const isInputDisabled = isPending || !hasApiKey || !selectedChatId
	const contextPopoverDetails = useMemo(
		() => buildContextPopoverDetails(sessionContextUsage, selectedModel),
		[sessionContextUsage, selectedModel]
	)

	return (
		<div className="relative flex h-svh overflow-hidden">
			<Sheet onOpenChange={setMobileHistoryOpen} open={isMobileHistoryOpen}>
				<SheetContent
					className="w-[85vw] max-w-[320px] p-0 sm:w-[320px]"
					side="left"
				>
					<SheetHeader className="sr-only">
						<SheetTitle>{t('knowledge.chatHistory')}</SheetTitle>
					</SheetHeader>
					<Suspense
						fallback={
							<div className="h-full space-y-2 border-r bg-background p-3">
								<div className="h-10 rounded-lg bg-muted/60" />
								<div className="h-18 rounded-lg bg-muted/40" />
								<div className="h-18 rounded-lg bg-muted/40" />
							</div>
						}
					>
						<LazyChatHistoryPanel
							className="h-full border-r-0"
							isLoading={isSessionsLoading}
							onDeleteChat={handleDeleteChat}
							onNewChat={handleNewChat}
							onSelectChat={handleSelectChat}
							selectedChatId={selectedChatId}
							sessions={sessions}
						/>
					</Suspense>
				</SheetContent>
			</Sheet>

			{isHistoryCollapsed ? null : (
				<div className="hidden h-full w-[280px] shrink-0 md:block">
					<Suspense
						fallback={
							<div className="h-full space-y-2 border-r bg-background p-3">
								<div className="h-10 rounded-lg bg-muted/60" />
								<div className="h-18 rounded-lg bg-muted/40" />
								<div className="h-18 rounded-lg bg-muted/40" />
							</div>
						}
					>
						<LazyChatHistoryPanel
							className="h-full"
							isLoading={isSessionsLoading}
							onDeleteChat={handleDeleteChat}
							onNewChat={handleNewChat}
							onSelectChat={handleSelectChat}
							selectedChatId={selectedChatId}
							sessions={sessions}
						/>
					</Suspense>
				</div>
			)}

			<div className="flex min-w-0 flex-1 flex-col divide-y overflow-hidden">
				<div className="flex items-center justify-between gap-2 px-4 py-2">
					<Button
						className="inline-flex gap-2 md:hidden"
						onClick={handleOpenMobileHistory}
						onFocus={preloadChatHistoryPanel}
						onMouseEnter={preloadChatHistoryPanel}
						size="sm"
						variant="outline"
					>
						<HugeiconsIcon className="size-4" icon={SidebarLeftIcon} />
						<span>{t('knowledge.chatHistory')}</span>
					</Button>
					<Button
						className="hidden gap-2 md:inline-flex"
						onClick={handleDesktopHistoryToggle}
						onFocus={preloadChatHistoryPanel}
						onMouseEnter={preloadChatHistoryPanel}
						size="sm"
						variant="outline"
					>
						<HugeiconsIcon className="size-4" icon={SidebarLeftIcon} />
						<span>{t('knowledge.chatHistory')}</span>
					</Button>

					<Button
						className="inline-flex gap-2"
						disabled={isPending}
						onClick={handleNewChat}
						size="sm"
						variant="ghost"
					>
						<HugeiconsIcon className="size-4" icon={MessageAdd01Icon} />
						<span>{t('knowledge.newChat')}</span>
					</Button>
				</div>

				<div className="flex min-h-0 flex-1 flex-col divide-y overflow-hidden">
					{/* Conversation area */}
					<Conversation>
						<ConversationContent className="gap-4 p-4">
							{messages.length > 0 ? (
								<>
									{sessionContextUsage ? (
										<ContextCompactBanner
											contextUsage={sessionContextUsage}
											isCompacting={isCompacting}
											onCompact={handleCompactNow}
										/>
									) : null}
									{messages.map((message) => (
										<Fragment key={message.id}>
											{message.compactInfo ? (
												<CompactMessage
													compactInfo={message.compactInfo}
													summary={message.content}
												/>
											) : (
												<ChatMessageItem
													message={message}
													onToolApprovalResponse={addToolApprovalResponse}
													thinkingEnabled={thinkingEnabled}
												/>
											)}
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

					{/* Bottom: suggestions + input */}
					<div className="grid shrink-0 gap-4 pt-4">
						{messages.length === 0 ? (
							<Suggestions className="px-4">
								{SUGGESTIONS.map((suggestion) => (
									<Suggestion
										key={suggestion}
										onClick={handleSuggestionClick}
										suggestion={suggestion}
									/>
								))}
							</Suggestions>
						) : null}

						<div className="w-full px-4 pb-4">
							<PromptInput
								accept={FILE_ATTACHMENT_ACCEPT}
								className="rounded-xl transition-shadow duration-200 focus-within:ring-2 focus-within:ring-primary/20 focus-within:ring-offset-2 focus-within:ring-offset-background motion-reduce:transition-none"
								globalDrop
								maxFileSize={FILE_ATTACHMENT_MAX_BYTES}
								maxFiles={FILE_ATTACHMENT_MAX_FILES}
								multiple
								onError={(error) => {
									toast.error(error.message)
								}}
								onSubmit={handleSubmit}
							>
								<AttachmentDisplay />
								<PromptInputBody>
									<PromptInputTextarea
										disabled={isInputDisabled}
										onChange={handleTextChange}
										placeholder={
											hasApiKey
												? t('knowledge.inputPlaceholder')
												: t('knowledge.configureApiKeyFirst')
										}
										value={inputValue}
									/>
								</PromptInputBody>
								<PromptInputFooter className="px-3">
									<PromptInputTools>
										<PromptInputActionMenu>
											<PromptInputActionMenuTrigger
												aria-label={t('knowledge.addAttachments')}
												disabled={isInputDisabled}
											/>
											<PromptInputActionMenuContent>
												<PromptInputActionAddAttachments
													label={t('knowledge.addAttachments')}
												/>
											</PromptInputActionMenuContent>
										</PromptInputActionMenu>

										<AiModelSelector
											catalogModels={catalogModels}
											catalogProviders={catalogProviders}
											className="h-8 w-auto gap-2 rounded-lg border-0 px-3 text-xs shadow-none transition-colors duration-200 hover:bg-accent/80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 motion-reduce:transition-none"
											disabled={isInputDisabled}
											onValueChange={handleModelChange}
											placeholder={t('knowledge.selectModel')}
											value={selectedModel}
										/>

										{supportsThinking ? (
											<ThinkingToggle
												hasToggleableReasoning={hasToggleableReasoning}
												onToggle={setThinkingEnabled}
												thinkingActive={thinkingActive}
												thinkingEnabled={thinkingEnabled}
											/>
										) : null}

										<Link className="contents" to="/settings/models">
											<PromptInputButton
												aria-label={t('knowledge.configuration')}
												variant="ghost"
											>
												<HugeiconsIcon className="size-4" icon={Setting06Icon} />
											</PromptInputButton>
										</Link>
									</PromptInputTools>

									<div className="flex items-center gap-1">
										<ContextUsagePopover
											contextPopoverDetails={contextPopoverDetails}
											selectedModel={selectedModel}
											sessionContextUsage={sessionContextUsage}
										/>

										<PromptInputSubmit
											aria-label={t('knowledge.send')}
											className={cn(
												'transition-colors duration-200 motion-reduce:transition-none',
												isPending
													? 'animate-pulse motion-reduce:animate-none'
													: 'hover:bg-primary/90'
											)}
											disabled={isInputDisabled}
											status={isPending ? 'submitted' : 'ready'}
										/>
									</div>
								</PromptInputFooter>
							</PromptInput>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
