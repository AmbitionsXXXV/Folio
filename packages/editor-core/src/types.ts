import type { Editor, Range } from '@tiptap/core'

/**
 * Icon identifiers for slash commands
 * Platforms map these to their respective icon components
 */
export type IconId =
	| 'heading1'
	| 'heading2'
	| 'heading3'
	| 'quote'
	| 'code'
	| 'bulletList'
	| 'orderedList'
	| 'divider'
	| 'tag'
	| 'ref'
	| 'source'
	| 'table'

/**
 * Context passed to command execution
 */
export type CommandContext = {
	editor: Editor
	range: Range
}

/**
 * Platform-agnostic slash command definition
 * Does not include any UI elements (icons, React components)
 */
export type SlashCommandDefinition = {
	/** Unique identifier for the command */
	id: string
	/** i18n key for the command title */
	titleKey: string
	/** i18n key for the command description */
	descriptionKey: string
	/** Icon identifier - platforms map this to their icon components */
	iconId: IconId
	/** Keywords for fuzzy search */
	keywords?: string[]
	/** i18n key for the group name */
	groupKey?: string
	/** Execute the command */
	execute: (context: CommandContext) => void
}

/**
 * Resolved slash command item with translated strings
 * Used after applying translations
 */
export type SlashCommandItem = {
	id: string
	title: string
	description: string
	iconId: IconId
	keywords?: string[]
	group?: string
	command: (props: { editor: Editor; range: Range }) => void
}

/**
 * Translation function type
 */
export type TranslateFunction = (key: string) => string

/**
 * Content format for the editor
 */
export type ContentFormat = 'json' | 'html'
