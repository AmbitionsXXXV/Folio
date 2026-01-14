import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'folionote:last-used-model'

type LastUsedModel = {
	provider: string
	model: string
}

/**
 * Hook to persist and retrieve the last used AI model selection in localStorage
 */
export function useLastUsedModel() {
	const [lastUsed, setLastUsed] = useState<LastUsedModel | null>(null)

	// Load from localStorage on mount
	useEffect(() => {
		try {
			const stored = localStorage.getItem(STORAGE_KEY)
			if (stored) {
				const parsed = JSON.parse(stored) as LastUsedModel
				setLastUsed(parsed)
			}
		} catch (error) {
			console.error('Failed to load last used model from localStorage:', error)
		}
	}, [])

	// Save to localStorage
	const saveLastUsed = useCallback((provider: string, model: string) => {
		const data: LastUsedModel = { provider, model }
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
			setLastUsed(data)
		} catch (error) {
			console.error('Failed to save last used model to localStorage:', error)
		}
	}, [])

	return {
		lastUsedProvider: lastUsed?.provider,
		lastUsedModel: lastUsed?.model,
		saveLastUsed,
	}
}
