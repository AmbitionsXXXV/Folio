/**
 * Data Service
 *
 * Provides a unified data access layer that automatically switches between
 * Remote API and Local SQLite based on authentication state.
 */

export { createLocalDataService } from './local-data-service'
export { createRemoteDataService } from './remote-data-service'
export type {
	CreateEntryInput,
	CreateSourceInput,
	CreateTagInput,
	DataService,
	DueStats,
	GetQueueInput,
	ListEntriesInput,
	ListSourcesInput,
	ListTagsInput,
	PaginatedList,
	SnoozePreset,
	TodayStats,
	UpdateEntryInput,
	UpdateSourceInput,
	UpdateTagInput,
} from './types'
