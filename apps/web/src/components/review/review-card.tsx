import { Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { ReviewCardProps } from '@/types/review'
import { RatingButtons } from './rating-buttons'
import { SnoozeDropdown } from './snooze-dropdown'

/**
 * ReviewCard - Card component for displaying entry during review
 */
export function ReviewCard({
	entry,
	onRate,
	onSkip,
	onSnooze,
	isLoading,
}: ReviewCardProps) {
	const { t } = useTranslation()
	const plainContent = entry.contentText ?? ''

	return (
		<Card className="overflow-hidden">
			<CardHeader className="border-b bg-muted/30">
				<div className="flex items-start justify-between gap-2">
					<div>
						<CardTitle className="text-xl">
							{entry.title || t('entry.untitled')}
						</CardTitle>
						<p className="mt-1 text-muted-foreground text-sm">
							{entry.isInbox ? t('entry.inbox') : t('entry.library')}
							{entry.isStarred ? ` · ⭐ ${t('entry.starred')}` : ''}
						</p>
					</div>
					<Link params={{ id: entry.id }} to="/entries/$id">
						<Button size="sm" variant="outline">
							{t('review.viewDetails')}
						</Button>
					</Link>
				</div>
			</CardHeader>
			<CardContent className="pt-6">
				<div className="mb-6 max-h-64 overflow-y-auto">
					<p className="whitespace-pre-wrap text-foreground leading-relaxed">
						{plainContent || t('entry.empty')}
					</p>
				</div>

				<div className="border-t pt-6">
					<RatingButtons isLoading={isLoading} onRate={onRate} />
					<div className="mt-4 flex items-center justify-center gap-2">
						<Button
							className="text-muted-foreground"
							disabled={isLoading}
							onClick={onSkip}
							size="sm"
							variant="ghost"
						>
							{t('review.skip')}
						</Button>
						<SnoozeDropdown disabled={isLoading} onSnooze={onSnooze} />
					</div>
				</div>
			</CardContent>
		</Card>
	)
}
