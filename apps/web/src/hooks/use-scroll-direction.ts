import { useCallback, useEffect, useRef, useState } from 'react'

type ScrollDirection = 'up' | 'down' | null

type UseScrollDirectionOptions = {
	/** Threshold in pixels before direction change is detected */
	threshold?: number
	/** Initial direction */
	initialDirection?: ScrollDirection
}

/**
 * Hook to detect scroll direction
 * Returns 'up' when scrolling up, 'down' when scrolling down
 */
export function useScrollDirection(options: UseScrollDirectionOptions = {}) {
	const { threshold = 10, initialDirection = null } = options

	const [scrollDirection, setScrollDirection] =
		useState<ScrollDirection>(initialDirection)
	const [isAtTop, setIsAtTop] = useState(true)

	const lastScrollY = useRef(0)
	const ticking = useRef(false)

	const updateScrollDirection = useCallback(() => {
		const scrollY = window.scrollY

		// Check if at top
		setIsAtTop(scrollY < threshold)

		// Determine direction only if we've scrolled past threshold
		const diff = scrollY - lastScrollY.current

		if (Math.abs(diff) >= threshold) {
			const newDirection = diff > 0 ? 'down' : 'up'
			setScrollDirection(newDirection)
			lastScrollY.current = scrollY
		}

		ticking.current = false
	}, [threshold])

	const handleScroll = useCallback(() => {
		if (!ticking.current) {
			window.requestAnimationFrame(updateScrollDirection)
			ticking.current = true
		}
	}, [updateScrollDirection])

	useEffect(() => {
		lastScrollY.current = window.scrollY
		setIsAtTop(window.scrollY < threshold)

		window.addEventListener('scroll', handleScroll, { passive: true })

		return () => {
			window.removeEventListener('scroll', handleScroll)
		}
	}, [handleScroll, threshold])

	return { scrollDirection, isAtTop }
}
