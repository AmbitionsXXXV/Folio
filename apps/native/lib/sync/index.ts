/**
 * Sync Module
 *
 * Exports for data synchronization between local SQLite and remote server
 */

export { pendingOperations } from './pending-operations'
export { syncService } from './sync-service'
export type {
	ConflictStrategy,
	OperationType,
	PendingOperation,
	SyncConflict,
	SyncEntityResult,
	SyncEntityType,
	SyncMetadata,
	SyncOptions,
	SyncProgress,
	SyncResult,
	SyncState,
	SyncStatus,
} from './types'
