/**
 * Utility functions for local database operations
 */

// Regex for ISO date string validation (moved to top level for performance)
const ISO_DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/

/**
 * Generate a unique ID for local entities
 * Format: local_{timestamp}_{random}
 */
export function generateLocalId(): string {
	const timestamp = Date.now().toString(36)
	const randomPart = Math.random().toString(36).substring(2, 10)
	return `local_${timestamp}_${randomPart}`
}

/**
 * Check if an ID is a local-generated ID
 */
export function isLocalId(id: string): boolean {
	return id.startsWith('local_')
}

/**
 * Get current timestamp in milliseconds
 */
export function now(): Date {
	return new Date()
}

/**
 * Sync status for local entities
 */
export type SyncStatus = 'synced' | 'pending' | 'conflict'

/**
 * Check if a string is an ISO date string
 */
function isISODateString(value: string): boolean {
	return ISO_DATE_REGEX.test(value)
}

/**
 * Convert server entity to local format
 * Handles timestamp conversion and field mapping
 */
export function serverToLocal<T extends Record<string, unknown>>(
	serverEntity: T
): T {
	const result: Record<string, unknown> = {}

	for (const [key, value] of Object.entries(serverEntity)) {
		// Convert Date objects to timestamps
		if (value instanceof Date) {
			result[key] = value
		} else if (typeof value === 'string' && isISODateString(value)) {
			result[key] = new Date(value)
		} else {
			result[key] = value
		}
	}

	return result as T
}

/**
 * Convert local entity to server format
 * Handles timestamp conversion and removes local-only fields
 */
export function localToServer<T extends Record<string, unknown>>(
	localEntity: T
): Omit<T, 'syncStatus' | 'lastSyncedAt'> {
	const {
		syncStatus: _syncStatus,
		lastSyncedAt: _lastSyncedAt,
		...rest
	} = localEntity as Record<string, unknown>
	return rest as Omit<T, 'syncStatus' | 'lastSyncedAt'>
}
