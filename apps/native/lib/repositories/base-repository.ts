import type { SQL } from 'drizzle-orm'

/**
 * Base interface for all repositories
 * Defines common CRUD operations
 */
export interface BaseRepository<
	TSelect,
	TInsert,
	TUpdate extends Partial<TInsert> = Partial<TInsert>,
> {
	/**
	 * Find a single entity by ID
	 */
	findById(id: string): Promise<TSelect | null>

	/**
	 * Find all entities matching the given criteria
	 */
	findMany(options?: FindManyOptions<TSelect>): Promise<TSelect[]>

	/**
	 * Create a new entity
	 */
	create(data: TInsert): Promise<TSelect>

	/**
	 * Update an existing entity
	 */
	update(id: string, data: TUpdate): Promise<TSelect | null>

	/**
	 * Delete an entity (soft delete if supported)
	 */
	delete(id: string): Promise<boolean>
}

/**
 * Options for findMany queries
 */
export interface FindManyOptions<T> {
	/** Filter conditions */
	where?: SQL
	/** Order by field */
	orderBy?: {
		field: keyof T
		direction: 'asc' | 'desc'
	}
	/** Limit number of results */
	limit?: number
	/** Offset for pagination */
	offset?: number
}

/**
 * Paginated result type
 */
export interface PaginatedResult<T> {
	items: T[]
	total: number
	hasMore: boolean
	cursor?: string
}
