export const FETCH_FORMATS = ['text', 'markdown', 'html'] as const

export type FetchFormat = (typeof FETCH_FORMATS)[number]

// =============================================================================
// Tool Types
// =============================================================================

export type WebFetchToolInput = {
	url: string
	format?: FetchFormat
	timeout?: number
}

export type WebFetchToolOutput = {
	url: string
	contentType: string
	content: string
	format: FetchFormat
}

// =============================================================================
// UI Component Types
// =============================================================================

export type WebFetchCardProps = {
	url: string
	contentType: string
	content: string
	className?: string
}
