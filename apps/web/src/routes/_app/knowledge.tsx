import {
	AiBrain01Icon,
	MessageAdd01Icon,
	Setting06Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ChatInput } from '@/components/ai-elements/chat-input'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useAiModelCatalog } from '@/hooks/use-ai-model-catalog'
import { useLastUsedModel } from '@/hooks/use-last-used-model'
import { useModelProviderConfig } from '@/hooks/use-model-provider-config'
import { cn } from '@/lib/utils'
import { orpc } from '@/utils/orpc'

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

type Message = {
	id: string
	role: 'user' | 'assistant'
	content: string
	timestamp: Date
}

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
	const [messages, setMessages] = useState<Message[]>([])
	const [inputValue, setInputValue] = useState('')
	const messagesEndRef = useRef<HTMLDivElement>(null)

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

	const generateMutation = useMutation({
		mutationFn: (prompt: string) => {
			// Only API-supported providers can be used for text generation
			if (!isApiSupportedProvider(selectedProvider)) {
				throw new Error(
					`Provider "${selectedProvider}" is not yet supported by the API`
				)
			}
			const apiProviderId = mapProviderIdToApi(selectedProvider)
			return orpc.ai.generateText.call({
				provider: apiProviderId,
				apiKey: providerConfig?.apiKey ?? '',
				baseUrl: providerConfig?.baseUrl?.trim() || undefined,
				model: selectedModel.trim() || undefined,
				prompt,
			})
		},
		onSuccess: (data) => {
			const assistantMessage: Message = {
				id: crypto.randomUUID(),
				role: 'assistant',
				content: data.text,
				timestamp: new Date(),
			}
			setMessages((prev) => [...prev, assistantMessage])
		},
		onError: (error: Error) => {
			toast.error(error.message || t('knowledge.requestFailed'))
		},
	})

	const handleSendMessage = useCallback(() => {
		const trimmedInput = inputValue.trim()
		if (!trimmedInput || generateMutation.isPending) return

		const userMessage: Message = {
			id: crypto.randomUUID(),
			role: 'user',
			content: trimmedInput,
			timestamp: new Date(),
		}
		setMessages((prev) => [...prev, userMessage])
		setInputValue('')
		generateMutation.mutate(trimmedInput)
	}, [inputValue, generateMutation])

	// Auto-scroll to bottom when messages change
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages])

	const handleNewChat = useCallback(() => {
		setMessages([])
		setInputValue('')
	}, [])

	const isPending = generateMutation.isPending

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

			{/* Chat Messages */}
			<div className="flex-1 overflow-y-auto rounded-lg border bg-muted/30 p-4">
				{messages.length === 0 ? (
					<EmptyState hasApiKey={hasApiKey} />
				) : (
					<MessageList
						isPending={isPending}
						messages={messages}
						messagesEndRef={messagesEndRef}
					/>
				)}
			</div>

			{/* Input Area with integrated model selector */}
			<div className="mt-4">
				<ChatInput
					catalogModels={catalogModels}
					catalogProviders={catalogProviders}
					configuredProviders={configuredProviders}
					hasApiKey={hasApiKey}
					isPending={isPending}
					onChange={setInputValue}
					onModelChange={handleModelChange}
					onProviderChange={handleProviderChange}
					onSubmit={handleSendMessage}
					selectedModel={selectedModel}
					selectedProvider={selectedProvider}
					value={inputValue}
				/>
			</div>
		</div>
	)
}

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
	messages: Message[]
	isPending: boolean
	messagesEndRef: React.RefObject<HTMLDivElement | null>
}

function MessageList({ messages, isPending, messagesEndRef }: MessageListProps) {
	const { t } = useTranslation()

	return (
		<div className="space-y-4">
			{messages.map((message) => (
				<div
					className={cn(
						'flex',
						message.role === 'user' ? 'justify-end' : 'justify-start'
					)}
					key={message.id}
				>
					<div
						className={cn(
							'max-w-[85%] rounded-2xl px-4 py-2',
							message.role === 'user'
								? 'bg-primary text-primary-foreground'
								: 'border bg-card text-card-foreground shadow-sm'
						)}
					>
						<p className="whitespace-pre-wrap text-pretty text-sm">
							{message.content}
						</p>
						<span
							className={cn(
								'mt-1 block font-[tabular-nums] text-[10px]',
								message.role === 'user'
									? 'text-primary-foreground/70'
									: 'text-muted-foreground'
							)}
						>
							{message.timestamp.toLocaleTimeString()}
						</span>
					</div>
				</div>
			))}
			{isPending && (
				<div className="flex justify-start">
					<div className="flex items-center gap-2 rounded-2xl border bg-card px-4 py-2 shadow-sm">
						<Spinner className="size-4" />
						<span className="text-muted-foreground text-sm">
							{t('knowledge.thinking')}
						</span>
					</div>
				</div>
			)}
			<div ref={messagesEndRef} />
		</div>
	)
}
