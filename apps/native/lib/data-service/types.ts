/**
 * Data Service Types
 *
 * Common types for the data access abstraction layer
 * These types are shared between Remote API and Local SQLite implementations
 */

import type { Entry, Source, Tag } from '../db/schema'
import type { EntriesFilter } from '../repositories/entries-repository'
import type { ReviewMode, ReviewRating } from '../repositories/review-repository'
import type { SourceType } from '../repositories/sources-repository'

/**
 * Paginated list result
 */
export interface PaginatedList<T> {
	cursor?: string
	hasMore: boolean
	items: T[]
	total?: number
}

/**
 * Entry list options
 */
export interface ListEntriesInput {
	cursor?: string
	filter?: EntriesFilter
	limit?: number
	search?: string
	tagId?: string
}

/**
 * Entry create input
 */
export interface CreateEntryInput {
	contentJson?: string
	contentText?: string
	isInbox?: boolean
	isPinned?: boolean
	isStarred?: boolean
	title: string
}

/**
 * Entry update input
 */
export interface UpdateEntryInput {
	contentJson?: string
	contentText?: string
	isInbox?: boolean
	isPinned?: boolean
	isStarred?: boolean
	title?: string
	version?: string
}

/**
 * Tag list options
 */
export interface ListTagsInput {
	cursor?: string
	limit?: number
	search?: string
}

/**
 * Tag create input
 */
export interface CreateTagInput {
	color?: string
	name: string
}

/**
 * Tag update input
 */
export interface UpdateTagInput {
	color?: string
	name?: string
}

/**
 * Source list options
 */
export interface ListSourcesInput {
	cursor?: string
	limit?: number
	search?: string
	type?: SourceType
}

/**
 * Source create input
 */
export interface CreateSourceInput {
	author?: string
	metadata?: string
	publishedAt?: Date
	title: string
	type?: SourceType
	url?: string
}

/**
 * Source update input
 */
export interface UpdateSourceInput {
	author?: string
	metadata?: string
	publishedAt?: Date
	title?: string
	type?: SourceType
	url?: string
}

/**
 * Review queue options
 */
export interface GetQueueInput {
	limit?: number
	mode?: ReviewMode
	tzOffset?: number
}

/**
 * Today stats result
 * Matches the remote API response format
 */
export interface TodayStats {
	reviewedToday: number
	starredEntries: number
	streak: number
	totalEntries: number
	unreviewedEntries: number
}

/**
 * Due stats result
 * Matches the remote API response format
 */
export interface DueStats {
	dueToday: number
	newCount: number
	overdue: number
	upcoming: number
}

/**
 * Snooze preset options
 */
export type SnoozePreset = 'tomorrow' | '3days' | '7days'

/**
 * Data service interface
 * Defines the contract for data access operations
 */
export interface DataService {
	// Entries
	entries: {
		list(input: ListEntriesInput): Promise<PaginatedList<Entry>>
		get(id: string): Promise<Entry | null>
		create(input: CreateEntryInput): Promise<Entry>
		update(id: string, input: UpdateEntryInput): Promise<Entry | null>
		delete(id: string): Promise<boolean>
		toggleStarred(id: string): Promise<Entry | null>
		moveToLibrary(id: string): Promise<Entry | null>
		moveToInbox(id: string): Promise<Entry | null>
	}

	// Review
	review: {
		getQueue(input: GetQueueInput): Promise<Entry[]>
		markReviewed(entryId: string, rating?: ReviewRating): Promise<void>
		snooze(entryId: string, preset: SnoozePreset | number): Promise<void>
		getTodayStats(tzOffset?: number): Promise<TodayStats>
		getDueStats(tzOffset?: number): Promise<DueStats>
	}

	// Sources
	sources: {
		list(input: ListSourcesInput): Promise<PaginatedList<Source>>
		get(id: string): Promise<Source | null>
		create(input: CreateSourceInput): Promise<Source>
		update(id: string, input: UpdateSourceInput): Promise<Source | null>
		delete(id: string): Promise<boolean>
		getForEntry(entryId: string): Promise<Source[]>
		addToEntry(entryId: string, sourceId: string, position?: string): Promise<void>
		removeFromEntry(entryId: string, sourceId: string): Promise<void>
	}

	// Tags
	tags: {
		list(input: ListTagsInput): Promise<PaginatedList<Tag>>
		get(id: string): Promise<Tag | null>
		create(input: CreateTagInput): Promise<Tag>
		update(id: string, input: UpdateTagInput): Promise<Tag | null>
		delete(id: string): Promise<boolean>
		getForEntry(entryId: string): Promise<Tag[]>
		addToEntry(entryId: string, tagId: string): Promise<void>
		removeFromEntry(entryId: string, tagId: string): Promise<void>
	}
}
