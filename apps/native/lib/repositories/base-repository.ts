import type { SQL } from "drizzle-orm"

/**
 * Base interface for all repositories
 * Defines common CRUD operations
 */
export interface BaseRepository<
  TSelect,
  TInsert,
  TUpdate extends Partial<TInsert> = Partial<TInsert>
> {
  /**
   * Create a new entity
   */
  create(data: TInsert): Promise<TSelect>

  /**
   * Delete an entity (soft delete if supported)
   */
  delete(id: string): Promise<boolean>
  /**
   * Find a single entity by ID
   */
  findById(id: string): Promise<TSelect | null>

  /**
   * Find all entities matching the given criteria
   */
  findMany(options?: FindManyOptions<TSelect>): Promise<TSelect[]>

  /**
   * Update an existing entity
   */
  update(id: string, data: TUpdate): Promise<TSelect | null>
}

/**
 * Options for findMany queries
 */
export interface FindManyOptions<T> {
  /** Limit number of results */
  limit?: number
  /** Offset for pagination */
  offset?: number
  /** Order by field */
  orderBy?: {
    field: keyof T
    direction: "asc" | "desc"
  }
  /** Filter conditions */
  where?: SQL
}

/**
 * Paginated result type
 */
export interface PaginatedResult<T> {
  cursor?: string
  hasMore: boolean
  items: T[]
  total: number
}
