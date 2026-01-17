import { Card, CardContent, CardHeader, CardTitle } from '@folionote/ui/card'
import { ArrowRight01Icon, Rocket01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { getUserTimezoneOffset, REVIEW_RULES } from '@/constants'
import type { ReviewDashboardProps } from '@/types/review'
import { orpc } from '@/utils/orpc'
import { StatsContent } from './stats-content'

/**
 * ReviewDashboard - Main dashboard for review feature
 */
export function ReviewDashboard({ onStartReview }: ReviewDashboardProps) {
	const { t } = useTranslation()
	const tzOffset = getUserTimezoneOffset()

	const {
		data: stats,
		isLoading: isLoadingStats,
		isError: isStatsError,
		error: statsError,
		refetch: refetchStats,
	} = useQuery({
		queryKey: ['review', 'stats', tzOffset],
		queryFn: () => orpc.review.getTodayStats.call({ tzOffset }),
	})

	const { data: dueStats, isLoading: isLoadingDueStats } = useQuery({
		queryKey: ['review', 'dueStats', tzOffset],
		queryFn: () => orpc.review.getDueStats.call({ tzOffset }),
	})

	return (
		<div className="container mx-auto max-w-5xl px-4 py-8">
			<div className="mb-8 flex items-center gap-3">
				<div className="rounded-lg bg-primary/10 p-2">
					<HugeiconsIcon className="size-6 text-primary" icon={Rocket01Icon} />
				</div>
				<div>
					<h1 className="font-bold text-2xl">{t('nav.review')}</h1>
					<p className="text-muted-foreground text-sm">{t('review.description')}</p>
				</div>
			</div>

			<div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<StatsContent
					dueStats={dueStats}
					errorMessage={statsError?.message}
					isError={isStatsError}
					isLoading={isLoadingStats || isLoadingDueStats}
					onRetry={refetchStats}
					stats={stats}
				/>
			</div>

			<h2 className="mb-4 font-semibold text-lg">{t('review.selectMode')}</h2>
			<div className="grid gap-4 sm:grid-cols-2">
				{REVIEW_RULES.map(({ key, labelKey, icon, descriptionKey }) => (
					<Card
						className="cursor-pointer transition-all hover:shadow-md"
						key={key}
						onClick={() => onStartReview(key)}
					>
						<CardHeader className="pb-2">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-2">
									<HugeiconsIcon className="size-5 text-primary" icon={icon} />
									<CardTitle className="text-base">{t(labelKey)}</CardTitle>
								</div>
								<HugeiconsIcon
									className="size-5 text-muted-foreground"
									icon={ArrowRight01Icon}
								/>
							</div>
						</CardHeader>
						<CardContent className="pt-0">
							<p className="text-muted-foreground text-sm">{t(descriptionKey)}</p>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	)
}
