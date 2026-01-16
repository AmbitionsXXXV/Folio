import { Badge } from '@folionote/ui/badge'
import { Button } from '@folionote/ui/button'
import { cn } from '@folionote/ui/lib/utils'
import { Textarea } from '@folionote/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@folionote/ui/tooltip'
import {
	AiBrain01Icon,
	ArrowMoveDownLeftIcon,
	Cancel01Icon,
	FileEditIcon,
	RefreshIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { type KeyboardEvent, type RefObject, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
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
import { renderTextWithMentions } from '@/components/ai-elements/mention-badge'
import { AiModelSelector } from '@/components/ai-elements/model-selector'
import type { CatalogModel, CatalogProvider } from '@/hooks/use-ai-model-catalog'

// ============================================================================
// Types
// ============================================================================

/** Attached note info for display */
export type AttachedNote = {
	id: string
	title: string
}

/** Accumulated token usage from messages */
export type SessionUsage = {
	inputTokens?: number
	outputTokens?: number
	totalTokens?: number
	reasoningTokens?: number
	cachedInputTokens?: number
}

/** Context usage information for the chat session */
export type ChatContextUsage = {
	/** Used tokens in context */
	usedTokens: number
	/** Max tokens for the model context window */
	maxTokens: number
	/** Accumulated usage from all messages */
	sessionUsage?: SessionUsage
	/** Model ID for cost calculation (e.g., 'gpt-4o', 'claude-3-5-sonnet') */
	modelId?: string
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
	onModelChange: (model: string) => void
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
	textareaRef?: RefObject<HTMLTextAreaElement | null>
	/** Context usage for the current session */
	contextUsage?: ChatContextUsage
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
	onModelChange,
	hasApiKey,
	catalogProviders,
	catalogModels,
	thinkingEnabled = false,
	onThinkingToggle,
	attachedNotes = [],
	onRemoveAttachment,
	onAtTrigger,
	textareaRef: externalTextareaRef,
	contextUsage,
}: ChatInputProps) {
	const { t } = useTranslation()
	const internalTextareaRef = useRef<HTMLTextAreaElement>(null)
	const textareaRef = externalTextareaRef ?? internalTextareaRef

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
	const supportsThinking = useMemo(() => {
		if (!selectedModelInfo) return false
		return Boolean(selectedModelInfo.reasoning)
	}, [selectedModelInfo])

	// Check if the model supports toggle-able reasoning
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

	const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
		// Handle @ trigger
		if (e.key === '@' && onAtTrigger) {
			setTimeout(() => {
				onAtTrigger()
			}, 0)
		}

		// Handle Enter to submit (without Shift)
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault()
			if (canSend) {
				onSubmit()
			}
		}
	}

	const canSend = !(disabled || isPending) && hasApiKey && value.trim().length > 0
	const hasAttachments = attachedNotes.length > 0

	// Get known mention titles from attached notes
	const knownMentions = useMemo(
		() => attachedNotes.map((note) => note.title).filter(Boolean),
		[attachedNotes]
	)

	// Render highlighted content with mentions
	const highlightedContent = useMemo(() => {
		return renderTextWithMentions(value, 'default', knownMentions)
	}, [value, knownMentions])

	return (
		<div
			className={cn(
				'relative rounded-lg border bg-background shadow-sm transition-shadow',
				'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
				'hover:shadow-md',
				className
			)}
		>
			{/* Attached Notes Chips */}
			{hasAttachments && (
				<div className="flex flex-wrap gap-1.5 px-3 py-2">
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
									type="button"
									variant="ghost"
								>
									<HugeiconsIcon className="size-3" icon={Cancel01Icon} />
								</Button>
							)}
						</Badge>
					))}
				</div>
			)}

			{/* Textarea with mention highlighting */}
			<div className="relative">
				{/* Textarea (text color transparent, only caret visible) */}
				<Textarea
					className={cn(
						'relative max-h-[200px] min-h-[100px] resize-none border-none bg-transparent',
						'px-4 pb-16',
						hasAttachments ? 'pt-2' : 'pt-4',
						'focus-visible:ring-0 focus-visible:ring-offset-0',
						'placeholder:text-muted-foreground/60',
						'text-transparent caret-foreground selection:bg-primary/20'
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

				{/* Highlighted content overlay (renders on top of textarea) */}
				<div
					aria-hidden="true"
					className={cn(
						'pointer-events-none absolute inset-0 z-10',
						'max-h-[200px] min-h-[100px] overflow-hidden',
						'wrap-break-word whitespace-pre-wrap',
						'px-4 pb-16',
						hasAttachments ? 'pt-2' : 'pt-4',
						'text-sm',
						'text-foreground'
					)}
				>
					{highlightedContent}
				</div>
			</div>

			{/* Bottom Actions Bar */}
			<div className="absolute right-3 bottom-3 left-3 flex items-center justify-between">
				{/* Left: Context Usage + Model Selector + Thinking Toggle */}
				<div className="flex items-center gap-1">
					{/* Context Usage Indicator */}
					{contextUsage && contextUsage.usedTokens > 0 && (
						<Context
							maxTokens={contextUsage.maxTokens}
							modelId={contextUsage.modelId}
							usage={contextUsage.sessionUsage}
							usedTokens={contextUsage.usedTokens}
						>
							<ContextTrigger
								className="h-8 gap-1.5 rounded-lg px-2 text-xs"
								size="sm"
							/>
							<ContextContent align="start" side="top">
								<ContextContentHeader />
								<ContextContentBody className="space-y-1.5">
									<ContextInputUsage />
									<ContextOutputUsage />
									<ContextReasoningUsage />
									<ContextCacheUsage />
								</ContextContentBody>
								<ContextContentFooter />
							</ContextContent>
						</Context>
					)}

					{/* Model Selector */}
					<AiModelSelector
						catalogModels={catalogModels}
						catalogProviders={catalogProviders}
						className="h-8 w-auto gap-2 rounded-lg border-0 px-3 text-xs shadow-none hover:bg-accent"
						disabled={disabled || isPending || !hasApiKey}
						onValueChange={onModelChange}
						placeholder={t('knowledge.selectModel')}
						value={selectedModel}
					/>

					{/* Thinking Toggle Button */}
					{supportsThinking && onThinkingToggle && (
						<Tooltip>
							<TooltipTrigger
								aria-label={t('knowledge.toggleThinking')}
								aria-pressed={hasToggleableReasoning ? thinkingEnabled : true}
								className={cn(
									'relative inline-flex size-8 items-center justify-center rounded-lg',
									'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
									'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
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
						<HugeiconsIcon className="size-4 animate-spin" icon={RefreshIcon} />
					) : (
						<HugeiconsIcon className="size-4" icon={ArrowMoveDownLeftIcon} />
					)}
				</Button>
			</div>
		</div>
	)
}
