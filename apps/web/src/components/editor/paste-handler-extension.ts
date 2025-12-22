import { Extension } from '@tiptap/core'
import type { Slice } from '@tiptap/pm/model'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import type { EditorView } from '@tiptap/pm/view'

/**
 * 粘贴处理策略
 */
export type PasteStrategy = 'preserve' | 'plain'

/**
 * 粘贴处理扩展配置
 */
export type PasteHandlerOptions = {
	/**
	 * 粘贴策略
	 * - 'preserve': 保留富文本结构（默认）
	 * - 'plain': 转换为纯文本
	 */
	strategy: PasteStrategy
}

/**
 * 检测文本是否为 URL
 */
function isUrl(text: string): boolean {
	try {
		const url = new URL(text.trim())
		return ['http:', 'https:'].includes(url.protocol)
	} catch {
		return false
	}
}

/**
 * 自定义粘贴处理扩展
 *
 * 功能：
 * 1. 粘贴纯 URL 时自动转换为可点击链接
 * 2. 支持保留富文本结构或转换为纯文本的策略选择
 */
export const PasteHandler = Extension.create<PasteHandlerOptions>({
	name: 'pasteHandler',

	addOptions() {
		return {
			strategy: 'preserve' as PasteStrategy,
		}
	},

	addProseMirrorPlugins() {
		const { strategy } = this.options
		const { editor } = this

		return [
			new Plugin({
				key: new PluginKey('pasteHandler'),
				props: {
					handlePaste: (
						_view: EditorView,
						event: ClipboardEvent,
						_slice: Slice
					): boolean => {
						const clipboardData = event.clipboardData
						if (!clipboardData) {
							return false
						}

						const plainText = clipboardData.getData('text/plain')
						const htmlText = clipboardData.getData('text/html')

						// 如果粘贴的是纯 URL，转换为链接
						if (plainText && isUrl(plainText) && !htmlText) {
							event.preventDefault()
							const url = plainText.trim()

							// 获取当前选区
							const { from, to } = editor.state.selection
							const hasSelection = from !== to

							if (hasSelection) {
								// 如果有选中文本，将选中文本转换为链接
								editor.chain().focus().setLink({ href: url }).run()
							} else {
								// 如果没有选中文本，插入 URL 作为链接文本
								editor
									.chain()
									.focus()
									.insertContent({
										type: 'text',
										text: url,
										marks: [
											{
												type: 'link',
												attrs: { href: url, target: '_blank' },
											},
										],
									})
									.run()
							}

							return true
						}

						// 如果策略是纯文本，转换富文本为纯文本
						if (strategy === 'plain' && htmlText && plainText) {
							event.preventDefault()
							editor.chain().focus().insertContent(plainText).run()
							return true
						}

						// 默认行为：保留富文本结构
						return false
					},
				},
			}),
		]
	},
})
