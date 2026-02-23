import { TavilySearchResponseSchema } from '../schemas'
import type { SearchDepth, WebSearchResult, WebSearchToolOutput } from '../types'
import {
	TAVILY_API_BASE_URL,
	TAVILY_API_KEY_ENV,
	TAVILY_DEFAULT_MAX_RESULTS,
	TAVILY_DEFAULT_SEARCH_DEPTH,
} from './constants'

function getApiKey(): string {
	const key = process.env[TAVILY_API_KEY_ENV]?.trim()
	if (!key) {
		throw new Error(`${TAVILY_API_KEY_ENV} environment variable is required`)
	}
	return key
}

export function isTavilyConfigured(): boolean {
	return Boolean(process.env[TAVILY_API_KEY_ENV]?.trim())
}

export async function fetchWebSearchResults(
	query: string,
	maxResults?: number,
	searchDepth?: SearchDepth,
	abortSignal?: AbortSignal
): Promise<WebSearchToolOutput> {
	const apiKey = getApiKey()
	const resolvedMaxResults = maxResults ?? TAVILY_DEFAULT_MAX_RESULTS
	const resolvedDepth = searchDepth ?? TAVILY_DEFAULT_SEARCH_DEPTH

	const response = await fetch(TAVILY_API_BASE_URL, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			api_key: apiKey,
			query,
			max_results: resolvedMaxResults,
			search_depth: resolvedDepth,
			include_answer: false,
		}),
		signal: abortSignal,
	})

	if (!response.ok) {
		const statusLabel = response.status ? ` (status ${response.status})` : ''
		throw new Error(`Tavily API request failed${statusLabel}`)
	}

	const payload: unknown = await response.json()
	const data = TavilySearchResponseSchema.parse(payload)

	const results: WebSearchResult[] = data.results.map((item) => ({
		title: item.title,
		url: item.url,
		snippet: item.content.slice(0, 300),
		content: item.content,
	}))

	return { query: data.query, results }
}
