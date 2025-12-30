import { and, desc, eq, like } from 'drizzle-orm'

import { localDb } from '../db'
import {
	entryTags,
	type NewEntryTag,
	type NewTag,
	type Tag,
	tags,
} from '../db/schema'
import { generateLocalId, now } from '../db/utils'
import type { BaseRepository, PaginatedResult } from './base-repository'

/**
 * Options for listing tags
 */
export interface ListTagsOptions {
	userId: string
	search?: string
	limit?: number
	cursor?: string
}

/**
 * Input for creating a tag
 */
export interface CreateTagInput {
	userId: string
	name: string
	color?: string
}

/**
 * Input for updating a tag
 */
export interface UpdateTagInput {
	name?: string
	color?: string
}

/**
 * Where condition type for findMany
 */
interface FindManyOptions {
	limit?: number
	offset?: number
}

/**
 * Local tags repository
 * Handles CRUD operations for tags in SQLite
 */
export class TagsRepository implements BaseRepository<Tag, NewTag, UpdateTagInput> {
	/**
	 * Find a tag by ID
	 */
	async findById(id: string): Promise<Tag | null> {
		const result = await localDb.select().from(tags).where(eq(tags.id, id)).limit(1)

		return result[0] ?? null
	}

	/**
	 * Find a tag by name for a user
	 */
	async findByName(userId: string, name: string): Promise<Tag | null> {
		const result = await localDb
			.select()
			.from(tags)
			.where(and(eq(tags.userId, userId), eq(tags.name, name)))
			.limit(1)

		return result[0] ?? null
	}

	/**
	 * Find many tags with filters
	 */
	findMany(options?: FindManyOptions): Promise<Tag[]> {
		let query = localDb.select().from(tags).orderBy(desc(tags.updatedAt))

		if (options?.limit) {
			query = query.limit(options.limit) as typeof query
		}

		if (options?.offset) {
			query = query.offset(options.offset) as typeof query
		}

		return query
	}

	/**
	 * List tags with pagination and search
	 */
	async list(options: ListTagsOptions): Promise<PaginatedResult<Tag>> {
		const { userId, search, limit = 50 } = options

		// Build where conditions
		const conditions = [eq(tags.userId, userId)]

		// Apply search
		if (search) {
			conditions.push(like(tags.name, `%${search}%`))
		}

		// Execute query
		const items = await localDb
			.select()
			.from(tags)
			.where(and(...conditions))
			.orderBy(desc(tags.updatedAt))
			.limit(limit + 1)

		// Check if there are more items
		const hasMore = items.length > limit
		if (hasMore) {
			items.pop()
		}

		return {
			items,
			total: items.length,
			hasMore,
		}
	}

	/**
	 * Create a new tag
	 */
	async create(data: CreateTagInput): Promise<Tag> {
		const id = generateLocalId()
		const timestamp = now()

		const newTag: NewTag = {
			id,
			userId: data.userId,
			name: data.name,
			color: data.color,
			createdAt: timestamp,
			updatedAt: timestamp,
			syncStatus: 'pending',
		}

		await localDb.insert(tags).values(newTag)

		const result = await this.findById(id)
		if (!result) {
			throw new Error('Failed to create tag')
		}
		return result
	}

	/**
	 * Update an existing tag
	 */
	async update(id: string, data: UpdateTagInput): Promise<Tag | null> {
		const existing = await this.findById(id)
		if (!existing) {
			return null
		}

		const updateData: Partial<NewTag> = {
			...data,
			updatedAt: now(),
			syncStatus: 'pending',
		}

		await localDb.update(tags).set(updateData).where(eq(tags.id, id))

		return this.findById(id)
	}

	/**
	 * Delete a tag
	 */
	async delete(id: string): Promise<boolean> {
		// First delete all entry_tags associations
		await localDb.delete(entryTags).where(eq(entryTags.tagId, id))

		// Then delete the tag
		const result = await localDb.delete(tags).where(eq(tags.id, id))

		return result.changes > 0
	}

	/**
	 * Get tags for an entry
	 */
	async getTagsForEntry(entryId: string): Promise<Tag[]> {
		const result = await localDb
			.select({ tag: tags })
			.from(entryTags)
			.innerJoin(tags, eq(entryTags.tagId, tags.id))
			.where(eq(entryTags.entryId, entryId))

		return result.map((r) => r.tag)
	}

	/**
	 * Add a tag to an entry
	 */
	async addTagToEntry(entryId: string, tagId: string): Promise<void> {
		// Check if already exists
		const existing = await localDb
			.select()
			.from(entryTags)
			.where(and(eq(entryTags.entryId, entryId), eq(entryTags.tagId, tagId)))
			.limit(1)

		if (existing.length > 0) {
			return
		}

		const newEntryTag: NewEntryTag = {
			id: generateLocalId(),
			entryId,
			tagId,
			createdAt: now(),
			syncStatus: 'pending',
		}

		await localDb.insert(entryTags).values(newEntryTag)
	}

	/**
	 * Remove a tag from an entry
	 */
	async removeTagFromEntry(entryId: string, tagId: string): Promise<void> {
		await localDb
			.delete(entryTags)
			.where(and(eq(entryTags.entryId, entryId), eq(entryTags.tagId, tagId)))
	}

	/**
	 * Get tags pending sync
	 */
	getPendingSync(userId: string): Promise<Tag[]> {
		return localDb
			.select()
			.from(tags)
			.where(and(eq(tags.userId, userId), eq(tags.syncStatus, 'pending')))
	}

	/**
	 * Mark tag as synced
	 */
	async markSynced(id: string): Promise<void> {
		await localDb
			.update(tags)
			.set({
				syncStatus: 'synced',
				lastSyncedAt: now(),
			})
			.where(eq(tags.id, id))
	}
}

// Export singleton instance
export const tagsRepository = new TagsRepository()
