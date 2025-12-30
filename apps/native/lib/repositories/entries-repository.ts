import { and, desc, eq, isNull, like, lt, or } from 'drizzle-orm'

import { localDb } from '../db'
import { type Entry, entries, type NewEntry } from '../db/schema'
import { generateLocalId, now } from '../db/utils'
import type { BaseRepository, PaginatedResult } from './base-repository'

/**
 * Filter options for entries list
 */
export type EntriesFilter = 'all' | 'inbox' | 'starred' | 'library'

/**
 * Options for listing entries
 */
export interface ListEntriesOptions {
	userId: string
	filter?: EntriesFilter
	search?: string
	tagId?: string
	limit?: number
	cursor?: string
}

/**
 * Input for creating an entry
 */
export interface CreateEntryInput {
	userId: string
	title: string
	contentJson?: string
	contentText?: string
	isInbox?: boolean
	isStarred?: boolean
	isPinned?: boolean
}

/**
 * Input for updating an entry
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
 * Where condition type for findMany
 */
interface FindManyOptions {
	limit?: number
	offset?: number
}

/**
 * Local entries repository
 * Handles CRUD operations for entries in SQLite
 */
export class EntriesRepository
	implements BaseRepository<Entry, NewEntry, UpdateEntryInput>
{
	/**
	 * Find an entry by ID
	 */
	async findById(id: string): Promise<Entry | null> {
		const result = await localDb
			.select()
			.from(entries)
			.where(and(eq(entries.id, id), isNull(entries.deletedAt)))
			.limit(1)

		return result[0] ?? null
	}

	/**
	 * Find many entries with filters
	 */
	findMany(options?: FindManyOptions): Promise<Entry[]> {
		let query = localDb
			.select()
			.from(entries)
			.where(isNull(entries.deletedAt))
			.orderBy(desc(entries.updatedAt))

		if (options?.limit) {
			query = query.limit(options.limit) as typeof query
		}

		if (options?.offset) {
			query = query.offset(options.offset) as typeof query
		}

		return query
	}

	/**
	 * List entries with pagination and filters
	 */
	async list(options: ListEntriesOptions): Promise<PaginatedResult<Entry>> {
		const { userId, filter = 'all', search, limit = 50, cursor } = options

		// Build where conditions
		const conditions = [eq(entries.userId, userId), isNull(entries.deletedAt)]

		// Apply filter
		switch (filter) {
			case 'inbox':
				conditions.push(eq(entries.isInbox, true))
				break
			case 'starred':
				conditions.push(eq(entries.isStarred, true))
				break
			case 'library':
				conditions.push(eq(entries.isInbox, false))
				break
			default:
				// 'all' - no additional filter
				break
		}

		// Apply search
		if (search) {
			const searchCondition = or(
				like(entries.title, `%${search}%`),
				like(entries.contentText, `%${search}%`)
			)
			if (searchCondition) {
				conditions.push(searchCondition)
			}
		}

		// Apply cursor (cursor is the updatedAt timestamp of the last item)
		if (cursor) {
			const cursorDate = new Date(cursor)
			// For descending order, get items with updatedAt less than cursor
			conditions.push(lt(entries.updatedAt, cursorDate))
		}

		// Execute query
		const items = await localDb
			.select()
			.from(entries)
			.where(and(...conditions))
			.orderBy(desc(entries.updatedAt))
			.limit(limit + 1)

		// Check if there are more items
		const hasMore = items.length > limit
		if (hasMore) {
			items.pop()
		}

		// Generate next cursor
		const lastItem = items.at(-1)
		const nextCursor = lastItem ? lastItem.updatedAt.toISOString() : undefined

		return {
			items,
			total: items.length,
			hasMore,
			cursor: nextCursor,
		}
	}

	/**
	 * Create a new entry
	 */
	async create(data: CreateEntryInput): Promise<Entry> {
		const id = generateLocalId()
		const timestamp = now()

		const newEntry: NewEntry = {
			id,
			userId: data.userId,
			title: data.title,
			contentJson: data.contentJson,
			contentText: data.contentText,
			isInbox: data.isInbox ?? true,
			isStarred: data.isStarred ?? false,
			isPinned: data.isPinned ?? false,
			createdAt: timestamp,
			updatedAt: timestamp,
			version: '1',
			syncStatus: 'pending',
		}

		await localDb.insert(entries).values(newEntry)

		const result = await this.findById(id)
		if (!result) {
			throw new Error('Failed to create entry')
		}
		return result
	}

	/**
	 * Update an existing entry
	 */
	async update(id: string, data: UpdateEntryInput): Promise<Entry | null> {
		const existing = await this.findById(id)
		if (!existing) {
			return null
		}

		const updateData: Partial<NewEntry> = {
			...data,
			updatedAt: now(),
			syncStatus: 'pending',
		}

		// Increment version if not specified
		if (!data.version) {
			updateData.version = String(Number.parseInt(existing.version, 10) + 1)
		}

		await localDb.update(entries).set(updateData).where(eq(entries.id, id))

		return this.findById(id)
	}

	/**
	 * Soft delete an entry
	 */
	async delete(id: string): Promise<boolean> {
		const result = await localDb
			.update(entries)
			.set({
				deletedAt: now(),
				syncStatus: 'pending',
			})
			.where(eq(entries.id, id))

		return result.changes > 0
	}

	/**
	 * Toggle starred status
	 */
	async toggleStarred(id: string): Promise<Entry | null> {
		const existing = await this.findById(id)
		if (!existing) {
			return null
		}

		return this.update(id, { isStarred: !existing.isStarred })
	}

	/**
	 * Move entry from inbox to library
	 */
	moveToLibrary(id: string): Promise<Entry | null> {
		return this.update(id, { isInbox: false })
	}

	/**
	 * Move entry to inbox
	 */
	moveToInbox(id: string): Promise<Entry | null> {
		return this.update(id, { isInbox: true })
	}

	/**
	 * Get entries pending sync
	 */
	getPendingSync(userId: string): Promise<Entry[]> {
		return localDb
			.select()
			.from(entries)
			.where(and(eq(entries.userId, userId), eq(entries.syncStatus, 'pending')))
	}

	/**
	 * Mark entry as synced
	 */
	async markSynced(id: string, serverId?: string): Promise<void> {
		await localDb
			.update(entries)
			.set({
				syncStatus: 'synced',
				lastSyncedAt: now(),
				// If server returns a different ID, update it
				...(serverId && serverId !== id ? { id: serverId } : {}),
			})
			.where(eq(entries.id, id))
	}
}

// Export singleton instance
export const entriesRepository = new EntriesRepository()
