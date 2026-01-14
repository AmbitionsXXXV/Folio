import {
	AiBrain01Icon,
	ArrowUp02Icon,
	Cancel01Icon,
	FileEditIcon,
	Setting06Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { CatalogModel, CatalogProvider } from '@/hooks/use-ai-model-catalog'
import { cn } from '@/lib/utils'

/** Attached note info for display */
export type AttachedNote = {
	id: string
	title: string
}

export type ChatInputProps = {
	value: string
	onChange: (value: string) => void
	onSubmit: () => void
	disabled?: boolean
	isPending?: boolean
	placeholder?: string
	className?: string
	// Model selection props
	selectedProvider: string
	selectedModel: string
	onProviderChange: (provider: string) => void
	onModelChange: (model: string) => void
	configuredProviders: string[]
	hasApiKey: boolean
	// Model catalog (from useAiModelCatalog)
	catalogProviders: CatalogProvider[]
	catalogModels: CatalogModel[]
	// Thinking/reasoning toggle
	thinkingEnabled?: boolean
	onThinkingToggle?: (enabled: boolean) => void
	// Attachment props
	attachedNotes?: AttachedNote[]
	onRemoveAttachment?: (noteId: string) => void
	onAtTrigger?: () => void
	/** External ref for the textarea */
	textareaRef?: React.RefObject<HTMLTextAreaElement | null>
}

export function ChatInput({
	value,
	onChange,
	onSubmit,
	disabled = false,
	isPending = false,
	placeholder,
	className,
	selectedProvider,
	selectedModel,
	onProviderChange,
	onModelChange,
	configuredProviders,
	hasApiKey,
	catalogProviders,
	catalogModels,
	thinkingEnabled = false,
	onThinkingToggle,
	attachedNotes = [],
	onRemoveAttachment,
	onAtTrigger,
	textareaRef: externalTextareaRef,
}: ChatInputProps) {
	const { t } = useTranslation()
	const internalTextareaRef = useRef<HTMLTextAreaElement>(null)
	const textareaRef = externalTextareaRef ?? internalTextareaRef

	const providerInfo = useMemo(
		() => catalogProviders.find((p) => p.id === selectedProvider),
		[catalogProviders, selectedProvider]
	)

	// Get enabled chat models for the selected provider from catalog
	const providerModels = useMemo(() => {
		return catalogModels.filter(
			(model) =>
				model.providerId === selectedProvider &&
				model.enabled &&
				model.type === 'chat'
		)
	}, [catalogModels, selectedProvider])

	// Find selected model info
	const selectedModelInfo = useMemo(() => {
		return providerModels.find((m) => m.id === selectedModel)
	}, [providerModels, selectedModel])

	// Check if the selected model supports thinking/reasoning
	// A model supports thinking if:
	// 1. It has reasoning ability (reasoning: true), OR
	// 2. It has enableReasoning in extendParams (can be toggled on/off)
	const supportsThinking = useMemo(() => {
		if (!selectedModelInfo) return false
		return Boolean(selectedModelInfo.reasoning)
	}, [selectedModelInfo])

	// Check if the model supports toggle-able reasoning (has enableReasoning param)
	// This determines if the toggle actually sends the enableReasoning param to the API
	const hasToggleableReasoning = useMemo(() => {
		return selectedModelInfo?.settings?.extendParams?.includes('enableReasoning')
	}, [selectedModelInfo])

	// Get the appropriate tooltip text for the thinking toggle button
	const getThinkingTooltip = () => {
		if (!hasToggleableReasoning) {
			return t('knowledge.thinkingBuiltIn')
		}
		return thinkingEnabled
			? t('knowledge.thinkingEnabled')
			: t('knowledge.enableThinking')
	}

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		// Handle @ trigger
		if (e.key === '@' && onAtTrigger) {
			// Trigger entry picker after the @ is typed
			setTimeout(() => {
				onAtTrigger()
			}, 0)
		}

		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			if (!(disabled || isPending) && value.trim()) {
				onSubmit()
			}
		}
	}

	const canSend = !(disabled || isPending) && hasApiKey && value.trim().length > 0

	const hasAttachments = attachedNotes.length > 0

	return (
		<div
			className={cn(
				'relative rounded-2xl border bg-background shadow-sm transition-shadow',
				'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
				'hover:shadow-md',
				className
			)}
		>
			{/* Attached Notes Chips */}
			{hasAttachments && (
				<div className="flex flex-wrap gap-1.5 px-3 pt-3">
					{attachedNotes.map((note) => (
						<Badge
							className="group flex items-center gap-1 pr-1"
							key={note.id}
							variant="secondary"
						>
							<HugeiconsIcon
								className="size-3 text-muted-foreground"
								icon={FileEditIcon}
							/>
							<span className="max-w-[150px] truncate text-xs">
								{note.title || t('entryPicker.untitled')}
							</span>
							{onRemoveAttachment && (
								<Button
									aria-label={t('knowledge.removeAttachment')}
									className="size-4 p-0 opacity-60 group-hover:opacity-100"
									onClick={() => onRemoveAttachment(note.id)}
									size="icon"
									variant="ghost"
								>
									<HugeiconsIcon className="size-3" icon={Cancel01Icon} />
								</Button>
							)}
						</Badge>
					))}
				</div>
			)}

			{/* Textarea */}
			<Textarea
				className={cn(
					'max-h-[200px] min-h-[100px] resize-none border-none bg-transparent',
					'px-4 pb-16',
					hasAttachments ? 'pt-2' : 'pt-4',
					'focus-visible:ring-0 focus-visible:ring-offset-0',
					'placeholder:text-muted-foreground/60'
				)}
				disabled={disabled || isPending || !hasApiKey}
				onChange={(e) => onChange(e.target.value)}
				onKeyDown={handleKeyDown}
				placeholder={
					hasApiKey
						? placeholder || t('knowledge.inputPlaceholder')
						: t('knowledge.configureApiKeyFirst')
				}
				ref={textareaRef}
				value={value}
			/>

			{/* Bottom Actions Bar */}
			<div className="absolute right-3 bottom-3 left-3 flex items-center justify-between">
				{/* Left: Model Selector + Thinking Toggle */}
				<div className="flex items-center gap-1">
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button className="h-8 gap-2 rounded-lg px-3 text-xs" variant="ghost">
								{providerInfo?.logo && (
									<img
										alt=""
										aria-hidden="true"
										className="size-4"
										src={providerInfo.logo}
									/>
								)}
								<span className="max-w-[120px] truncate">
									{selectedModelInfo?.displayName ||
										selectedModel ||
										providerInfo?.name ||
										t('knowledge.selectModel')}
								</span>
								<HugeiconsIcon
									className="size-4 text-muted-foreground"
									icon={Setting06Icon}
								/>
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="start" className="w-64">
							{/* Provider Section */}
							<div className="px-2 py-1.5 font-medium text-muted-foreground text-xs">
								{t('knowledge.provider')}
							</div>
							{catalogProviders.map((p) => {
								const isConfigured = configuredProviders.includes(p.id)
								const isSelected = selectedProvider === p.id
								return (
									<DropdownMenuItem
										className={cn(isSelected && 'bg-accent')}
										key={p.id}
										onClick={() => {
											onProviderChange(p.id)
											onModelChange('')
										}}
									>
										<span className="flex items-center gap-2">
											{p.logo && (
												<img
													alt=""
													aria-hidden="true"
													className="size-4 dark:brightness-0 dark:invert"
													src={p.logo}
												/>
											)}
											{p.name}
											{!isConfigured && (
												<span className="text-muted-foreground text-xs">
													({t('knowledge.notConfigured')})
												</span>
											)}
										</span>
									</DropdownMenuItem>
								)
							})}
							{/* Model Section */}
							{providerModels.length > 0 && (
								<>
									<div className="mt-2 border-t px-2 pt-2 pb-1.5 font-medium text-muted-foreground text-xs">
										{t('knowledge.model')}
									</div>
									{providerModels.slice(0, 8).map((model) => {
										const isSelected = selectedModel === model.id
										return (
											<DropdownMenuItem
												className={cn(isSelected && 'bg-accent')}
												key={model.id}
												onClick={() => onModelChange(model.id)}
											>
												<span className="flex flex-col">
													<span className="text-sm">
														{model.displayName || model.id}
													</span>
													<span className="text-muted-foreground text-xs">
														{model.id}
													</span>
												</span>
											</DropdownMenuItem>
										)
									})}
								</>
							)}
						</DropdownMenuContent>
					</DropdownMenu>

					{/* Thinking Toggle Button - Show for models with reasoning capability */}
					{supportsThinking && onThinkingToggle && (
						<Tooltip>
							<TooltipTrigger
								aria-label={t('knowledge.toggleThinking')}
								aria-pressed={hasToggleableReasoning ? thinkingEnabled : true}
								className={cn(
									'relative inline-flex size-8 items-center justify-center rounded-lg',
									'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
									'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
									// For toggleable models, show active state when enabled
									// For non-toggleable models (built-in reasoning), always show as active
									(hasToggleableReasoning ? thinkingEnabled : true) && 'text-primary'
								)}
								disabled={!hasToggleableReasoning}
								onClick={() =>
									hasToggleableReasoning && onThinkingToggle(!thinkingEnabled)
								}
								type="button"
							>
								<HugeiconsIcon className="size-4" icon={AiBrain01Icon} />
								{(hasToggleableReasoning ? thinkingEnabled : true) && (
									<span className="absolute top-0.5 right-0.5 size-2 rounded-full bg-primary" />
								)}
							</TooltipTrigger>
							<TooltipContent side="top">
								<p>{getThinkingTooltip()}</p>
							</TooltipContent>
						</Tooltip>
					)}
				</div>

				{/* Right: Submit Button */}
				<Button
					aria-label={t('knowledge.send')}
					className="size-8 shrink-0 rounded-lg"
					disabled={!canSend}
					onClick={onSubmit}
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
