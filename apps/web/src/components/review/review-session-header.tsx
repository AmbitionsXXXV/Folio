import { Button } from '@folionote/ui/button'
import { useTranslation } from 'react-i18next'
import type { ReviewSessionHeaderProps } from '@/types/review'

/**
 * ReviewSessionHeader - Header component for review session
 * Shows the current rule label, progress count, and end review button
 */
export function ReviewSessionHeader({
	ruleLabel,
	currentIndex,
	totalInQueue,
	reviewedToday,
	onStop,
}: ReviewSessionHeaderProps) {
	const { t } = useTranslation()

	return (
		<div className="mb-6 flex items-center justify-between">
			<div>
				<h2 className="font-semibold text-lg">
					{ruleLabel} {t('review.reviewSession')}
				</h2>
				<p className="text-muted-foreground text-sm">
					<span className="tabular-nums">
						{currentIndex + 1} / {totalInQueue}
					</span>{' '}
					· {t('review.reviewedTodayCount', { count: reviewedToday })}
				</p>
			</div>
			<Button
				aria-label={t('review.endReviewLabel')}
				onClick={onStop}
				variant="outline"
			>
				{t('review.endReview')}
			</Button>
		</div>
	)
}
