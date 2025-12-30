import { and, desc, eq, isNull, like } from 'drizzle-orm'

import { localDb } from '../db'
import {
	entrySources,
	type NewEntrySource,
	type NewSource,
	type Source,
	sources,
} from '../db/schema'
import { generateLocalId, now } from '../db/utils'
import type { BaseRepository, PaginatedResult } from './base-repository'

/**
 * Source type options
 */
export type SourceType =
	| 'link'
	| 'pdf'
	| 'book'
	| 'article'
	| 'video'
	| 'podcast'
	| 'other'

/**
 * Options for listing sources
 */
export interface ListSourcesOptions {
	userId: string
	type?: SourceType
	search?: string
	limit?: number
	cursor?: string
}

/**
 * Input for creating a source
 */
export interface CreateSourceInput {
	userId: string
	type?: string
	title: string
	url?: string | null
	author?: string | null
	publishedAt?: Date | null
	metadata?: string | null
}

/**
 * Input for updating a source
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
 * Where condition type for findMany
 */
interface FindManyOptions {
	limit?: number
	offset?: number
}

/**
 * Local sources repository
 * Handles CRUD operations for sources in SQLite
 */
export class SourcesRepository
	implements BaseRepository<Source, NewSource, UpdateSourceInput>
{
	/**
	 * Find a source by ID
	 */
	async findById(id: string): Promise<Source | null> {
		const result = await localDb
			.select()
			.from(sources)
			.where(and(eq(sources.id, id), isNull(sources.deletedAt)))
			.limit(1)

		return result[0] ?? null
	}

	/**
	 * Find many sources with filters
	 */
	findMany(options?: FindManyOptions): Promise<Source[]> {
		let query = localDb
			.select()
			.from(sources)
			.where(isNull(sources.deletedAt))
			.orderBy(desc(sources.updatedAt))

		if (options?.limit) {
			query = query.limit(options.limit) as typeof query
		}

		if (options?.offset) {
			query = query.offset(options.offset) as typeof query
		}

		return query
	}

	/**
	 * List sources with pagination and filters
	 */
	async list(options: ListSourcesOptions): Promise<PaginatedResult<Source>> {
		const { userId, type, search, limit = 50 } = options

		// Build where conditions
		const conditions = [eq(sources.userId, userId), isNull(sources.deletedAt)]

		// Apply type filter
		if (type) {
			conditions.push(eq(sources.type, type))
		}

		// Apply search
		if (search) {
			conditions.push(like(sources.title, `%${search}%`))
		}

		// Execute query
		const items = await localDb
			.select()
			.from(sources)
			.where(and(...conditions))
			.orderBy(desc(sources.updatedAt))
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
	 * Create a new source
	 */
	async create(data: CreateSourceInput): Promise<Source> {
		const id = generateLocalId()
		const timestamp = now()

		const newSource: NewSource = {
			id,
			userId: data.userId,
			type: data.type ?? 'link',
			title: data.title,
			url: data.url ?? null,
			author: data.author ?? null,
			publishedAt: data.publishedAt ?? null,
			metadata: data.metadata ?? null,
			createdAt: timestamp,
			updatedAt: timestamp,
			syncStatus: 'pending',
		}

		await localDb.insert(sources).values(newSource)

		const result = await this.findById(id)
		if (!result) {
			throw new Error('Failed to create source')
		}
		return result
	}

	/**
	 * Update an existing source
	 */
	async update(id: string, data: UpdateSourceInput): Promise<Source | null> {
		const existing = await this.findById(id)
		if (!existing) {
			return null
		}

		const updateData: Partial<NewSource> = {
			...data,
			updatedAt: now(),
			syncStatus: 'pending',
		}

		await localDb.update(sources).set(updateData).where(eq(sources.id, id))

		return this.findById(id)
	}

	/**
	 * Soft delete a source
	 */
	async delete(id: string): Promise<boolean> {
		const result = await localDb
			.update(sources)
			.set({
				deletedAt: now(),
				syncStatus: 'pending',
			})
			.where(eq(sources.id, id))

		return result.changes > 0
	}

	/**
	 * Get sources for an entry
	 */
	async getSourcesForEntry(entryId: string): Promise<Source[]> {
		const result = await localDb
			.select({ source: sources })
			.from(entrySources)
			.innerJoin(sources, eq(entrySources.sourceId, sources.id))
			.where(and(eq(entrySources.entryId, entryId), isNull(sources.deletedAt)))

		return result.map((r) => r.source)
	}

	/**
	 * Add a source to an entry
	 */
	async addSourceToEntry(
		entryId: string,
		sourceId: string,
		position?: string
	): Promise<void> {
		// Check if already exists
		const existing = await localDb
			.select()
			.from(entrySources)
			.where(
				and(eq(entrySources.entryId, entryId), eq(entrySources.sourceId, sourceId))
			)
			.limit(1)

		if (existing.length > 0) {
			return
		}

		const newEntrySource: NewEntrySource = {
			id: generateLocalId(),
			entryId,
			sourceId,
			position,
			createdAt: now(),
			syncStatus: 'pending',
		}

		await localDb.insert(entrySources).values(newEntrySource)
	}

	/**
	 * Remove a source from an entry
	 */
	async removeSourceFromEntry(entryId: string, sourceId: string): Promise<void> {
		await localDb
			.delete(entrySources)
			.where(
				and(eq(entrySources.entryId, entryId), eq(entrySources.sourceId, sourceId))
			)
	}

	/**
	 * Get sources pending sync
	 */
	getPendingSync(userId: string): Promise<Source[]> {
		return localDb
			.select()
			.from(sources)
			.where(and(eq(sources.userId, userId), eq(sources.syncStatus, 'pending')))
	}

	/**
	 * Mark source as synced
	 */
	async markSynced(id: string): Promise<void> {
		await localDb
			.update(sources)
			.set({
				syncStatus: 'synced',
				lastSyncedAt: now(),
			})
			.where(eq(sources.id, id))
	}
}

// Export singleton instance
export const sourcesRepository = new SourcesRepository()
