import type { ReactNode } from 'react'
import { createContext, use, useMemo } from 'react'
import migrations from '@/drizzle/migrations'
import { useIsOnline } from '@/hooks'
import { authClient } from '@/lib/auth-client'
import {
	createLocalDataService,
	createOfflineFirstDataService,
	createRemoteDataService,
	type DataService,
} from '@/lib/data-service'
import { localDb, useMigrations } from '@/lib/db'
import { useLocalMode } from './local-mode-context'

interface DataServiceContextValue {
	/**
	 * The data service instance
	 * Automatically switches between local and remote based on auth state
	 */
	dataService: DataService | null
	/**
	 * Whether the data service is using local storage
	 */
	isLocal: boolean
	/**
	 * Whether the device is offline
	 */
	isOffline: boolean
	/**
	 * Whether using offline-first mode (authenticated but with local caching)
	 */
	isOfflineFirst: boolean
	/**
	 * Whether the database migrations are in progress
	 */
	isMigrating: boolean
	/**
	 * Whether migrations completed successfully
	 */
	migrationSuccess: boolean
	/**
	 * Error during migration
	 */
	migrationError: Error | null
}

const DataServiceContext = createContext<DataServiceContextValue | null>(null)

export function DataServiceProvider({ children }: { children: ReactNode }) {
	const { data: session } = authClient.useSession()
	const { isLocalMode, localUserId } = useLocalMode()
	const isOnline = useIsOnline()

	const isAuthenticated = !!session?.user
	const isLocal = !isAuthenticated && isLocalMode
	const isOffline = !isOnline

	// Run migrations using Drizzle's useMigrations hook
	const { success: migrationSuccess, error: migrationError } = useMigrations(
		localDb,
		migrations
	)

	const isMigrating = !(migrationSuccess || migrationError)

	// Determine if we should use offline-first mode
	// Use offline-first when authenticated but want local caching
	const useOfflineFirst = isAuthenticated && migrationSuccess && localUserId

	// Create appropriate data service based on auth state and network
	const dataService = useMemo(() => {
		if (isAuthenticated && isOnline && !useOfflineFirst) {
			// User is logged in and online, use remote API directly
			return createRemoteDataService()
		}

		if (useOfflineFirst && localUserId) {
			// Use offline-first service for authenticated users with local caching
			return createOfflineFirstDataService(localUserId)
		}

		if (isLocal && localUserId && migrationSuccess) {
			// User is in local mode with initialized database
			return createLocalDataService(localUserId)
		}

		// Not ready yet
		return null
	}, [
		isAuthenticated,
		isOnline,
		isLocal,
		localUserId,
		migrationSuccess,
		useOfflineFirst,
	])

	return (
		<DataServiceContext
			value={{
				dataService,
				isLocal,
				isOffline,
				isOfflineFirst: !!useOfflineFirst,
				isMigrating,
				migrationSuccess,
				migrationError: migrationError ?? null,
			}}
		>
			{children}
		</DataServiceContext>
	)
}

/**
 * Hook to access the data service
 */
export function useDataService(): DataService {
	const context = use(DataServiceContext)
	if (!context) {
		throw new Error('useDataService must be used within a DataServiceProvider')
	}
	if (!context.dataService) {
		throw new Error(
			'DataService not initialized. Check isMigrating or migrationError.'
		)
	}
	return context.dataService
}

/**
 * Hook to access data service context with initialization state
 */
export function useDataServiceContext(): DataServiceContextValue {
	const context = use(DataServiceContext)
	if (!context) {
		throw new Error(
			'useDataServiceContext must be used within a DataServiceProvider'
		)
	}
	return context
}

/**
 * Hook to check if the app is in offline mode
 */
export function useIsOffline(): boolean {
	const context = use(DataServiceContext)
	return context?.isOffline ?? false
}
