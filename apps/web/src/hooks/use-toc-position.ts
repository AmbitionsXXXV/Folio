import { useCallback, useEffect, useState } from 'react'

/**
 * TOC position options
 */
export type TocPosition = 'left' | 'right'

const STORAGE_KEY = 'folio-toc-position'
const DEFAULT_POSITION: TocPosition = 'right'

/**
 * Hook to manage TOC sidebar position with localStorage persistence.
 * Handles SSR compatibility and syncs across browser tabs.
 *
 * @returns Tuple of [position, setPosition]
 */
export function useTocPosition(): [TocPosition, (next: TocPosition) => void] {
	// Start with undefined to avoid hydration mismatch, then set actual value in useEffect
	const [position, setPositionState] = useState<TocPosition>(DEFAULT_POSITION)
	const [mounted, setMounted] = useState(false)

	// Initialize from localStorage after mount
	useEffect(() => {
		setMounted(true)
		try {
			const stored = localStorage.getItem(STORAGE_KEY)
			if (stored === 'left' || stored === 'right') {
				setPositionState(stored)
			}
		} catch {
			// localStorage not available (SSR or private mode)
		}
	}, [])

	// Listen for storage changes from other tabs
	useEffect(() => {
		const handleStorageChange = (event: StorageEvent) => {
			if (event.key === STORAGE_KEY) {
				const newValue = event.newValue
				if (newValue === 'left' || newValue === 'right') {
					setPositionState(newValue)
				} else {
					setPositionState(DEFAULT_POSITION)
				}
			}
		}

		window.addEventListener('storage', handleStorageChange)
		return () => window.removeEventListener('storage', handleStorageChange)
	}, [])

	const setPosition = useCallback((next: TocPosition) => {
		setPositionState(next)
		try {
			localStorage.setItem(STORAGE_KEY, next)
		} catch {
			// localStorage not available
		}
	}, [])

	// Return default position during SSR/before mount to avoid hydration issues
	return [mounted ? position : DEFAULT_POSITION, setPosition]
}
