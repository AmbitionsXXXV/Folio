export const SEARCH_DEPTHS = ["basic", "advanced"] as const

export type SearchDepth = (typeof SEARCH_DEPTHS)[number]

// =============================================================================
// Tool Types
// =============================================================================

export interface WebSearchToolInput {
  query: string
  maxResults?: number
  searchDepth?: SearchDepth
}

export interface WebSearchResult {
  title: string
  url: string
  snippet: string
  content?: string
}

export interface WebSearchToolOutput {
  query: string
  results: WebSearchResult[]
  message?: string
}

// =============================================================================
// UI Component Types
// =============================================================================

export interface WebSearchCardProps {
  query: string
  results: WebSearchResult[]
  className?: string
}

export interface WebSearchCompactBarProps {
  query: string
  resultCount: number
  isLoading?: boolean
  onClick?: () => void
  className?: string
}
