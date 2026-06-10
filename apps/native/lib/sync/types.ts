/**
 * Sync Service Types
 *
 * Types for data synchronization between local SQLite and remote server
 */

/**
 * Sync status for individual records
 */
export type SyncStatus = "synced" | "pending" | "conflict"

/**
 * Overall sync state
 */
export type SyncState = "idle" | "syncing" | "error" | "conflict"

/**
 * Conflict resolution strategy
 */
export type ConflictStrategy = "local" | "remote" | "manual"

/**
 * Sync direction
 */
export type SyncDirection = "upload" | "download" | "bidirectional"

/**
 * Entity types that can be synced
 */
export type SyncEntityType =
  | "entry"
  | "tag"
  | "source"
  | "entryTag"
  | "entrySource"
  | "reviewState"
  | "reviewEvent"

/**
 * Pending operation types
 */
export type OperationType = "create" | "update" | "delete"

/**
 * Pending operation record
 */
export interface PendingOperation {
  createdAt: Date
  entityId: string
  entityType: SyncEntityType
  id: string
  lastError?: string
  operation: OperationType
  payload: string // JSON stringified data
  retryCount: number
}

/**
 * Sync conflict record
 */
export interface SyncConflict {
  createdAt: Date
  entityId: string
  entityType: SyncEntityType
  id: string
  localData: string // JSON stringified
  localUpdatedAt: Date
  remoteData: string // JSON stringified
  remoteUpdatedAt: Date
  resolution?: ConflictStrategy
  resolvedAt?: Date
}

/**
 * Sync result for a single entity
 */
export interface SyncEntityResult {
  conflict?: boolean
  entityId: string
  entityType: SyncEntityType
  error?: string
  success: boolean
}

/**
 * Overall sync result
 */
export interface SyncResult {
  conflictCount: number
  conflicts: SyncConflict[]
  downloadedCount: number
  duration: number
  errorCount: number
  errors: SyncEntityResult[]
  success: boolean
  uploadedCount: number
}

/**
 * Sync progress callback
 */
export interface SyncProgress {
  current: number
  entityType?: SyncEntityType
  phase: "preparing" | "uploading" | "downloading" | "resolving" | "complete"
  total: number
}

/**
 * Sync options
 */
export interface SyncOptions {
  /** Conflict resolution strategy */
  conflictStrategy?: ConflictStrategy
  /** Entity types to sync (default: all) */
  entityTypes?: SyncEntityType[]
  /** Whether to sync incrementally (only changed items) */
  incremental?: boolean
  /** Last sync timestamp for incremental sync */
  lastSyncAt?: Date
  /** Progress callback */
  onProgress?: (progress: SyncProgress) => void
}

/**
 * Sync metadata stored locally
 */
export interface SyncMetadata {
  conflictsCount: number
  lastSyncAt: Date | null
  lastSyncResult: "success" | "partial" | "failed" | null
  pendingOperationsCount: number
}
