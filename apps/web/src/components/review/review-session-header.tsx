import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
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
					{currentIndex + 1} / {totalInQueue} ·{' '}
					{t('review.reviewedTodayCount', { count: reviewedToday })}
				</p>
			</div>
			<Button onClick={onStop} variant="outline">
				{t('review.endReview')}
			</Button>
		</div>
	)
}
