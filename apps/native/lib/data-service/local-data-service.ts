/**
 * Local Data Service
 *
 * Implementation of DataService using local SQLite database.
 * Used when the user is in local mode (not logged in).
 */

import type { Entry, Source, Tag } from '../db/schema'
import {
	entriesRepository,
	reviewRepository,
	sourcesRepository,
	tagsRepository,
} from '../repositories'
import type { ReviewRating } from '../repositories/review-repository'
import type {
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

/**
 * Create a local data service for a specific user
 */
export function createLocalDataService(localUserId: string): DataService {
	return {
		entries: {
			async list(input: ListEntriesInput): Promise<PaginatedList<Entry>> {
				const result = await entriesRepository.list({
					userId: localUserId,
					filter: input.filter,
					search: input.search,
					tagId: input.tagId,
					limit: input.limit,
					cursor: input.cursor,
				})
				return {
					items: result.items,
					hasMore: result.hasMore,
					cursor: result.cursor,
				}
			},

			get(id: string): Promise<Entry | null> {
				return entriesRepository.findById(id)
			},

			create(input: CreateEntryInput): Promise<Entry> {
				return entriesRepository.create({
					userId: localUserId,
					...input,
				})
			},

			update(id: string, input: UpdateEntryInput): Promise<Entry | null> {
				return entriesRepository.update(id, input)
			},

			delete(id: string): Promise<boolean> {
				return entriesRepository.delete(id)
			},

			toggleStarred(id: string): Promise<Entry | null> {
				return entriesRepository.toggleStarred(id)
			},

			moveToLibrary(id: string): Promise<Entry | null> {
				return entriesRepository.moveToLibrary(id)
			},

			moveToInbox(id: string): Promise<Entry | null> {
				return entriesRepository.moveToInbox(id)
			},
		},

		tags: {
			async list(input: ListTagsInput): Promise<PaginatedList<Tag>> {
				const result = await tagsRepository.list({
					userId: localUserId,
					search: input.search,
					limit: input.limit,
					cursor: input.cursor,
				})
				return {
					items: result.items,
					hasMore: result.hasMore,
				}
			},

			get(id: string): Promise<Tag | null> {
				return tagsRepository.findById(id)
			},

			create(input: CreateTagInput): Promise<Tag> {
				return tagsRepository.create({
					userId: localUserId,
					...input,
				})
			},

			update(id: string, input: UpdateTagInput): Promise<Tag | null> {
				return tagsRepository.update(id, input)
			},

			delete(id: string): Promise<boolean> {
				return tagsRepository.delete(id)
			},

			getForEntry(entryId: string): Promise<Tag[]> {
				return tagsRepository.getTagsForEntry(entryId)
			},

			addToEntry(entryId: string, tagId: string): Promise<void> {
				return tagsRepository.addTagToEntry(entryId, tagId)
			},

			removeFromEntry(entryId: string, tagId: string): Promise<void> {
				return tagsRepository.removeTagFromEntry(entryId, tagId)
			},
		},

		sources: {
			async list(input: ListSourcesInput): Promise<PaginatedList<Source>> {
				const result = await sourcesRepository.list({
					userId: localUserId,
					type: input.type,
					search: input.search,
					limit: input.limit,
					cursor: input.cursor,
				})
				return {
					items: result.items,
					hasMore: result.hasMore,
				}
			},

			get(id: string): Promise<Source | null> {
				return sourcesRepository.findById(id)
			},

			create(input: CreateSourceInput): Promise<Source> {
				return sourcesRepository.create({
					userId: localUserId,
					...input,
				})
			},

			update(id: string, input: UpdateSourceInput): Promise<Source | null> {
				return sourcesRepository.update(id, input)
			},

			delete(id: string): Promise<boolean> {
				return sourcesRepository.delete(id)
			},

			getForEntry(entryId: string): Promise<Source[]> {
				return sourcesRepository.getSourcesForEntry(entryId)
			},

			addToEntry(
				entryId: string,
				sourceId: string,
				position?: string
			): Promise<void> {
				return sourcesRepository.addSourceToEntry(entryId, sourceId, position)
			},

			removeFromEntry(entryId: string, sourceId: string): Promise<void> {
				return sourcesRepository.removeSourceFromEntry(entryId, sourceId)
			},
		},

		review: {
			getQueue(input: GetQueueInput): Promise<Entry[]> {
				return reviewRepository.getQueue({
					userId: localUserId,
					mode: input.mode,
					limit: input.limit,
					tzOffset: input.tzOffset,
				})
			},

			async markReviewed(
				entryId: string,
				rating: ReviewRating = 'good'
			): Promise<void> {
				await reviewRepository.markReviewed(localUserId, entryId, rating)
			},

			async snooze(entryId: string, preset: SnoozePreset | number): Promise<void> {
				await reviewRepository.snooze(localUserId, entryId, preset)
			},

			getTodayStats(tzOffset = 0): Promise<TodayStats> {
				return reviewRepository.getTodayStats(localUserId, tzOffset)
			},

			getDueStats(tzOffset = 0): Promise<DueStats> {
				return reviewRepository.getDueStats(localUserId, tzOffset)
			},
		},
	}
}
