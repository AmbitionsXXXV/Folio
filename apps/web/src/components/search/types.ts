/**
 * Search module type definitions
 */

/**
 * Search filters value for advanced search
 */
export type SearchFiltersValue = {
	tagIds?: string[]
	sourceIds?: string[]
	dateRange?: { from?: Date; to?: Date }
	isInbox?: boolean
	isStarred?: boolean
}

/**
 * Search filters from history (dates are serialized as strings)
 */
export type SearchHistoryFilters = {
	tagIds?: string[]
	sourceIds?: string[]
	dateRange?: { from?: string; to?: string }
	isInbox?: boolean
	isStarred?: boolean
}

/**
 * Tag type for filters
 */
export type Tag = {
	id: string
	name: string
	color: string | null
}

/**
 * Source type for filters
 */
export type Source = {
	id: string
	title: string
	type: string
}

/**
 * Search history item
 */
export type SearchHistoryItem = {
	id: string
	query: string
	filters: SearchHistoryFilters | null
	resultCount: number | null
	createdAt: Date
}

/**
 * Search suggestion item
 */
export type SearchSuggestion = {
	query: string
	count: number
}
