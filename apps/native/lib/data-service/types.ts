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
	items: T[]
	total?: number
	hasMore: boolean
	cursor?: string
}

/**
 * Entry list options
 */
export interface ListEntriesInput {
	filter?: EntriesFilter
	search?: string
	tagId?: string
	limit?: number
	cursor?: string
}

/**
 * Entry create input
 */
export interface CreateEntryInput {
	title: string
	contentJson?: string
	contentText?: string
	isInbox?: boolean
	isStarred?: boolean
	isPinned?: boolean
}

/**
 * Entry update input
 */
export interface UpdateEntryInput {
	title?: string
	contentJson?: string
	contentText?: string
	isInbox?: boolean
	isStarred?: boolean
	isPinned?: boolean
	version?: string
}

/**
 * Tag list options
 */
export interface ListTagsInput {
	search?: string
	limit?: number
	cursor?: string
}

/**
 * Tag create input
 */
export interface CreateTagInput {
	name: string
	color?: string
}

/**
 * Tag update input
 */
export interface UpdateTagInput {
	name?: string
	color?: string
}

/**
 * Source list options
 */
export interface ListSourcesInput {
	type?: SourceType
	search?: string
	limit?: number
	cursor?: string
}

/**
 * Source create input
 */
export interface CreateSourceInput {
	type?: SourceType
	title: string
	url?: string
	author?: string
	publishedAt?: Date
	metadata?: string
}

/**
 * Source update input
 */
export interface UpdateSourceInput {
	type?: SourceType
	title?: string
	url?: string
	author?: string
	publishedAt?: Date
	metadata?: string
}

/**
 * Review queue options
 */
export interface GetQueueInput {
	mode?: ReviewMode
	limit?: number
	tzOffset?: number
}

/**
 * Today stats result
 */
export interface TodayStats {
	dueCount: number
	reviewedCount: number
	newCount: number
	streak: number
}

/**
 * Due stats result
 */
export interface DueStats {
	dueNow: number
	overdue: number
	dueToday: number
	dueTomorrow: number
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

	// Review
	review: {
		getQueue(input: GetQueueInput): Promise<Entry[]>
		markReviewed(entryId: string, rating?: ReviewRating): Promise<void>
		snooze(entryId: string, preset: SnoozePreset | number): Promise<void>
		getTodayStats(tzOffset?: number): Promise<TodayStats>
		getDueStats(tzOffset?: number): Promise<DueStats>
	}
}
