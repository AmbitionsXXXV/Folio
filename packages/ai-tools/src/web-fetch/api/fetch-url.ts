import { lookup } from 'node:dns/promises'
import { isIP } from 'node:net'
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

const REDIRECT_STATUS_CODES = new Set([301, 302, 303, 307, 308])
const MAX_REDIRECTS = 3
const BLOCKED_HOST_SUFFIXES = ['.internal', '.local', '.localhost', '.home.arpa']
const BLOCKED_URL_ERROR =
	'URL resolves to a private, loopback, or otherwise non-public address'

type ResolvedLookupAddress = {
	address: string
	family: number
}

function buildHeaders(format: FetchFormat, userAgent: string) {
	return {
		'User-Agent': userAgent,
		Accept: ACCEPT_HEADERS[format],
		'Accept-Language': 'en-US,en;q=0.9',
	}
}

function normalizeHostname(hostname: string): string {
	return hostname.endsWith('.') ? hostname.slice(0, -1) : hostname
}

function parseValidatedUrl(url: string): URL {
	let parsedUrl: URL
	try {
		parsedUrl = new URL(url)
	} catch {
		throw new Error('URL must be a valid absolute URL')
	}

	if (!(parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:')) {
		throw new Error('URL must start with http:// or https://')
	}

	if (parsedUrl.username || parsedUrl.password) {
		throw new Error('URL must not include embedded credentials')
	}

	return parsedUrl
}

function isBlockedHostname(hostname: string): boolean {
	const normalizedHostname = normalizeHostname(hostname).toLowerCase()
	if (normalizedHostname === 'localhost') {
		return true
	}
	if (BLOCKED_HOST_SUFFIXES.some((suffix) => normalizedHostname.endsWith(suffix))) {
		return true
	}
	return !normalizedHostname.includes('.') && isIP(normalizedHostname) === 0
}

function isBlockedIpv4Address(address: string): boolean {
	const octets = address.split('.').map((segment) => Number.parseInt(segment, 10))
	if (octets.length !== 4 || octets.some((value) => !Number.isInteger(value))) {
		return true
	}

	const [firstOctet, secondOctet] = octets
	if (firstOctet === undefined || secondOctet === undefined) {
		return true
	}

	return (
		firstOctet === 0 ||
		firstOctet === 10 ||
		firstOctet === 127 ||
		(firstOctet === 100 && secondOctet >= 64 && secondOctet <= 127) ||
		(firstOctet === 169 && secondOctet === 254) ||
		(firstOctet === 172 && secondOctet >= 16 && secondOctet <= 31) ||
		(firstOctet === 192 &&
			(secondOctet === 0 || secondOctet === 168 || secondOctet === 88)) ||
		(firstOctet === 198 && (secondOctet === 18 || secondOctet === 19)) ||
		firstOctet >= 224
	)
}

function isBlockedIpv6Address(address: string): boolean {
	const normalizedAddress = address.toLowerCase().split('%')[0]
	if (!normalizedAddress) {
		return true
	}

	if (normalizedAddress.startsWith('::ffff:')) {
		return isBlockedIpAddress(normalizedAddress.slice('::ffff:'.length))
	}

	if (normalizedAddress === '::' || normalizedAddress === '::1') {
		return true
	}

	const firstSegment = normalizedAddress.split(':')[0]
	if (!firstSegment) {
		return true
	}

	const firstHextet = Number.parseInt(firstSegment, 16)
	if (Number.isNaN(firstHextet)) {
		return true
	}

	return (
		(firstHextet >= 0xfc_00 && firstHextet <= 0xfd_ff) || // fc00::/7 unique local
		(firstHextet >= 0xfe_80 && firstHextet <= 0xfe_bf) || // fe80::/10 link-local
		(firstHextet >= 0xff_00 && firstHextet <= 0xff_ff)
	) // ff00::/8 multicast
}

function isBlockedIpAddress(address: string): boolean {
	const ipVersion = isIP(address)
	if (ipVersion === 4) {
		return isBlockedIpv4Address(address)
	}
	if (ipVersion === 6) {
		return isBlockedIpv6Address(address)
	}
	return true
}

async function assertPublicInternetUrl(url: URL): Promise<void> {
	const normalizedHostname = normalizeHostname(url.hostname)
	if (isBlockedHostname(normalizedHostname)) {
		throw new Error(BLOCKED_URL_ERROR)
	}

	if (isIP(normalizedHostname) > 0) {
		if (isBlockedIpAddress(normalizedHostname)) {
			throw new Error(BLOCKED_URL_ERROR)
		}
		return
	}

	let resolvedAddresses: ResolvedLookupAddress[]
	try {
		resolvedAddresses = (await lookup(normalizedHostname, {
			all: true,
			verbatim: true,
		})) as ResolvedLookupAddress[]
	} catch {
		throw new Error('Unable to resolve URL hostname')
	}

	if (resolvedAddresses.length === 0) {
		throw new Error('Unable to resolve URL hostname')
	}

	for (const { address } of resolvedAddresses) {
		if (isBlockedIpAddress(address)) {
			throw new Error(BLOCKED_URL_ERROR)
		}
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

async function fetchWithRedirectValidation(
	initialUrl: URL,
	headers: ReturnType<typeof buildHeaders>,
	signal: AbortSignal
): Promise<Response> {
	let currentUrl = initialUrl

	for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
		await assertPublicInternetUrl(currentUrl)

		const initialResponse = await fetch(currentUrl, {
			signal,
			headers,
			redirect: 'manual',
		})

		const response =
			initialResponse.status === 403 &&
			initialResponse.headers.get('cf-mitigated') === 'challenge'
				? await fetch(currentUrl, {
						signal,
						redirect: 'manual',
						headers: { ...headers, 'User-Agent': HONEST_USER_AGENT },
					})
				: initialResponse

		if (!REDIRECT_STATUS_CODES.has(response.status)) {
			return response
		}

		if (redirectCount === MAX_REDIRECTS) {
			throw new Error('Too many redirects while fetching URL')
		}

		const location = response.headers.get('location')
		if (!location) {
			throw new Error('Redirect response did not include a location header')
		}

		currentUrl = parseValidatedUrl(new URL(location, currentUrl).toString())
	}

	throw new Error('Too many redirects while fetching URL')
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
	const parsedUrl = parseValidatedUrl(url)
	const timeoutMs = resolveTimeoutMs(timeout)
	const signal = buildAbortSignal(timeoutMs, abortSignal)
	const headers = buildHeaders(format, BROWSER_USER_AGENT)

	try {
		const response = await fetchWithRedirectValidation(parsedUrl, headers, signal)

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

		return { url: parsedUrl.toString(), contentType, content, format }
	} catch (error) {
		if (error instanceof Error && error.name === 'TimeoutError') {
			throw new Error('Web fetch request timed out')
		}
		throw error
	}
}
