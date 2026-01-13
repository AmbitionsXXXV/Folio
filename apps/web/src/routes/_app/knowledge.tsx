import {
	AiBrain01Icon,
	ArrowUp02Icon,
	MessageAdd01Icon,
	Setting06Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMutation } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AiModelSelector } from '@/components/ai-elements/model-selector'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
	Collapsible,
	CollapsibleContent,
	CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Label } from '@/components/ui/label'
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { useAiProviderConfig } from '@/hooks/use-ai-provider-config'
import { AI_PROVIDERS, getProviderInfo } from '@/lib/ai-provider-config'
import { cn } from '@/lib/utils'
import { orpc } from '@/utils/orpc'

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
	const {
		config,
		isLoaded,
		configuredProviders,
		getProviderConfig,
		setDefaultProvider,
	} = useAiProviderConfig()

	// Selected provider & model for this session
	const [selectedProvider, setSelectedProvider] = useState(config.defaultProvider)
	const [selectedModel, setSelectedModel] = useState(config.defaultModel ?? '')
	const [configOpen, setConfigOpen] = useState(false)

	// Chat state
	const [messages, setMessages] = useState<Message[]>([])
	const [inputValue, setInputValue] = useState('')
	const messagesEndRef = useRef<HTMLDivElement>(null)

	// Sync with loaded config
	useEffect(() => {
		if (isLoaded) {
			setSelectedProvider(config.defaultProvider)
			setSelectedModel(config.defaultModel ?? '')
		}
	}, [isLoaded, config.defaultProvider, config.defaultModel])

	const providerConfig = useMemo(
		() => getProviderConfig(selectedProvider),
		[getProviderConfig, selectedProvider]
	)

	const providerInfo = useMemo(
		() => getProviderInfo(selectedProvider),
		[selectedProvider]
	)

	const hasApiKey = Boolean(providerConfig?.apiKey?.trim())

	// Auto-open config if no API key
	useEffect(() => {
		if (isLoaded && !hasApiKey) {
			setConfigOpen(true)
		}
	}, [isLoaded, hasApiKey])

	const generateMutation = useMutation({
		mutationFn: (prompt: string) =>
			orpc.ai.generateText.call({
				provider: selectedProvider,
				apiKey: providerConfig?.apiKey ?? '',
				baseUrl: providerConfig?.baseUrl?.trim() || undefined,
				model: selectedModel.trim() || undefined,
				prompt,
			}),
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

	const handleKeyDown = useCallback(
		(e: React.KeyboardEvent<HTMLTextAreaElement>) => {
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault()
				handleSendMessage()
			}
		},
		[handleSendMessage]
	)

	// Auto-scroll to bottom when messages change
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages])

	const handleNewChat = useCallback(() => {
		setMessages([])
		setInputValue('')
	}, [])

	const handleSaveAsDefault = useCallback(() => {
		setDefaultProvider(selectedProvider, selectedModel || undefined)
		toast.success(t('knowledge.defaultSaved'))
	}, [selectedProvider, selectedModel, setDefaultProvider, t])

	const isPending = generateMutation.isPending
	const canSend = !isPending && hasApiKey && inputValue.trim().length > 0

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
					<Button onClick={handleNewChat} size="sm" variant="outline">
						<HugeiconsIcon className="mr-2 size-4" icon={MessageAdd01Icon} />
						{t('knowledge.newChat')}
					</Button>
				</div>
			</div>

			{/* Config Panel */}
			<Collapsible onOpenChange={setConfigOpen} open={configOpen}>
				<CollapsibleTrigger
					className="mb-4 w-full"
					render={
						<Button className="w-full justify-between" variant="outline">
							<span className="flex items-center gap-2">
								<HugeiconsIcon className="size-4" icon={Setting06Icon} />
								{t('knowledge.configuration')}
								{hasApiKey && providerInfo && (
									<span className="ml-2 flex items-center gap-1 text-muted-foreground text-xs">
										<img
											alt=""
											aria-hidden="true"
											className="size-3"
											src={providerInfo.iconSrc}
										/>
										{providerInfo.name}
										{selectedModel && ` · ${selectedModel}`}
									</span>
								)}
							</span>
							<span
								className={cn(
									'transition-transform',
									configOpen ? 'rotate-180' : ''
								)}
							>
								▼
							</span>
						</Button>
					}
				/>
				<CollapsibleContent>
					<Card className="mb-4">
						<CardContent className="grid gap-4 pt-6 md:grid-cols-2">
							<div className="space-y-2">
								<Label>{t('knowledge.provider')}</Label>
								<Select
									onValueChange={(value) => {
										setSelectedProvider(value as typeof selectedProvider)
										setSelectedModel('')
									}}
									value={selectedProvider}
								>
									<SelectTrigger className="w-full">
										<SelectValue>{providerInfo?.name ?? 'Select'}</SelectValue>
									</SelectTrigger>
									<SelectContent align="start">
										{AI_PROVIDERS.map((p) => {
											const isConfigured = configuredProviders.includes(p.id)
											return (
												<SelectItem key={p.id} value={p.id}>
													<span className="flex items-center gap-2">
														<img
															alt=""
															aria-hidden="true"
															className="size-4"
															src={p.iconSrc}
														/>
														{p.name}
														{!isConfigured && (
															<span className="text-muted-foreground text-xs">
																({t('knowledge.notConfigured')})
															</span>
														)}
													</span>
												</SelectItem>
											)
										})}
									</SelectContent>
								</Select>
								{!hasApiKey && (
									<p className="text-destructive text-xs">
										{t('knowledge.noApiKeyWarning')}{' '}
										<Link
											className="underline hover:text-destructive/80"
											to="/profile"
										>
											{t('knowledge.goToSettings')}
										</Link>
									</p>
								)}
							</div>

							<div className="space-y-2">
								<Label>{t('knowledge.model')}</Label>
								<AiModelSelector
									onValueChange={setSelectedModel}
									placeholder={t('knowledge.selectModel')}
									provider={selectedProvider}
									value={selectedModel || null}
								/>
							</div>

							<div className="flex gap-2 md:col-span-2">
								<Button
									className="flex-1"
									disabled={!hasApiKey}
									onClick={handleSaveAsDefault}
									variant="secondary"
								>
									{t('knowledge.saveAsDefault')}
								</Button>
								<Link to="/profile">
									<Button variant="outline">{t('knowledge.manageApiKeys')}</Button>
								</Link>
							</div>
						</CardContent>
					</Card>
				</CollapsibleContent>
			</Collapsible>

			{/* Chat Messages */}
			<div className="flex-1 overflow-y-auto rounded-lg border bg-muted/30 p-4">
				{messages.length === 0 ? (
					<EmptyState
						hasApiKey={hasApiKey}
						onOpenConfig={() => setConfigOpen(true)}
					/>
				) : (
					<MessageList
						isPending={isPending}
						messages={messages}
						messagesEndRef={messagesEndRef}
					/>
				)}
			</div>

			{/* Input Area */}
			<div className="mt-4 flex gap-2">
				<Textarea
					className="max-h-32 min-h-[48px] resize-none"
					disabled={isPending || !hasApiKey}
					onChange={(e) => setInputValue(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder={
						hasApiKey
							? t('knowledge.inputPlaceholder')
							: t('knowledge.configureApiKeyFirst')
					}
					rows={1}
					value={inputValue}
				/>
				<Button
					aria-label={t('knowledge.send')}
					className="shrink-0"
					disabled={!canSend}
					onClick={handleSendMessage}
					size="icon"
				>
					{isPending ? (
						<Spinner className="size-4" />
					) : (
						<HugeiconsIcon className="size-4" icon={ArrowUp02Icon} />
					)}
				</Button>
			</div>
		</div>
	)
}

type EmptyStateProps = {
	hasApiKey: boolean
	onOpenConfig: () => void
}

function EmptyState({ hasApiKey, onOpenConfig }: EmptyStateProps) {
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
				<div className="mt-4 flex gap-2">
					<Button onClick={onOpenConfig} variant="outline">
						<HugeiconsIcon className="mr-2 size-4" icon={Setting06Icon} />
						{t('knowledge.configureFirst')}
					</Button>
					<Link to="/profile">
						<Button>{t('knowledge.manageApiKeys')}</Button>
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
