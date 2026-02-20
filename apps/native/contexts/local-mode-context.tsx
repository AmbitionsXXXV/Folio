import { StorageKey } from '@folionote/constants'
import * as SecureStore from 'expo-secure-store'
import type { ReactNode } from 'react'
import { createContext, use, useCallback, useEffect, useState } from 'react'

interface LocalModeContextValue {
	/**
	 * Disable local mode (when user signs in)
	 */
	disableLocalMode: () => Promise<void>
	/**
	 * Enable local mode (skip login)
	 */
	enableLocalMode: () => Promise<void>
	/**
	 * Whether the local mode state is being loaded
	 */
	isLoading: boolean
	/**
	 * Whether the user is in local mode (skipped login)
	 */
	isLocalMode: boolean
	/**
	 * Local user ID for offline data association
	 */
	localUserId: string | null
}

const LocalModeContext = createContext<LocalModeContextValue | null>(null)

/**
 * Generate a unique local user ID
 */
function generateLocalUserId(): string {
	const timestamp = Date.now().toString(36)
	const randomPart = Math.random().toString(36).substring(2, 10)
	return `local_${timestamp}_${randomPart}`
}

export function LocalModeProvider({ children }: { children: ReactNode }) {
	const [isLocalMode, setIsLocalMode] = useState(false)
	const [isLoading, setIsLoading] = useState(true)
	const [localUserId, setLocalUserId] = useState<string | null>(null)

	// Load local mode state on mount
	useEffect(() => {
		async function loadLocalModeState() {
			try {
				const [storedMode, storedUserId] = await Promise.all([
					SecureStore.getItemAsync(StorageKey.LOCAL_MODE),
					SecureStore.getItemAsync(StorageKey.LOCAL_USER_ID),
				])

				if (storedMode === 'true') {
					setIsLocalMode(true)
					setLocalUserId(storedUserId)
				}
			} catch (error) {
				console.error('Failed to load local mode state:', error)
			} finally {
				setIsLoading(false)
			}
		}

		loadLocalModeState()
	}, [])

	const enableLocalMode = useCallback(async () => {
		try {
			// Generate a local user ID if not exists
			let userId = await SecureStore.getItemAsync(StorageKey.LOCAL_USER_ID)
			if (!userId) {
				userId = generateLocalUserId()
				await SecureStore.setItemAsync(StorageKey.LOCAL_USER_ID, userId)
			}

			await SecureStore.setItemAsync(StorageKey.LOCAL_MODE, 'true')
			setLocalUserId(userId)
			setIsLocalMode(true)
		} catch (error) {
			console.error('Failed to enable local mode:', error)
			throw error
		}
	}, [])

	const disableLocalMode = useCallback(async () => {
		try {
			await SecureStore.setItemAsync(StorageKey.LOCAL_MODE, 'false')
			setIsLocalMode(false)
			// Note: We keep the localUserId for potential future data sync
		} catch (error) {
			console.error('Failed to disable local mode:', error)
			throw error
		}
	}, [])

	return (
		<LocalModeContext
			value={{
				isLocalMode,
				isLoading,
				localUserId,
				enableLocalMode,
				disableLocalMode,
			}}
		>
			{children}
		</LocalModeContext>
	)
}

export function useLocalMode() {
	const context = use(LocalModeContext)
	if (!context) {
		throw new Error('useLocalMode must be used within a LocalModeProvider')
	}
	return context
}
