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
	Menu01Icon,
	MessageAdd01Icon,
	Setting06Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { nanoid } from 'nanoid'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
	type AttachedNote,
	type ChatContextUsage,
	ChatInput,
	type SessionUsage,
} from '@/components/ai-elements/chat-input'
import type { PromptInputMessage } from '@/components/ai-elements/prompt-input'
import {
	ChatHistoryPanel,
	type ChatMessage,
	ContextUsageIndicator,
	calculateTotalTokens,
	EmptyState,
	estimateTokenCount,
	isApiSupportedProvider,
	MessageList,
	mapProviderIdToApi,
	setLastChatId,
} from '@/features/knowledge'
import { useAiModelCatalog } from '@/hooks/use-ai-model-catalog'
import { useChatSessions } from '@/hooks/use-chat-sessions'
import { useKnowledgeChat } from '@/hooks/use-knowledge-chat'
import { useLastUsedModel } from '@/hooks/use-last-used-model'
import { useModelProviderConfig } from '@/hooks/use-model-provider-config'
import { cn } from '@/lib/utils'

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

	// Chat sessions management
	const {
		sessions,
		selectedChatId,
		isLoading: isSessionsLoading,
		selectChat,
		createChat: createNewChatSession,
		deleteChat: deleteChatSession,
		refreshSessions,
		isSessionEmpty,
	} = useChatSessions()

	// Chat ID for persistence
	const [chatId, setChatIdState] = useState<string>(() => nanoid(16))

	// Sidebar visibility (mobile)
	const [isSidebarOpen, setIsSidebarOpen] = useState(false)

	// Input state
	const [inputValue, setInputValue] = useState('')

	// Thinking/reasoning toggle state
	const [thinkingEnabled, setThinkingEnabled] = useState(false)

	// Attached notes state
	const [attachedNotes, setAttachedNotes] = useState<AttachedNote[]>([])

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
		switchChat,
		regenerate,
		addToolApprovalResponse,
	} = useKnowledgeChat({
		chatId,
		provider: mapProviderIdToApi(selectedProvider),
		apiKey: providerConfig?.apiKey ?? '',
		baseUrl: providerConfig?.baseUrl?.trim() || undefined,
		model: selectedModel.trim() || '',
		enableReasoning: thinkingEnabled,
	})

	// Convert KnowledgeChatMessage to ChatMessage for existing UI components
	const messages = useMemo<ChatMessage[]>(() => chatMessages, [chatMessages])

	// Update local chatId when server returns one
	useEffect(() => {
		if (serverChatId && serverChatId !== chatId) {
			setChatIdState(serverChatId)
		}
	}, [serverChatId, chatId])

	// Sync chatId with selected session
	useEffect(() => {
		if (selectedChatId && selectedChatId !== chatId) {
			setChatIdState(selectedChatId)
			switchChat(selectedChatId).catch((err) => {
				console.error('Failed to switch chat:', err)
				toast.error(t('knowledge.loadChatFailed'))
			})
		}
	}, [selectedChatId, chatId, switchChat, t])

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
		(modelId: string, providerId?: string) => {
			const matchedProviderId =
				providerId ??
				catalogModels.find((model) => model.id === modelId)?.providerId ??
				selectedProvider
			setSelectedProvider(matchedProviderId)
			setSelectedModel(modelId)
			saveLastUsed(matchedProviderId, modelId)
		},
		[catalogModels, selectedProvider, saveLastUsed]
	)

	const hasApiKey = Boolean(providerConfig?.apiKey?.trim())

	// Handle chat error
	useEffect(() => {
		if (chatError) {
			toast.error(chatError.message || t('knowledge.requestFailed'))
		}
	}, [chatError, t])

	const handleAddNoteAttachment = useCallback(
		(note: AttachedNote) => {
			const trimmedTitle = note.title.trim()
			const normalizedTitle =
				trimmedTitle.length > 0 ? trimmedTitle : t('entryPicker.untitled')
			setAttachedNotes((prev) => {
				if (prev.some((item) => item.id === note.id)) {
					return prev
				}
				return [...prev, { id: note.id, title: normalizedTitle }]
			})
		},
		[t]
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

	const handleSendMessage = useCallback(
		(message: PromptInputMessage) => {
			const trimmedInput = message.text.trim()
			const hasFiles = message.files.length > 0
			const hasContent = trimmedInput.length > 0 || hasFiles
			if (!hasContent || isStreaming) return

			if (!isApiSupportedProvider(selectedProvider)) {
				toast.error(`Provider "${selectedProvider}" is not yet supported by the API`)
				return
			}

			const fallbackText = t('knowledge.attachmentFallback')
			const promptText = trimmedInput || fallbackText

			// Check if context would be exceeded with new message
			const newMessageTokens = estimateTokenCount(promptText)
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
				text: promptText,
				files: message.files,
				mentionTitles,
				noteEntryIds,
			})
		},
		[
			isStreaming,
			selectedProvider,
			attachedNotes,
			contextUsage,
			selectedModelInfo,
			sendMessage,
			t,
		]
	)

	const handleNewChat = useCallback(async () => {
		// If current session is already empty, don't create a new one
		// Just focus on the input (the server will reuse the empty session anyway)
		if (selectedChatId && isSessionEmpty(selectedChatId) && messages.length === 0) {
			// Already on an empty session, just reset UI state
			setInputValue('')
			setAttachedNotes([])
			setIsSidebarOpen(false)
			return
		}

		try {
			// Create a new chat session on the server
			// Server will reuse existing empty session or create new one
			const newChatId = await createNewChatSession()
			setChatIdState(newChatId)
			resetChat(newChatId)
			setLastChatId(newChatId)

			setInputValue('')
			setAttachedNotes([])

			// Close sidebar on mobile
			setIsSidebarOpen(false)
		} catch (err) {
			console.error('Failed to create new chat:', err)
			// Fallback to local-only chat ID
			const newChatId = nanoid(16)
			setChatIdState(newChatId)
			resetChat(newChatId)
			setLastChatId(newChatId)

			setInputValue('')
			setAttachedNotes([])
		}
	}, [
		createNewChatSession,
		resetChat,
		selectedChatId,
		isSessionEmpty,
		messages.length,
	])

	const handleSelectChat = useCallback(
		(chatIdToSelect: string) => {
			selectChat(chatIdToSelect)
			// Close sidebar on mobile
			setIsSidebarOpen(false)
		},
		[selectChat]
	)

	const handleDeleteChat = useCallback(
		async (chatIdToDelete: string) => {
			try {
				await deleteChatSession(chatIdToDelete)
				// If we deleted the current chat, the hook will auto-select another
				if (chatIdToDelete === chatId) {
					// Refresh will trigger auto-select
					await refreshSessions()
				}
			} catch (err) {
				console.error('Failed to delete chat:', err)
				toast.error(t('knowledge.deleteChatFailed'))
			}
		},
		[deleteChatSession, chatId, refreshSessions, t]
	)

	const isPending = isStreaming || isLoading

	return (
		<div className="flex h-svh">
			{/* Sidebar - Chat History */}
			<div
				className={cn(
					'absolute inset-y-0 left-0 z-40 w-72 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0',
					isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
				)}
			>
				<ChatHistoryPanel
					className="h-full"
					isLoading={isSessionsLoading}
					onDeleteChat={handleDeleteChat}
					onNewChat={handleNewChat}
					onSelectChat={handleSelectChat}
					selectedChatId={selectedChatId}
					sessions={sessions}
				/>
			</div>

			{/* Overlay for mobile */}
			{isSidebarOpen && (
				<button
					aria-label="Close sidebar"
					className="fixed inset-0 z-30 bg-black/50 md:hidden"
					onClick={() => setIsSidebarOpen(false)}
					type="button"
				/>
			)}

			{/* Main Content */}
			<div className="flex flex-1 flex-col overflow-hidden">
				<div className="container mx-auto flex h-full max-w-4xl flex-col px-4 py-4">
					{/* Header */}
					<div className="mb-4 flex items-center justify-between">
						<div className="flex items-center gap-3">
							{/* Mobile menu button */}
							<Button
								className="md:hidden"
								onClick={() => setIsSidebarOpen(true)}
								size="icon"
								variant="ghost"
							>
								<HugeiconsIcon className="size-5" icon={Menu01Icon} />
							</Button>
							<div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
								<HugeiconsIcon
									className="size-6 text-primary"
									icon={AiBrain01Icon}
								/>
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
								onRegenerate={regenerate}
								onToolApprovalResponse={addToolApprovalResponse}
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
							onAddNoteAttachment={handleAddNoteAttachment}
							onChange={setInputValue}
							onModelChange={handleModelChange}
							onRemoveNoteAttachment={handleRemoveAttachment}
							onSubmit={handleSendMessage}
							onThinkingToggle={setThinkingEnabled}
							selectedModel={selectedModel}
							selectedProvider={selectedProvider}
							thinkingEnabled={thinkingEnabled}
							value={inputValue}
						/>
					</div>
				</div>
			</div>
		</div>
	)
}
