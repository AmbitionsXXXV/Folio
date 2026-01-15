import { Button } from '@folionote/ui/button'
import { CheckmarkCircle02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useTranslation } from 'react-i18next'
import type { ReviewEmptyStateProps } from '@/types/review'

/**
 * ReviewEmptyState - Empty state component when review queue is empty
 */
export function ReviewEmptyState({
	selectedRule,
	ruleLabel,
	onStop,
}: ReviewEmptyStateProps) {
	const { t } = useTranslation()
	const message =
		selectedRule === 'all' || selectedRule === 'due'
			? t('review.allCompleted')
			: t('review.noMatchingEntries', { rule: ruleLabel })

	return (
		<div className="flex flex-col items-center justify-center py-16 text-center">
			<HugeiconsIcon
				className="mb-4 size-12 text-green-500"
				icon={CheckmarkCircle02Icon}
			/>
			<p className="mb-2 font-medium text-lg">{t('review.greatJob')}</p>
			<p className="mb-4 text-muted-foreground">{message}</p>
			<Button onClick={onStop} variant="outline">
				{t('common.back')}
			</Button>
		</div>
	)
}
