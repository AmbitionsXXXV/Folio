import type { DecryptedCredential } from '@folionote/ai'
import { generateTextWithCredential } from '@folionote/ai/generate-text'
import { createLogger } from '@folionote/log'
import type { UIMessage } from 'ai'
import { generateTitle } from './ai-chat-store'

const log = createLogger({ prefix: 'chat-title-generator' })

const MAX_TITLE_LENGTH = 80
const MAX_TRANSCRIPT_CHARS = 6000
const MAX_TRANSCRIPT_MESSAGES = 8
const TITLE_PLACEHOLDERS = new Set(['new chat', '新对话', '新しいチャット'])
const STRIP_WRAPPING_QUOTES_REGEX = /^["'`“”‘’]+|["'`“”‘’]+$/g
const STRIP_MARKDOWN_PREFIX_REGEX = /^#+\s*|^[-*]\s*/g
const STRIP_TRAILING_PUNCTUATION_REGEX = /[.。!！?？:：;；]+$/g

const AUTO_CHAT_TITLE_PROMPT = [
	'You generate concise chat titles from a session transcript.',
	'First summarize the session topic mentally, then return a short title only.',
	'Requirements:',
	'- Return only the final title text.',
	'- Max 8 words.',
	'- No quotes, markdown, prefixes, or emojis.',
	'- Match the language used in the conversation.',
	'- Prefer the main topic or intent, not generic phrases like "New Chat".',
].join('\n')

type GenerateChatTitleInput = {
	credential: DecryptedCredential
	currentTitle?: string
	messages: UIMessage[]
	model?: string
}

function getMessageText(message: UIMessage): string {
	const fragments: string[] = []
	for (const part of message.parts ?? []) {
		if (part.type === 'text' && typeof part.text === 'string') {
			fragments.push(part.text)
		}
	}
	return fragments.join('\n').trim()
}

function truncateText(text: string, maxChars: number): string {
	if (text.length <= maxChars) {
		return text
	}
	return `${text.slice(0, maxChars - 1)}…`
}

function buildTitleTranscript(messages: UIMessage[]): string {
	const transcriptLines: string[] = []
	let usedChars = 0
	for (const message of messages.slice(0, MAX_TRANSCRIPT_MESSAGES)) {
		const text = getMessageText(message)
		if (!text) {
			continue
		}

		const line = `${message.role.toUpperCase()}: ${text}`
		if (usedChars + line.length > MAX_TRANSCRIPT_CHARS) {
			const remainingChars = MAX_TRANSCRIPT_CHARS - usedChars
			if (remainingChars <= 0) {
				break
			}
			transcriptLines.push(truncateText(line, remainingChars))
			break
		}

		transcriptLines.push(line)
		usedChars += line.length
	}
	return transcriptLines.join('\n\n')
}

function normalizeTitle(title: string): string {
	return truncateText(
		title
			.trim()
			.replaceAll('\n', ' ')
			.replace(STRIP_MARKDOWN_PREFIX_REGEX, '')
			.replace(STRIP_WRAPPING_QUOTES_REGEX, '')
			.replace(STRIP_TRAILING_PUNCTUATION_REGEX, '')
			.replace(/\s+/g, ' ')
			.trim(),
		MAX_TITLE_LENGTH
	)
}

export function shouldAutoGenerateChatTitle(
	currentTitle: string | undefined,
	messages: UIMessage[]
): boolean {
	if (messages.length < 2) {
		return false
	}

	const normalizedCurrentTitle = normalizeTitle(currentTitle ?? '').toLowerCase()
	if (!normalizedCurrentTitle) {
		return true
	}

	if (TITLE_PLACEHOLDERS.has(normalizedCurrentTitle)) {
		return true
	}

	const fallbackTitle = normalizeTitle(generateTitle(messages)).toLowerCase()
	return fallbackTitle.length > 0 && normalizedCurrentTitle === fallbackTitle
}

export async function generateChatTitle({
	credential,
	currentTitle,
	messages,
	model,
}: GenerateChatTitleInput): Promise<string | null> {
	if (!shouldAutoGenerateChatTitle(currentTitle, messages)) {
		return null
	}

	const transcript = buildTitleTranscript(messages)
	if (!transcript) {
		return null
	}

	const result = await generateTextWithCredential(credential, {
		model,
		prompt: [
			AUTO_CHAT_TITLE_PROMPT,
			'',
			'Session transcript:',
			transcript,
			'',
			'Title:',
		].join('\n'),
	})

	const normalizedGeneratedTitle = normalizeTitle(result.text)
	if (normalizedGeneratedTitle) {
		return normalizedGeneratedTitle
	}

	const fallbackTitle = normalizeTitle(generateTitle(messages))
	if (fallbackTitle) {
		log.warn('AI returned an empty chat title, falling back to heuristic title')
		return fallbackTitle
	}

	return null
}
