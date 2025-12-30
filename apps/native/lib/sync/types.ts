/**
 * Sync Service Types
 *
 * Types for data synchronization between local SQLite and remote server
 */

/**
 * Sync status for individual records
 */
export type SyncStatus = 'synced' | 'pending' | 'conflict'

/**
 * Overall sync state
 */
export type SyncState = 'idle' | 'syncing' | 'error' | 'conflict'

/**
 * Conflict resolution strategy
 */
export type ConflictStrategy = 'local' | 'remote' | 'manual'

/**
 * Sync direction
 */
export type SyncDirection = 'upload' | 'download' | 'bidirectional'

/**
 * Entity types that can be synced
 */
export type SyncEntityType =
	| 'entry'
	| 'tag'
	| 'source'
	| 'entryTag'
	| 'entrySource'
	| 'reviewState'
	| 'reviewEvent'

/**
 * Pending operation types
 */
export type OperationType = 'create' | 'update' | 'delete'

/**
 * Pending operation record
 */
export interface PendingOperation {
	id: string
	entityType: SyncEntityType
	entityId: string
	operation: OperationType
	payload: string // JSON stringified data
	createdAt: Date
	retryCount: number
	lastError?: string
}

/**
 * Sync conflict record
 */
export interface SyncConflict {
	id: string
	entityType: SyncEntityType
	entityId: string
	localData: string // JSON stringified
	remoteData: string // JSON stringified
	localUpdatedAt: Date
	remoteUpdatedAt: Date
	createdAt: Date
	resolvedAt?: Date
	resolution?: ConflictStrategy
}

/**
 * Sync result for a single entity
 */
export interface SyncEntityResult {
	entityType: SyncEntityType
	entityId: string
	success: boolean
	error?: string
	conflict?: boolean
}

/**
 * Overall sync result
 */
export interface SyncResult {
	success: boolean
	uploadedCount: number
	downloadedCount: number
	conflictCount: number
	errorCount: number
	errors: SyncEntityResult[]
	conflicts: SyncConflict[]
	duration: number
}

/**
 * Sync progress callback
 */
export interface SyncProgress {
	phase: 'preparing' | 'uploading' | 'downloading' | 'resolving' | 'complete'
	current: number
	total: number
	entityType?: SyncEntityType
}

/**
 * Sync options
 */
export interface SyncOptions {
	/** Conflict resolution strategy */
	conflictStrategy?: ConflictStrategy
	/** Whether to sync incrementally (only changed items) */
	incremental?: boolean
	/** Last sync timestamp for incremental sync */
	lastSyncAt?: Date
	/** Progress callback */
	onProgress?: (progress: SyncProgress) => void
	/** Entity types to sync (default: all) */
	entityTypes?: SyncEntityType[]
}

/**
 * Sync metadata stored locally
 */
export interface SyncMetadata {
	lastSyncAt: Date | null
	lastSyncResult: 'success' | 'partial' | 'failed' | null
	pendingOperationsCount: number
	conflictsCount: number
}
