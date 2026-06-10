export const FETCH_FORMATS = ["text", "markdown", "html"] as const

export type FetchFormat = (typeof FETCH_FORMATS)[number]

// =============================================================================
// Tool Types
// =============================================================================

export interface WebFetchToolInput {
  url: string
  format?: FetchFormat
  timeout?: number
}

export interface WebFetchToolOutput {
  url: string
  contentType: string
  content: string
  format: FetchFormat
}

// =============================================================================
// UI Component Types
// =============================================================================

export interface WebFetchCardProps {
  url: string
  contentType: string
  content: string
  className?: string
}
