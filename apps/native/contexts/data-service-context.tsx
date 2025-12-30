import type { ReactNode } from 'react'
import { createContext, use, useMemo } from 'react'
import migrations from '@/drizzle/migrations'
import { authClient } from '@/lib/auth-client'
import {
	createLocalDataService,
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

	const isAuthenticated = !!session?.user
	const isLocal = !isAuthenticated && isLocalMode

	// Run migrations using Drizzle's useMigrations hook
	const { success: migrationSuccess, error: migrationError } = useMigrations(
		localDb,
		migrations
	)

	const isMigrating = !(migrationSuccess || migrationError)

	// Create appropriate data service based on auth state
	const dataService = useMemo(() => {
		if (isAuthenticated) {
			// User is logged in, use remote API
			return createRemoteDataService()
		}

		if (isLocal && localUserId && migrationSuccess) {
			// User is in local mode with initialized database
			return createLocalDataService(localUserId)
		}

		// Not ready yet
		return null
	}, [isAuthenticated, isLocal, localUserId, migrationSuccess])

	return (
		<DataServiceContext
			value={{
				dataService,
				isLocal,
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
