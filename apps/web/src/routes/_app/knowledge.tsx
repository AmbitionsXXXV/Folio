import { CONTEXT_CRITICAL_THRESHOLD } from '@folionote/constants'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@folionote/ui/alert-dialog'
import { Button } from '@folionote/ui/button'
import {
	AiBrain01Icon,
	Alert02Icon,
	MessageAdd01Icon,
	Setting06Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { nanoid } from 'nanoid'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
	type AttachedNote,
	type ChatContextUsage,
	ChatInput,
	type SessionUsage,
} from '@/components/ai-elements/chat-input'
import { EntryPicker, type EntryPickerRef } from '@/components/entry-picker'
import {
	type ChatMessage,
	ContextUsageIndicator,
	calculateTotalTokens,
	EmptyState,
	estimateTokenCount,
	isApiSupportedProvider,
	MessageList,
	mapProviderIdToApi,
} from '@/features/knowledge'
import { useAiModelCatalog } from '@/hooks/use-ai-model-catalog'
import { useKnowledgeChat } from '@/hooks/use-knowledge-chat'
import { useLastUsedModel } from '@/hooks/use-last-used-model'
import { useModelProviderConfig } from '@/hooks/use-model-provider-config'
import type { Entry } from '@/types'

export const Route = createFileRoute('/_app/knowledge')({
	component: KnowledgePage,
})

function KnowledgePage() {
	const { t } = useTranslation()
	const { config, isLoaded, getProviderConfig } = useModelProviderConfig()

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

	// Chat ID for persistence (generated once, server may override via header)
	const [chatId, setChatIdState] = useState<string>(() => nanoid(16))

	// Input state
	const [inputValue, setInputValue] = useState('')
	const textareaRef = useRef<HTMLTextAreaElement>(null)

	// Thinking/reasoning toggle state
	const [thinkingEnabled, setThinkingEnabled] = useState(false)

	// Attached notes state
	const [attachedNotes, setAttachedNotes] = useState<AttachedNote[]>([])
	const entryPickerRef = useRef<EntryPickerRef>(null)

	// Provider config for API key
	const providerConfig = useMemo(
		() => getProviderConfig(selectedProvider),
		[getProviderConfig, selectedProvider]
	)

	// Knowledge chat hook (AI SDK v6 based)
	const {
		messages: chatMessages,
		isStreaming,
		isLoading,
		error: chatError,
		chatId: serverChatId,
		sendMessage,
		resetChat,
	} = useKnowledgeChat({
		chatId,
		provider: mapProviderIdToApi(selectedProvider),
		apiKey: providerConfig?.apiKey ?? '',
		baseUrl: providerConfig?.baseUrl?.trim() || undefined,
		model: selectedModel.trim() || '',
		enableReasoning: thinkingEnabled,
	})

	// Convert KnowledgeChatMessage to ChatMessage for existing UI components
	const messages = useMemo<ChatMessage[]>(
		() =>
			chatMessages.map((msg) => ({
				id: msg.id,
				role: msg.role,
				content: msg.content,
				timestamp: msg.timestamp,
				isStreaming: msg.isStreaming,
				thinking: msg.thinking,
				usage: msg.usage,
				mentionTitles: msg.mentionTitles,
			})),
		[chatMessages]
	)

	// Update local chatId when server returns one
	useEffect(() => {
		if (serverChatId && serverChatId !== chatId) {
			setChatIdState(serverChatId)
		}
	}, [serverChatId, chatId])

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
	useEffect(() => {
		if (!(isLoaded && isCatalogLoaded)) return

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

	// When model changes, save to localStorage
	const handleModelChange = useCallback(
		(modelId: string) => {
			setSelectedModel(modelId)
			saveLastUsed(selectedProvider, modelId)
		},
		[selectedProvider, saveLastUsed]
	)

	const hasApiKey = Boolean(providerConfig?.apiKey?.trim())

	// Handle chat error
	useEffect(() => {
		if (chatError) {
			toast.error(chatError.message || t('knowledge.requestFailed'))
		}
	}, [chatError, t])

	// Attachment handlers
	const handleAtTrigger = useCallback(() => {
		entryPickerRef.current?.open()
	}, [])

	const handleEntrySelect = useCallback(
		(entry: Entry) => {
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

			if (textareaRef.current) {
				const textarea = textareaRef.current
				const start = textarea.selectionStart
				const end = textarea.selectionEnd
				const text = inputValue
				const noteTitle = entry.title || t('entryPicker.untitled')
				const insertText = `@${noteTitle} `

				const isAtTrigger = start > 0 && text[start - 1] === '@'
				const replaceStart = isAtTrigger ? start - 1 : start

				const newValue = text.slice(0, replaceStart) + insertText + text.slice(end)
				setInputValue(newValue)

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
			isWarning: percent >= 80,
			isExceeded: percent >= CONTEXT_CRITICAL_THRESHOLD,
		}
	}, [messages, selectedModelInfo])

	// Calculate accumulated session usage for ChatInput context display
	const chatContextUsage = useMemo<ChatContextUsage | undefined>(() => {
		if (messages.length === 0) return undefined

		const contextWindow = selectedModelInfo?.contextWindowTokens ?? 128_000
		const usedTokens = calculateTotalTokens(messages)

		// Accumulate usage from all messages
		const sessionUsage = messages.reduce<SessionUsage>(
			(acc, msg) => {
				if (!msg.usage) return acc
				return {
					inputTokens: (acc.inputTokens ?? 0) + (msg.usage.inputTokens ?? 0),
					outputTokens: (acc.outputTokens ?? 0) + (msg.usage.outputTokens ?? 0),
					totalTokens: (acc.totalTokens ?? 0) + (msg.usage.totalTokens ?? 0),
					reasoningTokens:
						(acc.reasoningTokens ?? 0) + (msg.usage.reasoningTokens ?? 0),
				}
			},
			{
				inputTokens: 0,
				outputTokens: 0,
				totalTokens: 0,
				reasoningTokens: 0,
			}
		)

		return {
			usedTokens,
			maxTokens: contextWindow,
			sessionUsage,
			modelId: selectedModel,
		}
	}, [messages, selectedModelInfo, selectedModel])

	// State for context exceeded dialog
	const [showContextExceededDialog, setShowContextExceededDialog] = useState(false)

	const handleSendMessage = useCallback(() => {
		const trimmedInput = inputValue.trim()
		if (!trimmedInput || isStreaming) return

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

		// Capture note IDs and mention titles before clearing
		const noteEntryIds = attachedNotes.map((n) => n.id)
		const mentionTitles =
			attachedNotes.length > 0
				? attachedNotes.map((n) => n.title).filter(Boolean)
				: undefined

		// Clear input and attachments
		setInputValue('')
		setAttachedNotes([])

		// Send message via AI SDK useChat
		sendMessage({
			text: trimmedInput,
			mentionTitles,
			noteEntryIds,
		})
	}, [
		inputValue,
		isStreaming,
		selectedProvider,
		attachedNotes,
		contextUsage,
		selectedModelInfo,
		sendMessage,
	])

	const handleNewChat = useCallback(() => {
		// Generate a new chat ID and reset the chat
		const newChatId = nanoid(16)
		setChatIdState(newChatId)
		resetChat(newChatId)

		setInputValue('')
		setAttachedNotes([])
	}, [resetChat])

	const isPending = isStreaming || isLoading

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
					<Button
						className="rounded-lg"
						onClick={handleNewChat}
						size="sm"
						variant="outline"
					>
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
					contextUsage={chatContextUsage}
					hasApiKey={hasApiKey}
					isPending={isPending}
					onAtTrigger={handleAtTrigger}
					onChange={setInputValue}
					onModelChange={handleModelChange}
					onRemoveNoteAttachment={handleRemoveAttachment}
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
