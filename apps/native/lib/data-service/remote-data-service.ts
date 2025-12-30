/**
 * Remote Data Service
 *
 * Implementation of DataService using remote API (oRPC).
 * Used when the user is logged in and connected to the server.
 */

import { client } from '../../utils/orpc'
import type { Entry, Source, Tag } from '../db/schema'
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

interface ServerEntry {
	id: string
	userId: string
	title: string
	contentJson?: string | null
	contentText?: string | null
	isInbox: boolean
	isStarred: boolean
	isPinned: boolean
	createdAt: string | Date
	updatedAt: string | Date
	version: string
	deletedAt?: string | Date | null
}

interface ServerTag {
	id: string
	userId: string
	name: string
	color?: string | null
	createdAt: string | Date
	updatedAt: string | Date
}

interface ServerSource {
	id: string
	userId: string
	type: string
	title: string
	url?: string | null
	author?: string | null
	publishedAt?: string | Date | null
	metadata?: string | null
	createdAt: string | Date
	updatedAt: string | Date
	deletedAt?: string | Date | null
}

/**
 * Convert server entry to local Entry type
 */
function toLocalEntry(serverEntry: ServerEntry): Entry {
	return {
		id: serverEntry.id,
		userId: serverEntry.userId,
		title: serverEntry.title,
		contentJson: serverEntry.contentJson ?? null,
		contentText: serverEntry.contentText ?? null,
		isInbox: serverEntry.isInbox,
		isStarred: serverEntry.isStarred,
		isPinned: serverEntry.isPinned,
		createdAt: new Date(serverEntry.createdAt),
		updatedAt: new Date(serverEntry.updatedAt),
		version: serverEntry.version,
		deletedAt: serverEntry.deletedAt ? new Date(serverEntry.deletedAt) : null,
		syncStatus: 'synced',
		lastSyncedAt: new Date(),
	}
}

/**
 * Convert server tag to local Tag type
 */
function toLocalTag(serverTag: ServerTag): Tag {
	return {
		id: serverTag.id,
		userId: serverTag.userId,
		name: serverTag.name,
		color: serverTag.color ?? null,
		createdAt: new Date(serverTag.createdAt),
		updatedAt: new Date(serverTag.updatedAt),
		syncStatus: 'synced',
		lastSyncedAt: new Date(),
	}
}

/**
 * Convert server source to local Source type
 */
function toLocalSource(serverSource: ServerSource): Source {
	return {
		id: serverSource.id,
		userId: serverSource.userId,
		type: serverSource.type,
		title: serverSource.title,
		url: serverSource.url ?? null,
		author: serverSource.author ?? null,
		publishedAt: serverSource.publishedAt
			? new Date(serverSource.publishedAt)
			: null,
		metadata: serverSource.metadata ?? null,
		createdAt: new Date(serverSource.createdAt),
		updatedAt: new Date(serverSource.updatedAt),
		deletedAt: serverSource.deletedAt ? new Date(serverSource.deletedAt) : null,
		syncStatus: 'synced',
		lastSyncedAt: new Date(),
	}
}

/**
 * Create a remote data service
 */
export function createRemoteDataService(): DataService {
	return {
		entries: {
			async list(input: ListEntriesInput): Promise<PaginatedList<Entry>> {
				const result = await client.entries.list({
					filter: input.filter,
					search: input.search,
					tagId: input.tagId,
					limit: input.limit,
					cursor: input.cursor,
				})
				return {
					items: result.items.map((item) => toLocalEntry(item as ServerEntry)),
					hasMore: result.hasMore,
					cursor: result.cursor,
				}
			},

			async get(id: string): Promise<Entry | null> {
				try {
					const result = await client.entries.get({ id })
					return toLocalEntry(result as ServerEntry)
				} catch {
					return null
				}
			},

			async create(input: CreateEntryInput): Promise<Entry> {
				const result = await client.entries.create(input)
				return toLocalEntry(result as ServerEntry)
			},

			async update(id: string, input: UpdateEntryInput): Promise<Entry | null> {
				try {
					const result = await client.entries.update({ id, ...input })
					return toLocalEntry(result as ServerEntry)
				} catch {
					return null
				}
			},

			async delete(id: string): Promise<boolean> {
				try {
					await client.entries.delete({ id })
					return true
				} catch {
					return false
				}
			},

			async toggleStarred(id: string): Promise<Entry | null> {
				try {
					const entry = await this.get(id)
					if (!entry) return null
					const result = await client.entries.update({
						id,
						isStarred: !entry.isStarred,
					})
					return toLocalEntry(result as ServerEntry)
				} catch {
					return null
				}
			},

			async moveToLibrary(id: string): Promise<Entry | null> {
				try {
					const result = await client.entries.update({ id, isInbox: false })
					return toLocalEntry(result as ServerEntry)
				} catch {
					return null
				}
			},

			async moveToInbox(id: string): Promise<Entry | null> {
				try {
					const result = await client.entries.update({ id, isInbox: true })
					return toLocalEntry(result as ServerEntry)
				} catch {
					return null
				}
			},
		},

		tags: {
			async list(input: ListTagsInput): Promise<PaginatedList<Tag>> {
				const result = await client.tags.list({
					search: input.search,
					limit: input.limit,
					cursor: input.cursor,
				})
				return {
					items: result.items.map((item) => toLocalTag(item as ServerTag)),
					hasMore: result.hasMore,
				}
			},

			async get(id: string): Promise<Tag | null> {
				try {
					const result = await client.tags.get({ id })
					return toLocalTag(result as ServerTag)
				} catch {
					return null
				}
			},

			async create(input: CreateTagInput): Promise<Tag> {
				const result = await client.tags.create(input)
				return toLocalTag(result as ServerTag)
			},

			async update(id: string, input: UpdateTagInput): Promise<Tag | null> {
				try {
					const result = await client.tags.update({ id, ...input })
					return toLocalTag(result as ServerTag)
				} catch {
					return null
				}
			},

			async delete(id: string): Promise<boolean> {
				try {
					await client.tags.delete({ id })
					return true
				} catch {
					return false
				}
			},

			async getForEntry(entryId: string): Promise<Tag[]> {
				const result = await client.entries.getTags({ entryId })
				return result.map((item) => toLocalTag(item as ServerTag))
			},

			async addToEntry(entryId: string, tagId: string): Promise<void> {
				await client.entries.addTag({ entryId, tagId })
			},

			async removeFromEntry(entryId: string, tagId: string): Promise<void> {
				await client.entries.removeTag({ entryId, tagId })
			},
		},

		sources: {
			async list(input: ListSourcesInput): Promise<PaginatedList<Source>> {
				const result = await client.sources.list({
					type: input.type,
					search: input.search,
					limit: input.limit,
					cursor: input.cursor,
				})
				return {
					items: result.items.map((item) => toLocalSource(item as ServerSource)),
					hasMore: result.hasMore,
				}
			},

			async get(id: string): Promise<Source | null> {
				try {
					const result = await client.sources.get({ id })
					return toLocalSource(result as ServerSource)
				} catch {
					return null
				}
			},

			async create(input: CreateSourceInput): Promise<Source> {
				const result = await client.sources.create(input)
				return toLocalSource(result as ServerSource)
			},

			async update(id: string, input: UpdateSourceInput): Promise<Source | null> {
				try {
					const result = await client.sources.update({ id, ...input })
					return toLocalSource(result as ServerSource)
				} catch {
					return null
				}
			},

			async delete(id: string): Promise<boolean> {
				try {
					await client.sources.delete({ id })
					return true
				} catch {
					return false
				}
			},

			async getForEntry(entryId: string): Promise<Source[]> {
				const result = await client.entries.getSources({ entryId })
				return result.map((item) => toLocalSource(item as ServerSource))
			},

			async addToEntry(
				entryId: string,
				sourceId: string,
				position?: string
			): Promise<void> {
				await client.entries.addSource({ entryId, sourceId, position })
			},

			async removeFromEntry(entryId: string, sourceId: string): Promise<void> {
				await client.entries.removeSource({ entryId, sourceId })
			},
		},

		review: {
			async getQueue(input: GetQueueInput): Promise<Entry[]> {
				const result = await client.review.getQueue({
					mode: input.mode,
					limit: input.limit,
					tzOffset: input.tzOffset,
				})
				return result.map((item) => toLocalEntry(item as ServerEntry))
			},

			async markReviewed(
				entryId: string,
				rating: ReviewRating = 'good'
			): Promise<void> {
				await client.review.markReviewed({ entryId, rating })
			},

			async snooze(entryId: string, preset: SnoozePreset | number): Promise<void> {
				if (typeof preset === 'number') {
					const untilAt = new Date()
					untilAt.setDate(untilAt.getDate() + preset)
					await client.review.snooze({ entryId, untilAt: untilAt.toISOString() })
				} else {
					await client.review.snooze({ entryId, preset })
				}
			},

			getTodayStats(tzOffset = 0): Promise<TodayStats> {
				return client.review.getTodayStats({ tzOffset })
			},

			getDueStats(tzOffset = 0): Promise<DueStats> {
				return client.review.getDueStats({ tzOffset })
			},
		},
	}
}
