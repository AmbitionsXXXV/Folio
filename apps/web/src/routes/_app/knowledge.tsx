import {
	AiBrain01Icon,
	Alert02Icon,
	ArrowDown01Icon,
	MessageAdd01Icon,
	Setting06Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { useStickToBottom } from 'use-stick-to-bottom'
import { type AttachedNote, ChatInput } from '@/components/ai-elements/chat-input'
import { renderTextWithMentions } from '@/components/ai-elements/mention-badge'
import { Message, MessageContent, MessageResponse } from '@/components/chat-message'
import { EntryPicker, type EntryPickerRef } from '@/components/entry-picker'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Spinner } from '@/components/ui/spinner'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useAiModelCatalog } from '@/hooks/use-ai-model-catalog'
import { useLastUsedModel } from '@/hooks/use-last-used-model'
import { useModelProviderConfig } from '@/hooks/use-model-provider-config'
import { type ChatMessageInput, useStreamText } from '@/hooks/use-stream-text'
import { cn } from '@/lib/utils'
import type { Entry } from '@/types'

// API-compatible provider IDs (subset that the backend supports)
// These map to the old provider IDs that the API expects
type ApiProviderId = 'openai' | 'deepseek' | 'gemini' | 'claude' | 'qwen'
const API_SUPPORTED_PROVIDERS: ApiProviderId[] = [
	'openai',
	'deepseek',
	'gemini',
	'claude',
	'qwen',
]

// Map new model-list provider IDs to old API provider IDs
const PROVIDER_ID_MAPPING: Record<string, ApiProviderId> = {
	openai: 'openai',
	anthropic: 'claude',
	google: 'gemini',
	deepseek: 'deepseek',
	qwen: 'qwen',
	xai: 'deepseek', // xAI maps to deepseek for now (both use similar API)
}

function isApiSupportedProvider(id: string): id is ApiProviderId {
	const mappedId = PROVIDER_ID_MAPPING[id] || id
	return API_SUPPORTED_PROVIDERS.includes(mappedId as ApiProviderId)
}

function mapProviderIdToApi(id: string): ApiProviderId {
	const mappedId = PROVIDER_ID_MAPPING[id] || id
	if (!API_SUPPORTED_PROVIDERS.includes(mappedId as ApiProviderId)) {
		throw new Error(`Provider "${id}" is not supported by the API`)
	}
	return mappedId as ApiProviderId
}

export const Route = createFileRoute('/_app/knowledge')({
	component: KnowledgePage,
})

type ChatMessage = {
	id: string
	role: 'user' | 'assistant'
	content: string
	timestamp: Date
	/** Whether this message is currently being streamed */
	isStreaming?: boolean
	/** Thinking/reasoning content (for models that support extended thinking) */
	thinking?: string
	/** Token usage from the AI provider */
	usage?: {
		inputTokens?: number
		outputTokens?: number
		totalTokens?: number
		reasoningTokens?: number
		costUSD?: number
	}
}

// ============================================================================
// Token Estimation Utilities
// ============================================================================

/** Approximate characters per token (conservative estimate) */
const CHARS_PER_TOKEN = 4

/** Estimate token count from text */
function estimateTokenCount(text: string): number {
	return Math.ceil(text.length / CHARS_PER_TOKEN)
}

/** Calculate total estimated tokens for all messages */
function calculateTotalTokens(messages: ChatMessage[]): number {
	return messages.reduce((total, msg) => {
		const contentTokens = estimateTokenCount(msg.content)
		const thinkingTokens = msg.thinking ? estimateTokenCount(msg.thinking) : 0
		return total + contentTokens + thinkingTokens
	}, 0)
}

/** Context usage percentage thresholds */
const CONTEXT_WARNING_THRESHOLD = 80
const CONTEXT_CRITICAL_THRESHOLD = 95

function KnowledgePage() {
	const { t } = useTranslation()
	const { config, isLoaded, configuredProviders, getProviderConfig } =
		useModelProviderConfig()

	// Model catalog for enabled models
	const {
		providers: catalogProviders,
		models: catalogModels,
		isLoaded: isCatalogLoaded,
	} = useAiModelCatalog()

	// Last used model from localStorage
	const { lastUsedProvider, lastUsedModel, saveLastUsed } = useLastUsedModel()

	// Selected provider & model for this session
	const [selectedProvider, setSelectedProvider] = useState(config.defaultProvider)
	const [selectedModel, setSelectedModel] = useState(config.defaultModel ?? '')

	// Chat state
	const [messages, setMessages] = useState<ChatMessage[]>([])
	const [inputValue, setInputValue] = useState('')
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	// Thinking/reasoning toggle state
	const [thinkingEnabled, setThinkingEnabled] = useState(false)

	// Attached notes state
	const [attachedNotes, setAttachedNotes] = useState<AttachedNote[]>([])
	const entryPickerRef = useRef<EntryPickerRef>(null)

	// Get enabled chat models for a provider
	const getEnabledChatModels = useCallback(
		(providerId: string) => {
			return catalogModels.filter(
				(m) => m.providerId === providerId && m.type === 'chat' && m.enabled
			)
		},
		[catalogModels]
	)

	// Find fallback provider and model when current selection is invalid
	const findValidProviderAndModel = useCallback(
		(
			currentProvider: string,
			currentModel: string
		): { provider: string; model: string } => {
			const enabledModels = getEnabledChatModels(currentProvider)

			// Current provider has enabled models
			if (enabledModels.length > 0) {
				const modelStillEnabled = enabledModels.some((m) => m.id === currentModel)
				if (modelStillEnabled) {
					return { provider: currentProvider, model: currentModel }
				}
				return {
					provider: currentProvider,
					model: enabledModels[0]?.id ?? '',
				}
			}

			// Find first provider with enabled models
			for (const provider of catalogProviders) {
				const models = getEnabledChatModels(provider.id)
				const firstModel = models[0]
				if (firstModel) {
					return { provider: provider.id, model: firstModel.id }
				}
			}

			return { provider: currentProvider, model: '' }
		},
		[getEnabledChatModels, catalogProviders]
	)

	// Sync with loaded config and validate against enabled models
	// Prefer last used model from localStorage
	useEffect(() => {
		if (!(isLoaded && isCatalogLoaded)) return

		// Prioritize last used model if available
		const preferredProvider = lastUsedProvider || config.defaultProvider
		const preferredModel = lastUsedModel || config.defaultModel || ''

		const { provider, model } = findValidProviderAndModel(
			preferredProvider,
			preferredModel
		)
		setSelectedProvider(provider)
		setSelectedModel(model)
	}, [
		isLoaded,
		isCatalogLoaded,
		config.defaultProvider,
		config.defaultModel,
		lastUsedProvider,
		lastUsedModel,
		findValidProviderAndModel,
	])

	// When provider changes, ensure selected model is valid
	const handleProviderChange = useCallback(
		(providerId: string) => {
			setSelectedProvider(providerId)
			// Reset model when provider changes
			const enabledModels = getEnabledChatModels(providerId)
			const newModel = enabledModels[0]?.id ?? ''
			setSelectedModel(newModel)
			// Save to localStorage
			saveLastUsed(providerId, newModel)
		},
		[getEnabledChatModels, saveLastUsed]
	)

	// When model changes, save to localStorage
	const handleModelChange = useCallback(
		(modelId: string) => {
			setSelectedModel(modelId)
			// Save to localStorage
			saveLastUsed(selectedProvider, modelId)
		},
		[selectedProvider, saveLastUsed]
	)

	const providerConfig = useMemo(
		() => getProviderConfig(selectedProvider),
		[getProviderConfig, selectedProvider]
	)

	const hasApiKey = Boolean(providerConfig?.apiKey?.trim())

	// Streaming text generation
	const {
		stream,
		isStreaming,
		text: streamingText,
		thinking: streamingThinking,
		usage: streamingUsage,
		error: streamError,
		reset: resetStream,
	} = useStreamText()

	// Track the streaming message ID
	const streamingMessageIdRef = useRef<string | null>(null)

	// Update the streaming message content as text and thinking come in
	useEffect(() => {
		if (streamingMessageIdRef.current && (streamingText || streamingThinking)) {
			setMessages((prev) =>
				prev.map((msg) =>
					msg.id === streamingMessageIdRef.current
						? {
								...msg,
								content: streamingText,
								thinking: streamingThinking || undefined,
							}
						: msg
				)
			)
		}
	}, [streamingText, streamingThinking])

	// Handle stream completion - update with usage info from tokenlens
	useEffect(() => {
		if (!isStreaming && streamingMessageIdRef.current) {
			const messageId = streamingMessageIdRef.current
			// Mark the message as no longer streaming and add usage info
			setMessages((prev) =>
				prev.map((msg) => {
					if (msg.id !== messageId) return msg

					return {
						...msg,
						isStreaming: false,
						usage: streamingUsage
							? {
									inputTokens: streamingUsage.inputTokens,
									outputTokens: streamingUsage.outputTokens,
									totalTokens: streamingUsage.totalTokens,
									reasoningTokens: streamingUsage.reasoningTokens,
									costUSD: streamingUsage.costUSD,
								}
							: undefined,
					}
				})
			)
			streamingMessageIdRef.current = null
		}
	}, [isStreaming, streamingUsage])

	// Handle stream error
	useEffect(() => {
		if (streamError) {
			toast.error(streamError.message || t('knowledge.requestFailed'))
			// Remove the failed streaming message
			if (streamingMessageIdRef.current) {
				setMessages((prev) =>
					prev.filter((msg) => msg.id !== streamingMessageIdRef.current)
				)
				streamingMessageIdRef.current = null
			}
		}
	}, [streamError, t])

	// Attachment handlers
	const handleAtTrigger = useCallback(() => {
		entryPickerRef.current?.open()
	}, [])

	const handleEntrySelect = useCallback(
		(entry: Entry) => {
			// Add the note to attachments if not already attached
			setAttachedNotes((prev) => {
				if (prev.some((n) => n.id === entry.id)) {
					return prev
				}
				return [
					...prev,
					{
						id: entry.id,
						title: entry.title || '',
					},
				]
			})

			// Insert @note title at cursor position in textarea
			if (textareaRef.current) {
				const textarea = textareaRef.current
				const start = textarea.selectionStart
				const end = textarea.selectionEnd
				const text = inputValue
				const noteTitle = entry.title || t('entryPicker.untitled')
				const insertText = `@${noteTitle} `

				// If triggered by @, we want to replace the @ character
				// Check if the character before cursor is @
				const isAtTrigger = start > 0 && text[start - 1] === '@'
				const replaceStart = isAtTrigger ? start - 1 : start

				const newValue = text.slice(0, replaceStart) + insertText + text.slice(end)
				setInputValue(newValue)

				// Move cursor to after inserted text
				setTimeout(() => {
					const newPosition = replaceStart + insertText.length
					textarea.setSelectionRange(newPosition, newPosition)
					textarea.focus()
				}, 0)
			}
		},
		[inputValue, t]
	)

	const handleRemoveAttachment = useCallback((noteId: string) => {
		setAttachedNotes((prev) => prev.filter((n) => n.id !== noteId))
	}, [])

	// Get selected model info for context window
	const selectedModelInfo = useMemo(() => {
		return catalogModels.find(
			(m) => m.providerId === selectedProvider && m.id === selectedModel
		)
	}, [catalogModels, selectedProvider, selectedModel])

	// Calculate context usage
	const contextUsage = useMemo(() => {
		const contextWindow = selectedModelInfo?.contextWindowTokens ?? 128_000
		const usedTokens = calculateTotalTokens(messages)
		const percent = Math.min(100, Math.round((usedTokens / contextWindow) * 100))
		return {
			used: usedTokens,
			total: contextWindow,
			percent,
			isWarning: percent >= CONTEXT_WARNING_THRESHOLD,
			isExceeded: percent >= CONTEXT_CRITICAL_THRESHOLD,
		}
	}, [messages, selectedModelInfo])

	// State for context exceeded dialog
	const [showContextExceededDialog, setShowContextExceededDialog] = useState(false)

	const handleSendMessage = useCallback(() => {
		const trimmedInput = inputValue.trim()
		if (!trimmedInput || isStreaming) return

		// Only API-supported providers can be used for text generation
		if (!isApiSupportedProvider(selectedProvider)) {
			toast.error(`Provider "${selectedProvider}" is not yet supported by the API`)
			return
		}

		// Check if context would be exceeded with new message
		const newMessageTokens = estimateTokenCount(trimmedInput)
		const projectedUsage = contextUsage.used + newMessageTokens
		const contextWindow = selectedModelInfo?.contextWindowTokens ?? 128_000
		const projectedPercent = Math.round((projectedUsage / contextWindow) * 100)

		if (projectedPercent >= CONTEXT_CRITICAL_THRESHOLD) {
			setShowContextExceededDialog(true)
			return
		}

		const userMessage: ChatMessage = {
			id: crypto.randomUUID(),
			role: 'user',
			content: trimmedInput,
			timestamp: new Date(),
		}

		// Create a placeholder message for the assistant response
		const assistantMessageId = crypto.randomUUID()
		const assistantMessage: ChatMessage = {
			id: assistantMessageId,
			role: 'assistant',
			content: '',
			timestamp: new Date(),
			isStreaming: true,
		}

		streamingMessageIdRef.current = assistantMessageId
		const updatedMessages = [...messages, userMessage, assistantMessage]
		setMessages(updatedMessages)
		setInputValue('')

		// Collect attached note IDs for the request
		const noteEntryIds = attachedNotes.map((n) => n.id)

		// Clear attachments after sending
		setAttachedNotes([])

		// Build conversation history for context continuity
		// Include all previous messages (excluding the current streaming placeholder)
		const conversationHistory: ChatMessageInput[] = [...messages, userMessage].map(
			(msg) => ({
				role: msg.role,
				content: msg.content,
			})
		)

		const apiProviderId = mapProviderIdToApi(selectedProvider)
		stream({
			provider: apiProviderId,
			apiKey: providerConfig?.apiKey ?? '',
			baseUrl: providerConfig?.baseUrl?.trim() || undefined,
			model: selectedModel.trim() || undefined,
			prompt: trimmedInput,
			messages: conversationHistory,
			noteEntryIds: noteEntryIds.length > 0 ? noteEntryIds : undefined,
			enableReasoning: thinkingEnabled,
		})
	}, [
		inputValue,
		isStreaming,
		selectedProvider,
		providerConfig,
		selectedModel,
		stream,
		attachedNotes,
		thinkingEnabled,
		messages,
		contextUsage,
		selectedModelInfo,
	])

	const handleNewChat = useCallback(() => {
		resetStream()
		setMessages([])
		setInputValue('')
		setAttachedNotes([])
	}, [resetStream])

	const isPending = isStreaming

	return (
		<div className="container mx-auto flex h-[calc(100dvh-4rem)] max-w-4xl flex-col px-4 py-4">
			{/* Header */}
			<div className="mb-4 flex items-center justify-between">
				<div className="flex items-center gap-3">
					<div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
						<HugeiconsIcon className="size-6 text-primary" icon={AiBrain01Icon} />
					</div>
					<div>
						<h1 className="text-balance font-semibold text-lg">
							{t('knowledge.title')}
						</h1>
						<p className="text-pretty text-muted-foreground text-sm">
							{t('knowledge.subtitle')}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					{/* Context Usage Indicator */}
					{messages.length > 0 && (
						<ContextUsageIndicator
							contextUsage={contextUsage}
							onNewChat={handleNewChat}
						/>
					)}
					<Link to="/settings/models">
						<Button size="sm" variant="ghost">
							<HugeiconsIcon className="size-4" icon={Setting06Icon} />
						</Button>
					</Link>
					<Button onClick={handleNewChat} size="sm" variant="outline">
						<HugeiconsIcon className="mr-2 size-4" icon={MessageAdd01Icon} />
						{t('knowledge.newChat')}
					</Button>
				</div>
			</div>

			{/* Context Exceeded Dialog */}
			<AlertDialog
				onOpenChange={setShowContextExceededDialog}
				open={showContextExceededDialog}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className="flex items-center gap-2">
							<HugeiconsIcon
								className="size-5 text-destructive"
								icon={Alert02Icon}
							/>
							{t('knowledge.contextExceeded')}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t('knowledge.contextExceededDescription')}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogAction
							onClick={() => {
								setShowContextExceededDialog(false)
								handleNewChat()
							}}
						>
							<HugeiconsIcon className="mr-2 size-4" icon={MessageAdd01Icon} />
							{t('knowledge.startNewChat')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>

			{/* Chat Messages */}
			<div className="flex-1 overflow-hidden rounded-lg border bg-muted/30">
				{messages.length === 0 ? (
					<div className="flex h-full items-center justify-center p-4">
						<EmptyState hasApiKey={hasApiKey} />
					</div>
				) : (
					<MessageList
						isPending={isPending}
						messages={messages}
						thinkingEnabled={thinkingEnabled}
					/>
				)}
			</div>

			{/* Input Area with integrated model selector */}
			<div className="mt-4">
				<ChatInput
					attachedNotes={attachedNotes}
					catalogModels={catalogModels}
					catalogProviders={catalogProviders}
					configuredProviders={configuredProviders}
					hasApiKey={hasApiKey}
					isPending={isPending}
					onAtTrigger={handleAtTrigger}
					onChange={setInputValue}
					onModelChange={handleModelChange}
					onProviderChange={handleProviderChange}
					onRemoveAttachment={handleRemoveAttachment}
					onSubmit={handleSendMessage}
					onThinkingToggle={setThinkingEnabled}
					selectedModel={selectedModel}
					selectedProvider={selectedProvider}
					textareaRef={textareaRef}
					thinkingEnabled={thinkingEnabled}
					value={inputValue}
				/>
			</div>

			{/* Entry Picker for @ mentions */}
			<EntryPicker
				excludeIds={attachedNotes.map((n) => n.id)}
				libraryOnly
				onSelect={handleEntrySelect}
				ref={entryPickerRef}
				title={t('knowledge.selectNoteToAttach')}
			/>
		</div>
	)
}

// ============================================================================
// Context Usage Indicator Component
// ============================================================================

type ContextUsageIndicatorProps = {
	contextUsage: {
		used: number
		total: number
		percent: number
		isWarning: boolean
		isExceeded: boolean
	}
	onNewChat: () => void
}

const ContextUsageIndicator = memo(function ContextUsageIndicator({
	contextUsage,
	onNewChat,
}: ContextUsageIndicatorProps) {
	const { t } = useTranslation()

	const formatTokenCount = (count: number): string => {
		if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`
		if (count >= 1000) return `${(count / 1000).toFixed(1)}k`
		return String(count)
	}

	const getProgressColor = () => {
		if (contextUsage.isExceeded) return 'bg-destructive'
		if (contextUsage.isWarning) return 'bg-yellow-500'
		return 'bg-primary'
	}

	const progressColor = getProgressColor()

	return (
		<Tooltip>
			<TooltipTrigger>
				<div
					className={cn(
						'flex items-center gap-2 rounded-lg px-2.5 py-1.5',
						'border bg-background/50 backdrop-blur-sm',
						'cursor-default transition-colors',
						contextUsage.isExceeded && 'border-destructive/50 bg-destructive/5',
						contextUsage.isWarning &&
							!contextUsage.isExceeded &&
							'border-yellow-500/50 bg-yellow-500/5'
					)}
				>
					<div className="flex flex-col gap-0.5">
						<div className="flex items-center gap-1.5">
							<span className="font-[tabular-nums] text-[10px] text-muted-foreground">
								{t('knowledge.contextUsage')}
							</span>
							<span
								className={cn(
									'font-[tabular-nums] font-medium text-xs',
									contextUsage.isExceeded && 'text-destructive',
									contextUsage.isWarning &&
										!contextUsage.isExceeded &&
										'text-yellow-600 dark:text-yellow-500'
								)}
							>
								{contextUsage.percent}%
							</span>
						</div>
						<div className="h-1 w-16 overflow-hidden rounded-full bg-muted">
							<div
								className={cn('h-full transition-all', progressColor)}
								style={{ width: `${Math.min(100, contextUsage.percent)}%` }}
							/>
						</div>
					</div>
					{contextUsage.isExceeded && (
						<Button
							className="h-6 px-2 text-xs"
							onClick={(e) => {
								e.stopPropagation()
								onNewChat()
							}}
							size="sm"
							variant="destructive"
						>
							{t('knowledge.newChat')}
						</Button>
					)}
				</div>
			</TooltipTrigger>
			<TooltipContent side="bottom">
				<p>
					{t('knowledge.contextUsageTooltip', {
						used: formatTokenCount(contextUsage.used),
						total: formatTokenCount(contextUsage.total),
						percent: contextUsage.percent,
					})}
				</p>
				{contextUsage.isWarning && !contextUsage.isExceeded && (
					<p className="mt-1 text-yellow-600 dark:text-yellow-500">
						{t('knowledge.contextWarning', { percent: contextUsage.percent })}
					</p>
				)}
			</TooltipContent>
		</Tooltip>
	)
})

type EmptyStateProps = {
	hasApiKey: boolean
}

function EmptyState({ hasApiKey }: EmptyStateProps) {
	const { t } = useTranslation()

	return (
		<div className="flex h-full flex-col items-center justify-center text-center">
			<HugeiconsIcon
				className="mb-4 size-12 text-muted-foreground/50"
				icon={AiBrain01Icon}
			/>
			<h3 className="mb-2 text-balance font-medium text-lg">
				{t('knowledge.emptyState.title')}
			</h3>
			<p className="max-w-sm text-pretty text-muted-foreground text-sm">
				{t('knowledge.emptyState.description')}
			</p>
			{!hasApiKey && (
				<div className="mt-4">
					<Link to="/settings/models">
						<Button>
							<HugeiconsIcon className="mr-2 size-4" icon={Setting06Icon} />
							{t('knowledge.manageApiKeys')}
						</Button>
					</Link>
				</div>
			)}
		</div>
	)
}

type MessageListProps = {
	messages: ChatMessage[]
	isPending: boolean
	thinkingEnabled: boolean
}

function MessageList({ messages, isPending, thinkingEnabled }: MessageListProps) {
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

/** Waiting indicator extracted as memoized component */
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

type MessageBubbleProps = {
	message: ChatMessage
	thinkingEnabled: boolean
}

// ============================================================================
// Utility Functions (hoisted outside components for performance)
// ============================================================================

/** Format token count for display */
function formatTokenCount(count?: number): string | null {
	if (!count) return null
	return count >= 1000 ? `${(count / 1000).toFixed(1)}k` : String(count)
}

/** Format cost for display */
function formatCost(cost?: number): string | null {
	if (!cost) return null
	if (cost < 0.0001) return '<$0.0001'
	if (cost < 0.01) return `$${cost.toFixed(4)}`
	return `$${cost.toFixed(3)}`
}

// ============================================================================
// Thinking Collapse Component (Memoized for performance)
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
// Message Footer Component (Extracted for reusability)
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
// Message Bubble Component (Using chat-message primitives)
// ============================================================================

const MessageBubble = memo(function MessageBubble({
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

// ============================================================================
// Content Components (Separated for better memoization)
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
