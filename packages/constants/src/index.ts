import type { SupportedLanguage } from '@folionote/locales'

export * from './avatar'
export * from './storage'

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
	'en-US': 'English',
	'zh-CN': '简体中文',
	'ja-JP': '日本語',
}
