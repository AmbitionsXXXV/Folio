import type { ReviewProgressBarProps } from '@/types/review'

/**
 * ReviewProgressBar - Progress bar showing review session progress
 */
export function ReviewProgressBar({
	currentIndex,
	totalInQueue,
}: ReviewProgressBarProps) {
	const progress = totalInQueue > 0 ? ((currentIndex + 1) / totalInQueue) * 100 : 0

	return (
		<div className="mb-8 h-2 overflow-hidden rounded-full bg-muted">
			<div
				className="h-full bg-primary transition-all"
				style={{ width: `${progress}%` }}
			/>
		</div>
	)
}
