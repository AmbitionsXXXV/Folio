/**
 * Local Repositories
 *
 * This module exports all local SQLite repositories for offline-first data access.
 * Each repository handles CRUD operations for its respective entity type.
 */

export type { BaseRepository, PaginatedResult } from './base-repository'
export type {
	CreateEntryInput,
	EntriesFilter,
	ListEntriesOptions,
	UpdateEntryInput,
} from './entries-repository'
export { EntriesRepository, entriesRepository } from './entries-repository'
export type {
	DueStats,
	GetQueueOptions,
	ReviewMode,
	ReviewRating,
	TodayStats,
} from './review-repository'
export { ReviewRepository, reviewRepository } from './review-repository'
export type {
	CreateSourceInput,
	ListSourcesOptions,
	SourceType,
	UpdateSourceInput,
} from './sources-repository'
export { SourcesRepository, sourcesRepository } from './sources-repository'
export type {
	CreateTagInput,
	ListTagsOptions,
	UpdateTagInput,
} from './tags-repository'
export { TagsRepository, tagsRepository } from './tags-repository'
