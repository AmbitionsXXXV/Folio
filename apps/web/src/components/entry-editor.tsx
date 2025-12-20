'use client'

import Placeholder from '@tiptap/extension-placeholder'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useCallback, useEffect, useRef } from 'react'

type EntryEditorProps = {
	content: string
	onChange?: (content: string) => void
	placeholder?: string
	editable?: boolean
	autoFocus?: boolean
	className?: string
}

/**
 * Tiptap-based rich text editor for entry content
 * Supports Markdown shortcuts and auto-save
 */
export function EntryEditor({
	content,
	onChange,
	placeholder = 'Write something...',
	editable = true,
	autoFocus = false,
	className = '',
}: EntryEditorProps) {
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading: {
					levels: [1, 2, 3],
				},
			}),
			Placeholder.configure({
				placeholder,
				emptyEditorClass: 'is-editor-empty',
			}),
		],
		content,
		editable,
		immediatelyRender: false,
		editorProps: {
			attributes: {
				class: `prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] ${className}`,
			},
		},
		onUpdate: ({ editor: editorInstance }) => {
			if (onChange) {
				// Debounce the onChange callback for auto-save
				if (debounceRef.current) {
					clearTimeout(debounceRef.current)
				}
				debounceRef.current = setTimeout(() => {
					onChange(editorInstance.getHTML())
				}, 500)
			}
		},
	})

	// Auto-focus when requested
	useEffect(() => {
		if (autoFocus && editor) {
			editor.commands.focus('end')
		}
	}, [autoFocus, editor])

	// Update content when it changes externally
	useEffect(() => {
		if (editor && content !== editor.getHTML()) {
			editor.commands.setContent(content)
		}
	}, [content, editor])

	// Cleanup debounce on unmount
	useEffect(
		() => () => {
			if (debounceRef.current) {
				clearTimeout(debounceRef.current)
			}
		},
		[]
	)

	if (!editor) {
		return (
			<div className="animate-pulse">
				<div className="mb-2 h-4 w-3/4 rounded bg-muted" />
				<div className="h-4 w-1/2 rounded bg-muted" />
			</div>
		)
	}

	return (
		<div className="entry-editor">
			<EditorContent editor={editor} />
		</div>
	)
}

/**
 * Hook to get editor commands for toolbar integration
 */
export function useEntryEditorCommands(editor: ReturnType<typeof useEditor>) {
	const toggleBold = useCallback(() => {
		editor?.chain().focus().toggleBold().run()
	}, [editor])

	const toggleItalic = useCallback(() => {
		editor?.chain().focus().toggleItalic().run()
	}, [editor])

	const toggleHeading = useCallback(
		(level: 1 | 2 | 3) => {
			editor?.chain().focus().toggleHeading({ level }).run()
		},
		[editor]
	)

	const toggleBulletList = useCallback(() => {
		editor?.chain().focus().toggleBulletList().run()
	}, [editor])

	const toggleOrderedList = useCallback(() => {
		editor?.chain().focus().toggleOrderedList().run()
	}, [editor])

	const toggleBlockquote = useCallback(() => {
		editor?.chain().focus().toggleBlockquote().run()
	}, [editor])

	const toggleCode = useCallback(() => {
		editor?.chain().focus().toggleCode().run()
	}, [editor])

	const toggleCodeBlock = useCallback(() => {
		editor?.chain().focus().toggleCodeBlock().run()
	}, [editor])

	return {
		toggleBold,
		toggleItalic,
		toggleHeading,
		toggleBulletList,
		toggleOrderedList,
		toggleBlockquote,
		toggleCode,
		toggleCodeBlock,
		isActive: (name: string, attributes?: Record<string, unknown>) =>
			editor?.isActive(name, attributes) ?? false,
	}
}
