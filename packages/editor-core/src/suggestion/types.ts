import type { Editor, Range } from '@tiptap/core'

/**
 * Suggestion state passed to the UI adapter
 */
export type SuggestionState<T> = {
	/** Filtered items to display */
	items: T[]
	/** Current search query */
	query: string
	/** Function to get popup position */
	clientRect: (() => DOMRect | null) | null
	/** Execute a command with the selected item */
	command: (item: T) => void
	/** Editor instance */
	editor: Editor
	/** Current range to replace */
	range: Range
}

/**
 * UI adapter interface for platform-specific rendering
 * Platforms implement this to provide their own popup/menu UI
 */
export type SuggestionAdapter<T> = {
	/** Called when suggestion popup should open */
	onStart: (state: SuggestionState<T>) => void
	/** Called when suggestion state updates (query, items, position) */
	onUpdate: (state: SuggestionState<T>) => void
	/** Called when suggestion popup should close */
	onExit: () => void
	/** Handle keyboard events, return true if handled */
	onKeyDown: (event: KeyboardEvent) => boolean
}

/**
 * Suggestion extension options
 */
export type SuggestionExtensionOptions<T> = {
	/** Character that triggers the suggestion (default: '/') */
	char?: string
	/** Only trigger at start of line */
	startOfLine?: boolean
	/** CSS class for the decoration */
	decorationClass?: string
	/** Get items based on query */
	items: (props: { query: string; editor: Editor }) => T[]
	/** UI adapter for rendering */
	adapter: SuggestionAdapter<T>
	/** Execute command when item is selected */
	command: (props: { editor: Editor; range: Range; props: T }) => void
}

/**
 * Keyboard navigation handler ref
 * Used by UI components to register their keyboard handlers
 */
export type KeyboardHandlerRef = {
	onKeyDown: (event: KeyboardEvent) => boolean
}
