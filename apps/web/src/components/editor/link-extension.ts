import Link from '@tiptap/extension-link'

/**
 * 自定义 Link 扩展配置
 *
 * 功能：
 * 1. 粘贴 URL 自动识别为链接
 * 2. 输入 URL 自动转换为链接
 * 3. 安全的链接属性（noopener noreferrer）
 */
export const CustomLink = Link.configure({
	// 启用粘贴 URL 自动转换为链接
	linkOnPaste: true,

	// 启用输入时自动链接检测
	autolink: true,

	// 默认协议为 https
	defaultProtocol: 'https',

	// 点击链接时不自动打开（避免编辑时误触）
	openOnClick: false,

	// 点击链接时选中链接文本
	enableClickSelection: true,

	// 安全的 HTML 属性
	HTMLAttributes: {
		rel: 'noopener noreferrer',
		target: '_blank',
		class: 'text-primary underline underline-offset-2 hover:text-primary/80',
	},

	// 自定义 URL 验证
	isAllowedUri: (url, ctx) => {
		// 使用默认验证
		if (!ctx.defaultValidate(url)) {
			return false
		}

		// 不允许相对路径
		if (url.startsWith('./') || url.startsWith('../')) {
			return false
		}

		// 允许常见协议
		const allowedProtocols = ['http:', 'https:', 'mailto:', 'tel:']
		try {
			const parsedUrl = new URL(url)
			return allowedProtocols.includes(parsedUrl.protocol)
		} catch {
			// 如果无法解析为 URL，可能是没有协议的链接
			return true
		}
	},

	// 自定义自动链接逻辑
	shouldAutoLink: (url) => {
		// 只对看起来像完整 URL 的文本自动链接
		try {
			const parsedUrl = new URL(url)
			return ['http:', 'https:'].includes(parsedUrl.protocol)
		} catch {
			return false
		}
	},
})
