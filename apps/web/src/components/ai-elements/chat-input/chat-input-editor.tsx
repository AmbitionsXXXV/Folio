import { cn } from '@folionote/ui/lib/utils'
import { useQuery } from '@tanstack/react-query'
import type { JSONContent } from '@tiptap/core'
import Placeholder from '@tiptap/extension-placeholder'
import { type Editor, EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { usePromptInputAttachments } from '@/components/ai-elements/prompt-input'
import type { Entry } from '@/types'
import { orpc } from '@/utils/orpc'
import { MentionExtension } from './mention-extension'
import type { MentionSuggestionItem } from './mention-list'
import type { AttachedNote } from './types'

const MENTION_QUERY_LIMIT = 100
const MENTION_SUGGESTION_MAX_ITEMS = 8

type MentionSegment =
	| { type: 'text'; text: string }
	| { type: 'mention'; id: string; title: string }

type ChatInputEditorProps = {
	value: string
	onChange: (value: string) => void
	placeholder?: string
	disabled: boolean
	hasApiKey: boolean
	attachedNotes: AttachedNote[]
	onAddNoteAttachment?: (note: AttachedNote) => void
}

function splitTextByMentions(
	text: string,
	mentions: AttachedNote[]
): MentionSegment[] {
	const activeMentions = mentions.filter(
		(mention) => mention.title.trim().length > 0
	)
	if (activeMentions.length === 0) {
		return [{ type: 'text', text }]
	}

	const segments: MentionSegment[] = []
	let remaining = text

	while (remaining.length > 0) {
		let earliestMatch: { index: number; mention: AttachedNote } | null = null

		for (const mention of activeMentions) {
			const pattern = `@${mention.title}`
			const index = remaining.indexOf(pattern)
			if (index === -1) continue
			if (earliestMatch === null || index < earliestMatch.index) {
				earliestMatch = { index, mention }
			}
		}

		if (!earliestMatch) {
			segments.push({ type: 'text', text: remaining })
			break
		}

		if (earliestMatch.index > 0) {
			segments.push({
				type: 'text',
				text: remaining.slice(0, earliestMatch.index),
			})
		}

		segments.push({
			type: 'mention',
			id: earliestMatch.mention.id,
			title: earliestMatch.mention.title,
		})

		const consumeLength = earliestMatch.mention.title.length + 1
		remaining = remaining.slice(earliestMatch.index + consumeLength)
	}

	return segments
}

function buildParagraphContent(
	text: string,
	mentions: AttachedNote[]
): JSONContent[] {
	const segments = splitTextByMentions(text, mentions)
	const content: JSONContent[] = []

	for (const segment of segments) {
		if (segment.type === 'text') {
			if (segment.text.length > 0) {
				content.push({ type: 'text', text: segment.text })
			}
			continue
		}
		content.push({
			type: 'mention',
			attrs: {
				id: segment.id,
				label: segment.title,
			},
		})
	}

	return content
}

function buildEditorContent(text: string, mentions: AttachedNote[]): JSONContent {
	const lines = text.split('\n')
	const content = lines.map((line) => {
		const paragraphContent = buildParagraphContent(line, mentions)
		return paragraphContent.length > 0
			? { type: 'paragraph', content: paragraphContent }
			: { type: 'paragraph' }
	})

	return {
		type: 'doc',
		content: content.length > 0 ? content : [{ type: 'paragraph' }],
	}
}

function filterMentionItems(
	items: MentionSuggestionItem[],
	query: string
): MentionSuggestionItem[] {
	const normalizedQuery = query.trim().toLowerCase()
	const filteredItems: MentionSuggestionItem[] = []

	for (const item of items) {
		if (filteredItems.length >= MENTION_SUGGESTION_MAX_ITEMS) {
			break
		}
		if (!normalizedQuery) {
			filteredItems.push(item)
			continue
		}
		if (item.title.toLowerCase().includes(normalizedQuery)) {
			filteredItems.push(item)
		}
	}

	return filteredItems
}

export function ChatInputEditor({
	value,
	onChange,
	placeholder,
	disabled,
	hasApiKey,
	attachedNotes,
	onAddNoteAttachment,
}: ChatInputEditorProps) {
	const { t: translate } = useTranslation()
	const attachments = usePromptInputAttachments()
	const editorRef = useRef<Editor | null>(null)
	const lastInternalValueRef = useRef<string | null>(null)
	const previousValueRef = useRef(value)
	const mentionItemsRef = useRef<MentionSuggestionItem[]>([])
	const addNoteAttachmentRef = useRef(onAddNoteAttachment)

	useEffect(() => {
		addNoteAttachmentRef.current = onAddNoteAttachment
	}, [onAddNoteAttachment])

	const attachedNoteIds = useMemo(
		() => new Set(attachedNotes.map((note) => note.id)),
		[attachedNotes]
	)

	const { data: entriesData } = useQuery({
		queryKey: ['entries', 'library', 'mention'],
		queryFn: () =>
			orpc.entries.list.call({
				filter: 'all',
				limit: MENTION_QUERY_LIMIT,
			}),
	})

	const mentionCandidates = useMemo<MentionSuggestionItem[]>(() => {
		const entries = (entriesData?.items ?? []) as Entry[]
		const items: MentionSuggestionItem[] = []

		for (const entry of entries) {
			if (entry.isInbox) {
				continue
			}
			if (attachedNoteIds.has(entry.id)) {
				continue
			}

			const rawTitle = entry.title?.trim() ?? ''
			const title =
				rawTitle.length > 0 ? rawTitle : translate('entryPicker.untitled')
			items.push({ id: entry.id, title })
		}

		return items
	}, [entriesData, attachedNoteIds, translate])

	useEffect(() => {
		mentionItemsRef.current = mentionCandidates
	}, [mentionCandidates])

	const getEmptyText = useMemo(() => {
		return (query: string) => {
			if (mentionItemsRef.current.length === 0) {
				return translate('entryPicker.noEntriesAvailable')
			}
			if (query.trim().length > 0) {
				return translate('entryPicker.noMatchingEntries')
			}
			return translate('entryPicker.noEntriesAvailable')
		}
	}, [translate])

	const mentionExtension = useMemo(
		() =>
			MentionExtension.configure({
				getItems: (query) => filterMentionItems(mentionItemsRef.current, query),
				getEmptyText,
				onMentionSelect: (item) => {
					addNoteAttachmentRef.current?.({ id: item.id, title: item.title })
				},
			}),
		[getEmptyText]
	)

	const hasText = value.trim().length > 0
	const hasAttachments = attachments.files.length > 0
	const canSubmit = !disabled && hasApiKey && (hasText || hasAttachments)
	const canSubmitRef = useRef(canSubmit)

	useEffect(() => {
		canSubmitRef.current = canSubmit
	}, [canSubmit])

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				blockquote: false,
				bulletList: false,
				orderedList: false,
				listItem: false,
				heading: false,
				codeBlock: false,
				code: false,
				bold: false,
				italic: false,
				strike: false,
				horizontalRule: false,
				dropcursor: false,
				gapcursor: false,
			}),
			Placeholder.configure({
				placeholder: placeholder ?? '',
				emptyEditorClass: 'is-editor-empty',
			}),
			mentionExtension,
		],
		content: buildEditorContent(value, attachedNotes),
		editable: !disabled && hasApiKey,
		immediatelyRender: false,
		editorProps: {
			attributes: {
				class: cn(
					'chat-input-editor',
					'max-h-[200px] min-h-[100px] overflow-y-auto',
					'px-4 py-3 text-sm leading-5',
					'text-foreground outline-none',
					'whitespace-pre-wrap break-words'
				),
				'aria-placeholder': placeholder ?? '',
				'data-placeholder': placeholder ?? '',
				'aria-multiline': 'true',
				'aria-disabled': (!hasApiKey || disabled).toString(),
				spellcheck: 'true',
			},
			handleKeyDown: (_view, event) => {
				if (event.key === 'Enter' && !event.shiftKey && !event.isComposing) {
					event.preventDefault()
					if (canSubmitRef.current) {
						const form = editorRef.current?.view.dom.closest('form')
						form?.requestSubmit()
					}
					return true
				}
				return false
			},
			handlePaste: (_view, event) => {
				const items = event.clipboardData?.items
				if (!items) {
					return false
				}

				const files: File[] = []
				for (const item of items) {
					if (item.kind === 'file') {
						const file = item.getAsFile()
						if (file) {
							files.push(file)
						}
					}
				}

				if (files.length === 0) {
					return false
				}

				event.preventDefault()
				attachments.add(files)
				return true
			},
		},
		onCreate: ({ editor: editorInstance }) => {
			editorRef.current = editorInstance
		},
		onDestroy: () => {
			editorRef.current = null
		},
		onUpdate: ({ editor: editorInstance }) => {
			const nextValue = editorInstance.getText()
			if (nextValue === value) {
				return
			}
			lastInternalValueRef.current = nextValue
			onChange(nextValue)
		},
	})

	useEffect(() => {
		if (!editor) return
		editor.setEditable(!disabled && hasApiKey)
	}, [editor, disabled, hasApiKey])

	useEffect(() => {
		if (!editor) {
			return
		}

		const didValueChange = value !== previousValueRef.current
		previousValueRef.current = value

		const hasPendingInternalValue =
			lastInternalValueRef.current !== null && value !== lastInternalValueRef.current

		if (!didValueChange && hasPendingInternalValue) {
			return
		}

		if (didValueChange && value === lastInternalValueRef.current) {
			lastInternalValueRef.current = null
			return
		}

		const nextContent = buildEditorContent(value, attachedNotes)
		editor.commands.setContent(nextContent, { emitUpdate: false })
	}, [editor, value, attachedNotes])

	if (!editor) {
		return (
			<div
				aria-busy="true"
				className="min-h-[100px] w-full px-4 py-3 text-muted-foreground text-sm"
				role="status"
			>
				{translate('common.loading')}
			</div>
		)
	}

	return <EditorContent editor={editor} />
}
