import { useCallback, useState } from 'react'
import { authClient } from '@/lib/auth-client'

/**
 * Hook for managing avatar state with optimistic updates
 *
 * Provides a unified way to manage avatar URL state that:
 * - Falls back to session user image when local state is undefined
 * - Supports optimistic updates via setLocalImageUrl
 * - Can be reset to sync with server state
 *
 * @returns Object containing current image URL, setter, and reset function
 */
export function useAvatarState() {
	const { data: session } = authClient.useSession()
	const [localImageUrl, setLocalImageUrl] = useState<string | null | undefined>(
		undefined
	)

	// Get the current image URL (local state takes precedence if set)
	const currentImageUrl =
		localImageUrl !== undefined ? localImageUrl : session?.user?.image

	// Handle avatar change (for optimistic updates)
	const handleAvatarChange = useCallback((newUrl: string | null) => {
		setLocalImageUrl(newUrl)
	}, [])

	// Reset local state to sync with server
	const resetAvatarState = useCallback(() => {
		setLocalImageUrl(undefined)
	}, [])

	return {
		/** Current image URL (local state or session user image) */
		currentImageUrl,
		/** Set local image URL for optimistic updates */
		setLocalImageUrl: handleAvatarChange,
		/** Reset to server state */
		resetAvatarState,
		/** Raw local state value */
		localImageUrl,
		/** Session user data */
		user: session?.user,
	}
}
