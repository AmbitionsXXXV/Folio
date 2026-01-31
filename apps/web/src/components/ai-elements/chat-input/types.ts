import type { FileUIPart } from 'ai'
import type { RefObject } from 'react'
import type { PromptInputMessage } from '@/components/ai-elements/prompt-input'
import type { CatalogModel, CatalogProvider } from '@/hooks/use-ai-model-catalog'

/** Attached note info for display */
export type AttachedNote = {
	id: string
	title: string
}

/** File attachment with unique id for controlled mode */
export type AttachedFile = FileUIPart & { id: string }

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
	onSubmit: (message: PromptInputMessage) => void
	disabled?: boolean
	isPending?: boolean
	placeholder?: string
	className?: string
	// Model selection props
	selectedProvider: string
	selectedModel: string
	onModelChange: (model: string, providerId?: string) => void
	hasApiKey: boolean
	// Model catalog (from useAiModelCatalog)
	catalogProviders: CatalogProvider[]
	catalogModels: CatalogModel[]
	// Thinking/reasoning toggle
	thinkingEnabled?: boolean
	onThinkingToggle?: (enabled: boolean) => void
	// Note attachment props (controlled)
	attachedNotes?: AttachedNote[]
	onRemoveNoteAttachment?: (noteId: string) => void
	onAtTrigger?: () => void
	/** External ref for the textarea */
	textareaRef?: RefObject<HTMLTextAreaElement | null>
	/** Context usage for the current session */
	contextUsage?: ChatContextUsage
}
