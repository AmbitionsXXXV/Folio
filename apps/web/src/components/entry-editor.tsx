import {
	CustomCaret,
	CustomLink,
	createSlashCommandExtension,
	getResolvedDefaultCommands,
	PasteHandler,
	type PasteStrategy,
	type SlashCommandItem,
	useEditorCommands,
} from '@folionote/editor-react'
import { CodeBlockShiki } from '@folionote/editor-react/extensions'
import type { JSONContent } from '@tiptap/core'
import Placeholder from '@tiptap/extension-placeholder'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'

/**
 * 内容格式类型
 * - json: ProseMirror JSON 格式（推荐）
 * - html: HTML 字符串格式（向后兼容）
 */
type ContentFormat = 'json' | 'html'

type EntryEditorProps = {
	/** 初始内容，可以是 JSON 字符串或 HTML */
	content: string
	/** 内容变更回调 */
	onChange?: (content: string, json: string) => void
	/** 内容格式，默认 'json' */
	contentFormat?: ContentFormat
	placeholder?: string
	editable?: boolean
	autoFocus?: boolean
	className?: string
	/** Additional slash commands to include */
	additionalCommands?: SlashCommandItem[]
	/** 粘贴策略：'preserve' 保留富文本结构，'plain' 转换为纯文本 */
	pasteStrategy?: PasteStrategy
}

/**
 * 解析内容字符串为编辑器可用的格式
 */
function parseContent(content: string, format: ContentFormat): string | JSONContent {
	if (!content) {
		return ''
	}

	if (format === 'json') {
		try {
			return JSON.parse(content) as JSONContent
		} catch {
			// 如果 JSON 解析失败，尝试作为 HTML 处理
			return content
		}
	}

	return content
}

/**
 * A TipTap-based rich text editor for editing entry content with Markdown shortcuts and debounced auto-save.
 *
 * @param content - Initial content displayed in the editor (JSON string or HTML).
 * @param onChange - Optional callback invoked with the editor's current content after edits (debounced 500ms).
 *                   Returns both HTML and JSON string formats.
 * @param contentFormat - Content format: 'json' (recommended) or 'html' (backward compatible). Defaults to 'json'.
 * @param placeholder - Text shown when the editor is empty; defaults to "Write something...".
 * @param editable - Whether the editor is editable; defaults to `true`.
 * @param autoFocus - If `true`, focuses the editor and places the cursor at the end on mount; defaults to `false`.
 * @param className - Additional CSS classes applied to the editor container.
 * @returns The rendered editor React element.
 */
export function EntryEditor({
	content,
	onChange,
	contentFormat = 'json',
	placeholder = 'Write something...',
	editable = true,
	autoFocus = false,
	className = '',
	additionalCommands = [],
	pasteStrategy = 'preserve',
}: EntryEditorProps) {
	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
	const { t } = useTranslation()
	// 跟踪最后一次内部更新的 content，用于避免 setContent 重置 undo 历史
	const lastInternalContentRef = useRef<string | null>(null)

	// Combine default commands with additional commands
	const commands = useMemo(() => {
		const defaults = getResolvedDefaultCommands(t)
		return [...defaults, ...additionalCommands]
	}, [additionalCommands, t])

	// Parse initial content based on format
	const initialContent = useMemo(
		() => parseContent(content, contentFormat),
		// eslint-disable-next-line react-hooks/exhaustive-deps -- 只在初始化时解析
		[]
	)

	const editor = useEditor({
		extensions: [
			StarterKit.configure({
				heading: {
					levels: [1, 2, 3],
				},
				// Disable the default code block in favor of CodeBlockShiki
				codeBlock: false,
			}),
			CodeBlockShiki.configure({
				defaultLanguage: 'plaintext',
			}),
			// Link 扩展：支持粘贴 URL 自动转换为链接
			CustomLink,
			// 粘贴处理扩展：处理富文本粘贴策略
			PasteHandler.configure({
				strategy: pasteStrategy,
			}),
			Placeholder.configure({
				placeholder,
				emptyEditorClass: 'is-editor-empty',
			}),
			createSlashCommandExtension({
				commands,
				t,
			}),
			// 自定义光标：带彗星尾巴动画效果（只在可编辑模式下启用）
			CustomCaret.configure({
				enabled: editable,
			}),
		],
		content: initialContent,
		editable,
		immediatelyRender: false,
		editorProps: {
			attributes: {
				class: `prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] transition-colors ${className}`,
				'aria-multiline': 'true',
				'aria-placeholder': placeholder,
				spellcheck: 'true',
			},
		},
		onUpdate: ({ editor: editorInstance }) => {
			if (onChange) {
				// Debounce the onChange callback for auto-save
				if (debounceRef.current) {
					clearTimeout(debounceRef.current)
				}
				debounceRef.current = setTimeout(() => {
					const html = editorInstance.getHTML()
					const json = JSON.stringify(editorInstance.getJSON())
					// 记录这次内部更新的内容，避免 useEffect 调用 setContent
					lastInternalContentRef.current = json
					onChange(html, json)
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

	// Update content when it changes externally (not from user input)
	// Note: We avoid setContent during user editing to preserve undo history
	useEffect(() => {
		if (!editor) {
			return
		}

		// 如果这次 content 变化是由内部更新触发的，跳过 setContent
		// 这样可以保留 undo 历史
		if (contentFormat === 'json' && content === lastInternalContentRef.current) {
			lastInternalContentRef.current = null
			return
		}

		// 只有当编辑器没有焦点时才更新内容（避免干扰用户输入和撤销历史）
		// 这是关键：在用户编辑时不要调用 setContent，因为它会清除 undo 历史
		if (editor.isFocused) {
			return
		}

		// 根据格式比较内容
		if (contentFormat === 'json') {
			const currentJson = JSON.stringify(editor.getJSON())
			if (content !== currentJson) {
				const parsed = parseContent(content, contentFormat)
				// 使用 emitUpdate: false 避免触发 onUpdate 回调
				// 注意：setContent 会重置历史记录，但由于编辑器没有焦点，这是预期行为
				editor.commands.setContent(parsed, { emitUpdate: false })
			}
		} else if (content !== editor.getHTML()) {
			editor.commands.setContent(content, { emitUpdate: false })
		}
	}, [content, contentFormat, editor])

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
			<div
				aria-busy="true"
				aria-label={t('common.loading')}
				className="animate-pulse space-y-3"
				role="status"
			>
				<div className="h-5 w-4/5 rounded bg-muted/60" />
				<div className="h-4 w-full rounded bg-muted/40" />
				<div className="h-4 w-3/4 rounded bg-muted/40" />
				<div className="h-4 w-1/2 rounded bg-muted/30" />
				<span className="sr-only">{t('common.loading')}</span>
			</div>
		)
	}

	return (
		<div className="entry-editor tiptap-caret-container">
			<EditorContent editor={editor} />
		</div>
	)
}

/**
 * Provide memoized editor command functions for toolbar controls.
 *
 * @param editor - The TipTap editor instance returned from `useEditor`.
 * @returns An object containing command functions for formatting.
 */
export function useEntryEditorCommands(editor: ReturnType<typeof useEditor>) {
	return useEditorCommands(editor)
}
