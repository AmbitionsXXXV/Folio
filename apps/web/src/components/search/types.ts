/**
 * Search module type definitions
 */

/**
 * Search filters value for advanced search
 */
export interface SearchFiltersValue {
  tagIds?: string[]
  sourceIds?: string[]
  dateRange?: { from?: Date; to?: Date }
  isInbox?: boolean
  isStarred?: boolean
}

/**
 * Search filters from history (dates are serialized as strings)
 */
export interface SearchHistoryFilters {
  tagIds?: string[]
  sourceIds?: string[]
  dateRange?: { from?: string; to?: string }
  isInbox?: boolean
  isStarred?: boolean
}

/**
 * Tag type for filters
 */
export interface Tag {
  id: string
  name: string
  color: string | null
}

/**
 * Source type for filters
 */
export interface Source {
  id: string
  title: string
  type: string
}

/**
 * Search history item
 */
export interface SearchHistoryItem {
  id: string
  query: string
  filters: SearchHistoryFilters | null
  resultCount: number | null
  createdAt: Date
}

/**
 * Search suggestion item
 */
export interface SearchSuggestion {
  query: string
  count: number
}
