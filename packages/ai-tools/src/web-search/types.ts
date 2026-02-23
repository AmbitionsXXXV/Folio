export const SEARCH_DEPTHS = ['basic', 'advanced'] as const

export type SearchDepth = (typeof SEARCH_DEPTHS)[number]

// =============================================================================
// Tool Types
// =============================================================================

export type WebSearchToolInput = {
	query: string
	maxResults?: number
	searchDepth?: SearchDepth
}

export type WebSearchResult = {
	title: string
	url: string
	snippet: string
	content?: string
}

export type WebSearchToolOutput = {
	query: string
	results: WebSearchResult[]
	message?: string
}

// =============================================================================
// UI Component Types
// =============================================================================

export type WebSearchCardProps = {
	query: string
	results: WebSearchResult[]
	className?: string
}
