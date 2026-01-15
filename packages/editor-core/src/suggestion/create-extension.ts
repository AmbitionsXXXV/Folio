import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import type { SuggestionExtensionOptions, SuggestionState } from './types'

/**
 * Create a suggestion extension with platform-specific UI adapter
 *
 * This factory creates a Tiptap extension that handles the suggestion logic
 * while delegating UI rendering to the provided adapter.
 *
 * @example
 * ```typescript
 * const slashCommand = createSuggestionExtension({
 *   char: '/',
 *   items: ({ query }) => filterCommands(commands, query),
 *   adapter: myReactAdapter,
 *   command: ({ editor, range, props }) => props.execute({ editor, range }),
 * })
 * ```
 */
export function createSuggestionExtension<T>(
	options: SuggestionExtensionOptions<T>
) {
	const {
		char = '/',
		startOfLine = false,
		decorationClass = 'suggestion',
		items,
		adapter,
		command,
	} = options

	return Extension.create({
		name: 'suggestion',

		addProseMirrorPlugins() {
			return [
				Suggestion({
					editor: this.editor,
					char,
					startOfLine,
					decorationClass,
					items: ({ query }) => items({ query, editor: this.editor }),
					command: ({ editor, range, props }) => {
						command({ editor, range, props })
					},
					render: () => {
						return {
							onStart: (props) => {
								const state: SuggestionState<T> = {
									items: props.items as T[],
									query: props.query,
									clientRect: props.clientRect ?? null,
									command: (item: T) => props.command(item),
									editor: props.editor,
									range: props.range,
								}
								adapter.onStart(state)
							},

							onUpdate: (props) => {
								const state: SuggestionState<T> = {
									items: props.items as T[],
									query: props.query,
									clientRect: props.clientRect ?? null,
									command: (item: T) => props.command(item),
									editor: props.editor,
									range: props.range,
								}
								adapter.onUpdate(state)
							},

							onKeyDown: (props) => {
								return adapter.onKeyDown(props.event)
							},

							onExit: () => {
								adapter.onExit()
							},
						}
					},
				}),
			]
		},
	})
}
