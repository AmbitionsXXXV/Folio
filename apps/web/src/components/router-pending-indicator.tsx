import { useRouterState } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'

/**
 * A global route transition indicator that shows a thin progress bar at the top
 * of the viewport when a route is loading/pending.
 *
 * Uses TanStack Router's `isTransitioning` state to detect pending navigations.
 * Provides immediate visual feedback without blocking the UI.
 */
export function RouterPendingIndicator() {
	const isTransitioning = useRouterState({
		select: (state) => state.isTransitioning,
	})

	return (
		<AnimatePresence>
			{isTransitioning && (
				<motion.div
					animate={{ opacity: 1 }}
					className="fixed inset-x-0 top-0 z-9999 h-0.5 overflow-hidden"
					exit={{ opacity: 0 }}
					initial={{ opacity: 0 }}
					transition={{ duration: 0.1 }}
				>
					{/* Background track */}
					<div className="absolute inset-0 bg-primary/20" />
					{/* Animated progress bar */}
					<motion.div
						animate={{
							x: ['0%', '100%'],
						}}
						className="absolute inset-y-0 left-0 w-1/3 bg-primary"
						style={{
							backgroundImage:
								'linear-gradient(90deg, transparent, currentColor, transparent)',
						}}
						transition={{
							duration: 1,
							repeat: Number.POSITIVE_INFINITY,
							ease: 'linear',
						}}
					/>
				</motion.div>
			)}
		</AnimatePresence>
	)
}
