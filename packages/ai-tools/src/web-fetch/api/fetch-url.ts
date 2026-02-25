import TurndownService from 'turndown'
import type { FetchFormat, WebFetchToolOutput } from '../types'
import {
	BROWSER_USER_AGENT,
	DEFAULT_TIMEOUT_MS,
	HONEST_USER_AGENT,
	MAX_RESPONSE_SIZE,
	MAX_TIMEOUT_MS,
} from './constants'

const ACCEPT_HEADERS: Record<FetchFormat, string> = {
	markdown:
		'text/markdown;q=1.0, text/x-markdown;q=0.9, text/plain;q=0.8, text/html;q=0.7, */*;q=0.1',
	text: 'text/plain;q=1.0, text/markdown;q=0.9, text/html;q=0.8, */*;q=0.1',
	html: 'text/html;q=1.0, application/xhtml+xml;q=0.9, text/plain;q=0.8, text/markdown;q=0.7, */*;q=0.1',
}

function buildHeaders(format: FetchFormat, userAgent: string) {
	return {
		'User-Agent': userAgent,
		Accept: ACCEPT_HEADERS[format],
		'Accept-Language': 'en-US,en;q=0.9',
	}
}

function buildAbortSignal(
	timeoutMs: number,
	callerSignal?: AbortSignal
): AbortSignal {
	const timeoutSignal = AbortSignal.timeout(timeoutMs)
	if (!callerSignal) return timeoutSignal
	return AbortSignal.any([timeoutSignal, callerSignal])
}

function convertHtmlToMarkdown(html: string): string {
	const turndownService = new TurndownService({
		headingStyle: 'atx',
		hr: '---',
		bulletListMarker: '-',
		codeBlockStyle: 'fenced',
		emDelimiter: '*',
	})
	turndownService.remove(['script', 'style', 'meta', 'link'])
	return turndownService.turndown(html)
}

const STRIP_TAGS_RE = /<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/gi
const COLLAPSE_WS_RE = /\n{3,}/g

function extractTextFromHtml(html: string): string {
	return html.replace(STRIP_TAGS_RE, '\n').replace(COLLAPSE_WS_RE, '\n\n').trim()
}

function resolveTimeoutMs(timeoutSeconds?: number): number {
	if (timeoutSeconds === undefined) return DEFAULT_TIMEOUT_MS
	return Math.min(timeoutSeconds * 1000, MAX_TIMEOUT_MS)
}

function formatContent(
	rawContent: string,
	contentType: string,
	format: FetchFormat
): string {
	const isHtml = contentType.includes('text/html')
	if (!isHtml) return rawContent

	switch (format) {
		case 'markdown':
			return convertHtmlToMarkdown(rawContent)
		case 'text':
			return extractTextFromHtml(rawContent)
		default:
			return rawContent
	}
}

export async function fetchUrlContent(
	url: string,
	format: FetchFormat = 'markdown',
	timeout?: number,
	abortSignal?: AbortSignal
): Promise<WebFetchToolOutput> {
	const hasValidProtocol = url.startsWith('http://') || url.startsWith('https://')
	if (!hasValidProtocol) {
		throw new Error('URL must start with http:// or https://')
	}

	const timeoutMs = resolveTimeoutMs(timeout)
	const signal = buildAbortSignal(timeoutMs, abortSignal)
	const headers = buildHeaders(format, BROWSER_USER_AGENT)

	try {
		const initial = await fetch(url, { signal, headers })

		// Retry with honest UA if blocked by Cloudflare bot detection
		const response =
			initial.status === 403 && initial.headers.get('cf-mitigated') === 'challenge'
				? await fetch(url, {
						signal,
						headers: { ...headers, 'User-Agent': HONEST_USER_AGENT },
					})
				: initial

		if (!response.ok) {
			throw new Error(`Request failed with status code: ${response.status}`)
		}

		const contentLength = response.headers.get('content-length')
		if (contentLength && Number.parseInt(contentLength, 10) > MAX_RESPONSE_SIZE) {
			throw new Error('Response too large (exceeds 5MB limit)')
		}

		const arrayBuffer = await response.arrayBuffer()
		if (arrayBuffer.byteLength > MAX_RESPONSE_SIZE) {
			throw new Error('Response too large (exceeds 5MB limit)')
		}

		const contentType = response.headers.get('content-type') ?? ''
		const rawContent = new TextDecoder().decode(arrayBuffer)
		const content = formatContent(rawContent, contentType, format)

		return { url, contentType, content, format }
	} catch (error) {
		if (error instanceof Error && error.name === 'TimeoutError') {
			throw new Error('Web fetch request timed out')
		}
		throw error
	}
}
