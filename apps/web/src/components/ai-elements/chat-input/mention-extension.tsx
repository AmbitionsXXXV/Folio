import { mergeAttributes, Node } from '@tiptap/core'
import {
	NodeViewWrapper,
	type ReactNodeViewProps,
	ReactNodeViewRenderer,
} from '@tiptap/react'
import Suggestion from '@tiptap/suggestion'
import type { ComponentPropsWithoutRef, FC } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import tippy, { type Instance as TippyInstance } from 'tippy.js'
import { MentionBadge } from '@/components/ai-elements/mention-badge'
import {
	MentionList,
	type MentionListRef,
	type MentionSuggestionItem,
} from './mention-list'

const MENTION_TRIGGER = '@'
const MENTION_DECORATION_CLASS = 'chat-mention-suggestion'
const FALLBACK_EMPTY_TEXT = 'No matching entries'

type MentionExtensionOptions = {
	getItems: (query: string) => MentionSuggestionItem[]
	onMentionSelect?: (item: MentionSuggestionItem) => void
	getEmptyText?: (query: string) => string
}

const InlineNodeViewWrapper = NodeViewWrapper as unknown as FC<
	ComponentPropsWithoutRef<'span'> & { as?: 'span' }
>

function MentionNodeView({ node }: ReactNodeViewProps) {
	const label = typeof node.attrs.label === 'string' ? node.attrs.label : ''

	return (
		<InlineNodeViewWrapper
			as="span"
			className="inline-flex align-middle"
			contentEditable={false}
			data-mention
		>
			<MentionBadge title={label} />
		</InlineNodeViewWrapper>
	)
}

function createMentionSuggestionAdapter(options: {
	getEmptyText: (query: string) => string
}) {
	let reactRoot: Root | null = null
	let popup: TippyInstance | null = null
	let container: HTMLDivElement | null = null
	let componentRef: MentionListRef | null = null

	const render = (state: {
		items: MentionSuggestionItem[]
		query: string
		command: (item: MentionSuggestionItem) => void
	}) => {
		if (!(reactRoot && container)) return

		reactRoot.render(
			<MentionList
				command={state.command}
				emptyText={options.getEmptyText(state.query)}
				items={state.items}
				ref={(ref) => {
					componentRef = ref
				}}
			/>
		)
	}

	return {
		onStart: (props: {
			items: MentionSuggestionItem[]
			query: string
			clientRect: (() => DOMRect | null) | null
			command: (item: MentionSuggestionItem) => void
		}) => {
			container = document.createElement('div')
			container.className = 'chat-mention-container'
			document.body.appendChild(container)

			reactRoot = createRoot(container)
			render({
				items: props.items,
				query: props.query,
				command: props.command,
			})

			const getReferenceClientRect = () => props.clientRect?.() ?? new DOMRect()
			if (!props.clientRect) {
				return
			}

			popup = tippy(document.body, {
				getReferenceClientRect,
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

		onUpdate: (props: {
			items: MentionSuggestionItem[]
			query: string
			clientRect: (() => DOMRect | null) | null
			command: (item: MentionSuggestionItem) => void
		}) => {
			const firstPopup = popup
			if (!reactRoot) return
			if (!firstPopup) return

			render({
				items: props.items,
				query: props.query,
				command: props.command,
			})

			const getReferenceClientRect = () => props.clientRect?.() ?? new DOMRect()
			if (!props.clientRect) {
				return
			}

			firstPopup.setProps({
				getReferenceClientRect,
			})
		},

		onKeyDown: (props: { event: KeyboardEvent }) => {
			if (props.event.key === 'Escape') {
				popup?.hide()
				return true
			}

			if (componentRef) {
				return componentRef.onKeyDown(props.event)
			}
			return false
		},

		onExit: () => {
			popup?.destroy()
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

export const MentionExtension = Node.create<MentionExtensionOptions>({
	name: 'mention',
	inline: true,
	group: 'inline',
	atom: true,
	selectable: false,

	addOptions() {
		return {
			getItems: () => [],
			onMentionSelect: undefined,
			getEmptyText: () => FALLBACK_EMPTY_TEXT,
		}
	},

	addAttributes() {
		return {
			id: {
				default: '',
			},
			label: {
				default: '',
			},
		}
	},

	parseHTML() {
		return [
			{
				tag: 'span[data-mention]',
			},
		]
	},

	renderHTML({ HTMLAttributes }) {
		return [
			'span',
			mergeAttributes(HTMLAttributes, {
				'data-mention': '',
				'data-id': HTMLAttributes.id,
				'data-label': HTMLAttributes.label,
			}),
		]
	},

	renderText({ node }) {
		const label = typeof node.attrs.label === 'string' ? node.attrs.label : ''
		return `${MENTION_TRIGGER}${label}`
	},

	addNodeView() {
		return ReactNodeViewRenderer(MentionNodeView)
	},

	addProseMirrorPlugins() {
		const getEmptyText = this.options.getEmptyText ?? (() => FALLBACK_EMPTY_TEXT)
		const suggestionAdapter = createMentionSuggestionAdapter({
			getEmptyText,
		})

		return [
			Suggestion({
				editor: this.editor,
				char: MENTION_TRIGGER,
				startOfLine: false,
				decorationClass: MENTION_DECORATION_CLASS,
				items: ({ query }) => this.options.getItems(query),
				command: ({ editor, range, props }) => {
					const item = props as MentionSuggestionItem
					if (!item.title) return

					editor
						.chain()
						.focus()
						.insertContentAt(range, [
							{
								type: this.name,
								attrs: {
									id: item.id,
									label: item.title,
								},
							},
							{
								type: 'text',
								text: ' ',
							},
						])
						.run()

					this.options.onMentionSelect?.(item)
				},
				render: () => ({
					onStart: (props) => {
						suggestionAdapter.onStart({
							items: props.items as MentionSuggestionItem[],
							query: props.query,
							clientRect: props.clientRect ?? null,
							command: (item) => props.command(item),
						})
					},
					onUpdate: (props) => {
						suggestionAdapter.onUpdate({
							items: props.items as MentionSuggestionItem[],
							query: props.query,
							clientRect: props.clientRect ?? null,
							command: (item) => props.command(item),
						})
					},
					onKeyDown: (props) => suggestionAdapter.onKeyDown(props),
					onExit: () => suggestionAdapter.onExit(),
				}),
			}),
		]
	},
})
