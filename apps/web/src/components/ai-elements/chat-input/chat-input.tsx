import { cn } from '@folionote/ui/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@folionote/ui/tooltip'
import { AiBrain01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import {
	type ClipboardEventHandler,
	type KeyboardEvent,
	useCallback,
	useMemo,
} from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
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
import {
	PromptInput,
	PromptInputActionAddAttachments,
	PromptInputActionMenu,
	PromptInputActionMenuContent,
	PromptInputActionMenuTrigger,
	PromptInputAttachments,
	PromptInputBody,
	PromptInputFooter,
	PromptInputHeader,
	type PromptInputMessage,
	PromptInputSubmit,
	PromptInputTools,
	usePromptInputAttachments,
} from '@/components/ai-elements/prompt-input'
import { FileAttachment } from './file-attachment'
import { HighlightedTextarea } from './highlighted-textarea'
import { NoteAttachment } from './note-attachment'
import type { ChatInputProps } from './types'

const FILE_ATTACHMENT_ACCEPT = 'image/*,application/pdf'
const FILE_ATTACHMENT_MAX_FILES = 5
const FILE_ATTACHMENT_MAX_BYTES = 5_242_880
const FILE_SIZE_KB = 1024
const FILE_SIZE_MB = FILE_SIZE_KB * 1024
const MENTION_TRIGGER_DELAY_MS = 0

type AttachmentError = {
	code: 'max_files' | 'max_file_size' | 'accept'
	message: string
}

type ChatInputAttachmentsHeaderProps = {
	attachedNotes: NonNullable<ChatInputProps['attachedNotes']>
	onRemoveNoteAttachment?: ChatInputProps['onRemoveNoteAttachment']
}

function ChatInputAttachmentsHeader({
	attachedNotes,
	onRemoveNoteAttachment,
}: ChatInputAttachmentsHeaderProps) {
	const attachments = usePromptInputAttachments()
	const hasFileAttachments = attachments.files.length > 0
	const hasNoteAttachments = attachedNotes.length > 0
	const hasAttachments = hasFileAttachments || hasNoteAttachments

	if (!hasAttachments) {
		return null
	}

	return (
		<PromptInputHeader className="gap-2 px-3 pt-2">
			{attachedNotes.map((note) => (
				<NoteAttachment
					key={`note-${note.id}`}
					note={note}
					onRemove={onRemoveNoteAttachment}
				/>
			))}
			<PromptInputAttachments>
				{(file) => <FileAttachment file={file} onRemove={attachments.remove} />}
			</PromptInputAttachments>
		</PromptInputHeader>
	)
}

type ChatInputTextareaProps = {
	disabled: boolean
	hasApiKey: boolean
	knownMentions: string[]
	onAtTrigger?: () => void
	onChange: (value: string) => void
	placeholder?: string
	textareaRef?: ChatInputProps['textareaRef']
	value: string
}

function ChatInputTextarea({
	disabled,
	hasApiKey,
	knownMentions,
	onAtTrigger,
	onChange,
	placeholder,
	textareaRef,
	value,
}: ChatInputTextareaProps) {
	const attachments = usePromptInputAttachments()
	const hasAttachments = attachments.files.length > 0
	const hasText = Boolean(value.trim())
	const canSend = !disabled && hasApiKey && (hasText || hasAttachments)

	const highlightedContent = useMemo(() => {
		return renderTextWithMentions(value, 'default', knownMentions)
	}, [value, knownMentions])

	const handleKeyDown = useCallback(
		(e: KeyboardEvent<HTMLTextAreaElement>) => {
			// Handle @ trigger
			if (e.key === '@' && onAtTrigger) {
				setTimeout(() => {
					onAtTrigger()
				}, MENTION_TRIGGER_DELAY_MS)
			}

			// Handle Enter to submit (without Shift)
			if (e.key === 'Enter' && !e.shiftKey) {
				e.preventDefault()
				if (canSend) {
					e.currentTarget.form?.requestSubmit()
				}
			}
		},
		[canSend, onAtTrigger]
	)

	const handlePaste: ClipboardEventHandler<HTMLTextAreaElement> = useCallback(
		(event) => {
			const clipboardFiles = event.clipboardData?.files
			if (!clipboardFiles || clipboardFiles.length === 0) {
				return
			}
			event.preventDefault()
			attachments.add(clipboardFiles)
		},
		[attachments]
	)

	return (
		<HighlightedTextarea
			disabled={disabled || !hasApiKey}
			highlightedContent={highlightedContent}
			name="message"
			onChange={onChange}
			onKeyDown={handleKeyDown}
			onPaste={handlePaste}
			placeholder={placeholder}
			textareaRef={textareaRef}
			value={value}
		/>
	)
}

type ChatInputSubmitProps = {
	disabled: boolean
	hasApiKey: boolean
	isPending: boolean
	value: string
}

function ChatInputSubmit({
	disabled,
	hasApiKey,
	isPending,
	value,
}: ChatInputSubmitProps) {
	const { t } = useTranslation()
	const attachments = usePromptInputAttachments()
	const hasAttachments = attachments.files.length > 0
	const hasMessage = Boolean(value.trim())
	const canSend = !disabled && hasApiKey && (hasMessage || hasAttachments)

	return (
		<PromptInputSubmit
			aria-label={t('knowledge.send')}
			disabled={!canSend}
			status={isPending ? 'submitted' : 'ready'}
		/>
	)
}

function formatFileSize(bytes: number): string {
	if (bytes >= FILE_SIZE_MB) {
		return `${Math.round(bytes / FILE_SIZE_MB)}\u00a0MB`
	}
	if (bytes >= FILE_SIZE_KB) {
		return `${Math.round(bytes / FILE_SIZE_KB)}\u00a0KB`
	}
	return `${bytes}\u00a0B`
}

function getAttachmentErrorMessage(
	t: ReturnType<typeof useTranslation>['t'],
	error: AttachmentError
): string {
	if (error.code === 'max_files') {
		return t('knowledge.attachments.errorMaxFiles', {
			count: FILE_ATTACHMENT_MAX_FILES,
		})
	}
	if (error.code === 'max_file_size') {
		return t('knowledge.attachments.errorMaxFileSize', {
			size: formatFileSize(FILE_ATTACHMENT_MAX_BYTES),
		})
	}
	return t('knowledge.attachments.errorInvalidType')
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
	onRemoveNoteAttachment,
	onAtTrigger,
	textareaRef,
	contextUsage,
}: ChatInputProps) {
	const { t } = useTranslation()

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

	const isDisabled = disabled || isPending

	// Get known mention titles from attached notes
	const knownMentions = useMemo(
		() => attachedNotes.map((note) => note.title).filter(Boolean),
		[attachedNotes]
	)

	const handlePromptSubmit = (message: PromptInputMessage) => {
		if (isDisabled || !hasApiKey) return
		const hasText = Boolean(message.text.trim())
		const hasFiles = message.files.length > 0
		const hasContent = hasText || hasFiles
		if (!hasContent) return
		onSubmit(message)
	}

	return (
		<PromptInput
			accept={FILE_ATTACHMENT_ACCEPT}
			className={className}
			globalDrop
			maxFileSize={FILE_ATTACHMENT_MAX_BYTES}
			maxFiles={FILE_ATTACHMENT_MAX_FILES}
			multiple
			onError={(error) => {
				toast.error(getAttachmentErrorMessage(t, error))
			}}
			onSubmit={handlePromptSubmit}
		>
			{/* Attachments (Notes + Files) */}
			<ChatInputAttachmentsHeader
				attachedNotes={attachedNotes}
				onRemoveNoteAttachment={onRemoveNoteAttachment}
			/>

			<PromptInputBody>
				<ChatInputTextarea
					disabled={isDisabled}
					hasApiKey={hasApiKey}
					knownMentions={knownMentions}
					onAtTrigger={onAtTrigger}
					onChange={onChange}
					placeholder={
						hasApiKey
							? placeholder || t('knowledge.inputPlaceholder')
							: t('knowledge.configureApiKeyFirst')
					}
					textareaRef={textareaRef}
					value={value}
				/>
			</PromptInputBody>

			<PromptInputFooter className="px-3">
				<PromptInputTools>
					<PromptInputActionMenu>
						<PromptInputActionMenuTrigger
							aria-label={t('knowledge.addAttachments')}
							disabled={isDisabled || !hasApiKey}
						/>
						<PromptInputActionMenuContent>
							<PromptInputActionAddAttachments
								label={t('knowledge.addAttachments')}
							/>
						</PromptInputActionMenuContent>
					</PromptInputActionMenu>

					{/* Model Selector */}
					<AiModelSelector
						catalogModels={catalogModels}
						catalogProviders={catalogProviders}
						className="h-8 w-auto gap-2 rounded-lg border-0 px-3 text-xs shadow-none hover:bg-accent"
						disabled={isDisabled || !hasApiKey}
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
				</PromptInputTools>

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

					<ChatInputSubmit
						disabled={isDisabled}
						hasApiKey={hasApiKey}
						isPending={isPending}
						value={value}
					/>
				</div>
			</PromptInputFooter>
		</PromptInput>
	)
}
