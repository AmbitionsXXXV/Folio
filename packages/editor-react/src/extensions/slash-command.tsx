import {
	filterCommands,
	type SlashCommandItem,
	type SuggestionAdapter,
	type SuggestionState,
	type TranslateFunction,
} from '@folionote/editor-core'
import { Extension } from '@tiptap/core'
import Suggestion from '@tiptap/suggestion'
import { createRoot, type Root } from 'react-dom/client'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import type { IconMapType } from '../components/icon-map'
import {
	type CommandListRef,
	SlashCommandList,
} from '../components/slash-command-list'

/**
 * Slash command extension options
 */
export type SlashCommandExtensionOptions = {
	/** Slash commands to display */
	commands: SlashCommandItem[]
	/** Custom icon map */
	iconMap?: IconMapType
	/** Translation function */
	t?: TranslateFunction
	/** Trigger character */
	char?: string
}

/**
 * Create React-based suggestion adapter using tippy.js for positioning
 */
function createReactSuggestionAdapter(options: {
	iconMap?: IconMapType
	emptyText?: string
	defaultGroupName?: string
}): SuggestionAdapter<SlashCommandItem> & { getRef: () => CommandListRef | null } {
	let reactRoot: Root | null = null
	let popup: TippyInstance[] | null = null
	let container: HTMLDivElement | null = null
	let componentRef: CommandListRef | null = null

	const render = (state: SuggestionState<SlashCommandItem>) => {
		if (!(reactRoot && container)) return

		reactRoot.render(
			<SlashCommandList
				command={(item) => state.command(item)}
				defaultGroupName={options.defaultGroupName}
				emptyText={options.emptyText}
				iconMap={options.iconMap}
				items={state.items}
				ref={(r) => {
					componentRef = r
				}}
			/>
		)
	}

	return {
		getRef: () => componentRef,

		onStart: (state) => {
			container = document.createElement('div')
			container.className = 'slash-command-container'
			document.body.appendChild(container)

			reactRoot = createRoot(container)
			render(state)

			popup = tippy('body', {
				getReferenceClientRect: state.clientRect as () => DOMRect,
				appendTo: () => document.body,
				content: container,
				showOnCreate: true,
				interactive: true,
				trigger: 'manual',
				placement: 'bottom-start',
				animation: 'shift-away',
				maxWidth: 320,
				offset: [0, 8],
			})
		},

		onUpdate: (state) => {
			const firstPopup = popup?.[0]
			if (!reactRoot) return
			if (!firstPopup) return

			render(state)

			firstPopup.setProps({
				getReferenceClientRect: state.clientRect as () => DOMRect,
			})
		},

		onKeyDown: (event: KeyboardEvent) => {
			if (event.key === 'Escape') {
				popup?.[0]?.hide()
				return true
			}

			if (componentRef) {
				return componentRef.onKeyDown(event)
			}
			return false
		},

		onExit: () => {
			popup?.[0]?.destroy()
			reactRoot?.unmount()
			if (container?.parentNode) {
				container.parentNode.removeChild(container)
			}
			popup = null
			reactRoot = null
			container = null
			componentRef = null
		},
	}
}

/**
 * Create slash command extension for React
 */
export function createSlashCommandExtension(options: SlashCommandExtensionOptions) {
	const { commands, iconMap, t, char = '/' } = options

	const adapter = createReactSuggestionAdapter({
		iconMap,
		emptyText:
			t?.('editor.slashCommand.noMatchingCommands') ?? 'No matching commands',
		defaultGroupName: t?.('editor.slashCommand.basic') ?? 'Basic',
	})

	return Extension.create({
		name: 'slashCommand',

		addProseMirrorPlugins() {
			return [
				Suggestion({
					editor: this.editor,
					char,
					startOfLine: false,
					decorationClass: 'slash-command-suggestion',
					items: ({ query }) => filterCommands(commands, query),
					command: ({ editor, range, props }) => {
						props.command({ editor, range })
					},
					render: () => ({
						onStart: (props) => {
							adapter.onStart({
								items: props.items as SlashCommandItem[],
								query: props.query,
								clientRect: props.clientRect ?? null,
								command: (item) => props.command(item),
								editor: props.editor,
								range: props.range,
							})
						},
						onUpdate: (props) => {
							adapter.onUpdate({
								items: props.items as SlashCommandItem[],
								query: props.query,
								clientRect: props.clientRect ?? null,
								command: (item) => props.command(item),
								editor: props.editor,
								range: props.range,
							})
						},
						onKeyDown: (props) => adapter.onKeyDown(props.event),
						onExit: () => adapter.onExit(),
					}),
				}),
			]
		},
	})
}
