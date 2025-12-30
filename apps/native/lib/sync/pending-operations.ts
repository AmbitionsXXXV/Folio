/**
 * Pending Operations Manager
 *
 * Manages a queue of operations that need to be synced to the server.
 * Operations are stored in SQLite and processed when network is available.
 */

import * as SecureStore from 'expo-secure-store'
import type { OperationType, PendingOperation, SyncEntityType } from './types'

const PENDING_OPS_KEY = 'folio_pending_operations'

/**
 * Generate a unique ID for pending operations
 */
function generateId(): string {
	const timestamp = Date.now().toString(36)
	const randomPart = Math.random().toString(36).substring(2, 10)
	return `op_${timestamp}_${randomPart}`
}

/**
 * Load pending operations from storage
 */
async function loadOperations(): Promise<PendingOperation[]> {
	try {
		const stored = await SecureStore.getItemAsync(PENDING_OPS_KEY)
		if (!stored) return []

		const parsed = JSON.parse(stored) as Array<{
			id: string
			entityType: SyncEntityType
			entityId: string
			operation: OperationType
			payload: string
			createdAt: string
			retryCount: number
			lastError?: string
		}>

		return parsed.map((op) => ({
			...op,
			createdAt: new Date(op.createdAt),
		}))
	} catch (error) {
		console.error('Failed to load pending operations:', error)
		return []
	}
}

/**
 * Save pending operations to storage
 */
async function saveOperations(operations: PendingOperation[]): Promise<void> {
	try {
		const serialized = JSON.stringify(
			operations.map((op) => ({
				...op,
				createdAt: op.createdAt.toISOString(),
			}))
		)
		await SecureStore.setItemAsync(PENDING_OPS_KEY, serialized)
	} catch (error) {
		console.error('Failed to save pending operations:', error)
		throw error
	}
}

/**
 * Pending Operations Manager
 */
export const pendingOperations = {
	/**
	 * Add a new pending operation
	 */
	async add(
		entityType: SyncEntityType,
		entityId: string,
		operation: OperationType,
		payload: unknown
	): Promise<PendingOperation> {
		const operations = await loadOperations()

		// Check for existing operation on the same entity
		const existingIndex = operations.findIndex(
			(op) => op.entityType === entityType && op.entityId === entityId
		)

		const newOp: PendingOperation = {
			id: generateId(),
			entityType,
			entityId,
			operation,
			payload: JSON.stringify(payload),
			createdAt: new Date(),
			retryCount: 0,
		}

		if (existingIndex >= 0) {
			const existing = operations[existingIndex]

			// Merge operations intelligently
			if (existing.operation === 'create' && operation === 'update') {
				// Keep as create with updated payload
				newOp.operation = 'create'
				newOp.id = existing.id
				newOp.createdAt = existing.createdAt
			} else if (existing.operation === 'create' && operation === 'delete') {
				// Remove the operation entirely (never synced, now deleted)
				operations.splice(existingIndex, 1)
				await saveOperations(operations)
				return newOp
			} else if (existing.operation === 'update' && operation === 'delete') {
				// Replace update with delete
				newOp.operation = 'delete'
			}

			// Replace existing operation
			operations[existingIndex] = newOp
		} else {
			operations.push(newOp)
		}

		await saveOperations(operations)
		return newOp
	},

	/**
	 * Get all pending operations
	 */
	getAll(): Promise<PendingOperation[]> {
		return loadOperations()
	},

	/**
	 * Get pending operations by entity type
	 */
	async getByEntityType(entityType: SyncEntityType): Promise<PendingOperation[]> {
		const operations = await loadOperations()
		return operations.filter((op) => op.entityType === entityType)
	},

	/**
	 * Get pending operation count
	 */
	async getCount(): Promise<number> {
		const operations = await loadOperations()
		return operations.length
	},

	/**
	 * Remove a pending operation (after successful sync)
	 */
	async remove(id: string): Promise<void> {
		const operations = await loadOperations()
		const filtered = operations.filter((op) => op.id !== id)
		await saveOperations(filtered)
	},

	/**
	 * Remove multiple pending operations
	 */
	async removeMany(ids: string[]): Promise<void> {
		const operations = await loadOperations()
		const filtered = operations.filter((op) => !ids.includes(op.id))
		await saveOperations(filtered)
	},

	/**
	 * Update retry count and error for a failed operation
	 */
	async markFailed(id: string, error: string): Promise<void> {
		const operations = await loadOperations()
		const index = operations.findIndex((op) => op.id === id)

		if (index >= 0) {
			operations[index] = {
				...operations[index],
				retryCount: operations[index].retryCount + 1,
				lastError: error,
			}
			await saveOperations(operations)
		}
	},

	/**
	 * Clear all pending operations
	 */
	async clear(): Promise<void> {
		await SecureStore.deleteItemAsync(PENDING_OPS_KEY)
	},

	/**
	 * Get operations that have exceeded max retries
	 */
	async getFailedOperations(maxRetries = 3): Promise<PendingOperation[]> {
		const operations = await loadOperations()
		return operations.filter((op) => op.retryCount >= maxRetries)
	},
}
