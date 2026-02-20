import { Button } from '@folionote/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@folionote/ui/sheet'
import {
	AiBrain01Icon,
	MessageAdd01Icon,
	Setting06Icon,
	SidebarLeftIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { createFileRoute, Link } from '@tanstack/react-router'
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
	Conversation,
	ConversationContent,
	ConversationEmptyState,
	ConversationScrollButton,
} from '@/components/ai-elements/conversation'
import { AiModelSelector } from '@/components/ai-elements/model-selector'
import {
	PromptInput,
	PromptInputActionAddAttachments,
	PromptInputActionMenu,
	PromptInputActionMenuContent,
	PromptInputActionMenuTrigger,
	PromptInputBody,
	PromptInputButton,
	PromptInputFooter,
	type PromptInputMessage,
	PromptInputSubmit,
	PromptInputTextarea,
	PromptInputTools,
} from '@/components/ai-elements/prompt-input'
import { Suggestion, Suggestions } from '@/components/ai-elements/suggestion'
import {
	type ChatSessionSummary,
	isApiSupportedProvider,
} from '@/features/knowledge'
import { AttachmentDisplay } from '@/features/knowledge/components/attachment-display'
import {
	ChatMessageItem,
	WaitingIndicator,
} from '@/features/knowledge/components/chat-message-item'
import { CompactMessage } from '@/features/knowledge/components/compact-message'
import {
	buildContextPopoverDetails,
	ContextCompactBanner,
	ContextUsagePopover,
} from '@/features/knowledge/components/context-usage-section'
import { ThinkingToggle } from '@/features/knowledge/components/thinking-toggle'
import { isToolInvocationPart } from '@/features/knowledge/components/tool-calls'
import { useAiModelCatalog } from '@/hooks/use-ai-model-catalog'
import { useChatSessions } from '@/hooks/use-chat-sessions'
import { useKnowledgeChat } from '@/hooks/use-knowledge-chat'
import { useLastUsedModel } from '@/hooks/use-last-used-model'
import { useModelProviderConfig } from '@/hooks/use-model-provider-config'
import { useProviderApiKey } from '@/hooks/use-provider-api-key'
import { useSessionContextUsage } from '@/hooks/use-session-context-usage'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/_app/knowledge')({
	component: KnowledgePage,
})

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
		// Preload failures are non-fatal; the lazy load will still run.
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

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : 'Request failed'
}

type ChatHistorySidebarProps = {
	className?: string
	isLoading: boolean
	sessions: ChatSessionSummary[]
	selectedChatId: string | null
	onSelectChat: (id: string) => void
	onNewChat: () => void
	onDeleteChat: (id: string) => void
}

const ChatHistorySidebar = memo(function ChatHistorySidebar(
	props: ChatHistorySidebarProps
) {
	return (
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
				className={props.className}
				isLoading={props.isLoading}
				onDeleteChat={props.onDeleteChat}
				onNewChat={props.onNewChat}
				onSelectChat={props.onSelectChat}
				selectedChatId={props.selectedChatId}
				sessions={props.sessions}
			/>
		</Suspense>
	)
})

function KnowledgePage() {
	const { t } = useTranslation()

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

	// Model selection helpers
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

	// Model info for thinking
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

	// Combined error toast for both chat and session errors
	useEffect(() => {
		const error = chatError || sessionsError
		if (error) {
			toast.error(error.message || t('knowledge.requestFailed'))
		}
	}, [chatError, sessionsError, t])

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
	}, [selectedChatId, clearMessages, loadMessages])

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
	])

	// Handlers
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
		[isPending, deleteChat, selectedChatId, clearMessages, refreshSessions]
	)

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
	}, [compactContext, isCompacting, isPending, sessionContextUsage, t])

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

	// Waiting state
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
					<ChatHistorySidebar
						className="h-full border-r-0"
						isLoading={isSessionsLoading}
						onDeleteChat={handleDeleteChat}
						onNewChat={handleNewChat}
						onSelectChat={handleSelectChat}
						selectedChatId={selectedChatId}
						sessions={sessions}
					/>
				</SheetContent>
			</Sheet>

			{isHistoryCollapsed ? null : (
				<div className="hidden h-full w-[280px] shrink-0 md:block">
					<ChatHistorySidebar
						className="h-full"
						isLoading={isSessionsLoading}
						onDeleteChat={handleDeleteChat}
						onNewChat={handleNewChat}
						onSelectChat={handleSelectChat}
						selectedChatId={selectedChatId}
						sessions={sessions}
					/>
				</div>
			)}

			<div className="flex min-w-0 flex-1 flex-col divide-y overflow-hidden">
				<div className="flex items-center justify-between gap-2 px-4 py-2">
					<Button
						className="inline-flex gap-2 md:hidden"
						onClick={() => setMobileHistoryOpen(true)}
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
						onClick={() => setIsHistoryCollapsed((v) => !v)}
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
										onChange={(e) => setInputValue(e.target.value)}
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
