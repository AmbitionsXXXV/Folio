/**
 * Sync Context
 *
 * Provides sync state management and triggers sync operations.
 * Handles sync on login, network state changes, and manual triggers.
 */

import type { ReactNode } from 'react'
import {
	createContext,
	use,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { useIsOnline } from '@/hooks'
import { authClient } from '@/lib/auth-client'
import {
	type ConflictStrategy,
	type SyncConflict,
	type SyncMetadata,
	type SyncProgress,
	type SyncResult,
	type SyncState,
	syncService,
} from '@/lib/sync'
import { useLocalMode } from './local-mode-context'

/**
 * Get user ID for sync based on auth state
 */
function getUserIdForSync(
	isAuthenticated: boolean,
	sessionUserId: string | undefined,
	isLocalMode: boolean,
	localUserId: string | null
): string | null {
	if (isAuthenticated) {
		return sessionUserId ?? null
	}
	if (isLocalMode) {
		return localUserId
	}
	return null
}

interface SyncContextValue {
	/**
	 * Current sync state
	 */
	syncState: SyncState
	/**
	 * Whether the device is online
	 */
	isOnline: boolean
	/**
	 * Sync metadata (last sync time, pending count, etc.)
	 */
	metadata: SyncMetadata | null
	/**
	 * Unresolved conflicts
	 */
	conflicts: SyncConflict[]
	/**
	 * Current sync progress (when syncing)
	 */
	progress: SyncProgress | null
	/**
	 * Last sync result
	 */
	lastResult: SyncResult | null
	/**
	 * Trigger a manual sync
	 */
	sync: () => Promise<SyncResult | null>
	/**
	 * Upload all local data (for first sync after login)
	 */
	uploadAllLocalData: () => Promise<SyncResult | null>
	/**
	 * Resolve a conflict
	 */
	resolveConflict: (conflictId: string, strategy: ConflictStrategy) => Promise<void>
	/**
	 * Refresh metadata
	 */
	refreshMetadata: () => Promise<void>
}

const SyncContext = createContext<SyncContextValue | null>(null)

export function SyncProvider({ children }: { children: ReactNode }) {
	const { data: session } = authClient.useSession()
	const { isLocalMode, localUserId } = useLocalMode()
	const isOnline = useIsOnline()

	const [syncState, setSyncState] = useState<SyncState>('idle')
	const [metadata, setMetadata] = useState<SyncMetadata | null>(null)
	const [conflicts, setConflicts] = useState<SyncConflict[]>([])
	const [progress, setProgress] = useState<SyncProgress | null>(null)
	const [lastResult, setLastResult] = useState<SyncResult | null>(null)

	const isAuthenticated = !!session?.user
	const previousAuthState = useRef(isAuthenticated)

	// Subscribe to sync state changes
	useEffect(() => {
		const unsubscribe = syncService.subscribe((state) => {
			setSyncState(state)
		})
		return unsubscribe
	}, [])

	// Refresh metadata
	const refreshMetadata = useCallback(async () => {
		const meta = await syncService.getMetadata()
		setMetadata(meta)
		const unresolvedConflicts = await syncService.getConflicts()
		setConflicts(unresolvedConflicts)
	}, [])

	// Load metadata on mount
	useEffect(() => {
		refreshMetadata()
	}, [refreshMetadata])

	// Trigger sync when user logs in (transition from local mode to authenticated)
	useEffect(() => {
		const wasLocalMode = previousAuthState.current === false && isLocalMode
		const nowAuthenticated = isAuthenticated

		if (wasLocalMode && nowAuthenticated && localUserId && isOnline) {
			// User just logged in from local mode, upload local data
			syncService.uploadAllLocalData(localUserId).then((result) => {
				setLastResult(result)
				refreshMetadata()
			})
		}

		previousAuthState.current = isAuthenticated
	}, [isAuthenticated, isLocalMode, localUserId, isOnline, refreshMetadata])

	// Manual sync
	const sync = useCallback(async (): Promise<SyncResult | null> => {
		if (!isOnline) {
			return null
		}

		const userId = getUserIdForSync(
			isAuthenticated,
			session?.user?.id,
			isLocalMode,
			localUserId
		)

		if (!userId) {
			return null
		}

		const result = await syncService.sync(userId, {
			incremental: true,
			onProgress: (p) => setProgress(p),
		})

		setLastResult(result)
		setProgress(null)
		await refreshMetadata()

		return result
	}, [
		isOnline,
		isAuthenticated,
		isLocalMode,
		localUserId,
		session?.user?.id,
		refreshMetadata,
	])

	// Upload all local data
	const uploadAllLocalData = useCallback(async (): Promise<SyncResult | null> => {
		if (!(isOnline && localUserId)) {
			return null
		}

		const result = await syncService.uploadAllLocalData(localUserId)
		setLastResult(result)
		await refreshMetadata()

		return result
	}, [isOnline, localUserId, refreshMetadata])

	// Resolve conflict
	const resolveConflict = useCallback(
		async (conflictId: string, strategy: ConflictStrategy): Promise<void> => {
			await syncService.resolveConflict(conflictId, strategy)
			await refreshMetadata()
		},
		[refreshMetadata]
	)

	const value = useMemo(
		() => ({
			syncState,
			isOnline,
			metadata,
			conflicts,
			progress,
			lastResult,
			sync,
			uploadAllLocalData,
			resolveConflict,
			refreshMetadata,
		}),
		[
			syncState,
			isOnline,
			metadata,
			conflicts,
			progress,
			lastResult,
			sync,
			uploadAllLocalData,
			resolveConflict,
			refreshMetadata,
		]
	)

	return <SyncContext value={value}>{children}</SyncContext>
}

export function useSync() {
	const context = use(SyncContext)
	if (!context) {
		throw new Error('useSync must be used within a SyncProvider')
	}
	return context
}
