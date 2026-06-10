import { TavilySearchResponseSchema } from "../schemas"
import type {
  SearchDepth,
  WebSearchResult,
  WebSearchToolOutput
} from "../types"
import {
  TAVILY_API_BASE_URL,
  TAVILY_API_KEY_ENV,
  TAVILY_DEFAULT_MAX_RESULTS,
  TAVILY_DEFAULT_SEARCH_DEPTH,
  TAVILY_DEFAULT_TIMEOUT_MS,
  TAVILY_MCP_BASE_URL
} from "./constants"

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

/**
 * Build the Tavily MCP endpoint URL with the API key from env.
 * Returns `undefined` when the key is not configured.
 */
export function getTavilyMcpUrl(): string | undefined {
  const apiKey = process.env[TAVILY_API_KEY_ENV]?.trim()
  if (!apiKey) {
    return undefined
  }
  return `${TAVILY_MCP_BASE_URL}?tavilyApiKey=${apiKey}`
}

function buildAbortSignal(callerSignal?: AbortSignal): AbortSignal {
  const timeoutSignal = AbortSignal.timeout(TAVILY_DEFAULT_TIMEOUT_MS)
  if (!callerSignal) {
    return timeoutSignal
  }
  return AbortSignal.any([timeoutSignal, callerSignal])
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
  const signal = buildAbortSignal(abortSignal)

  try {
    const response = await fetch(TAVILY_API_BASE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        max_results: resolvedMaxResults,
        search_depth: resolvedDepth,
        include_answer: false
      }),
      signal
    })

    if (!response.ok) {
      const errorText = await response.text().catch(() => "")
      throw new Error(
        `Tavily API error (${response.status}): ${errorText || response.statusText}`
      )
    }

    const payload: unknown = await response.json()
    const data = TavilySearchResponseSchema.parse(payload)

    if (data.results.length === 0) {
      return {
        query: data.query,
        results: [],
        message: "No search results found. Try a different or broader query."
      }
    }

    const results: WebSearchResult[] = data.results.map((item) => ({
      title: item.title,
      url: item.url,
      snippet: item.content.slice(0, 300),
      content: item.content
    }))

    return { query: data.query, results }
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new Error("Web search request timed out", { cause: error })
    }
    throw error
  }
}
