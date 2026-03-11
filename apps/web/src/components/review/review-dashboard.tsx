import { Card, CardContent, CardHeader, CardTitle } from '@folionote/ui/card'
import { ArrowRight01Icon, Rocket01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'motion/react'
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
		<div className="container relative mx-auto max-w-5xl px-4 py-8">
			<div
				aria-hidden="true"
				className="pointer-events-none absolute top-0 right-0 hidden size-80 translate-x-1/3 -translate-y-1/4 rounded-full bg-linear-to-br from-primary/6 via-purple-500/4 to-transparent blur-3xl sm:block"
			/>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute bottom-0 left-0 hidden size-64 -translate-x-1/4 translate-y-1/4 rounded-full bg-linear-to-tr from-blue-500/4 via-cyan-500/3 to-transparent blur-3xl sm:block"
			/>

			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="mb-10 flex items-center gap-4"
				initial={{ opacity: 0, y: 12 }}
				transition={{ duration: 0.4, ease: 'easeOut' }}
			>
				<div className="flex size-12 items-center justify-center rounded-2xl bg-linear-to-br from-primary/20 to-purple-500/15 shadow-sm">
					<HugeiconsIcon className="size-6 text-primary" icon={Rocket01Icon} />
				</div>
				<div>
					<h1 className="font-bold text-2xl tracking-tight">{t('nav.review')}</h1>
					<p className="text-muted-foreground text-sm">{t('review.description')}</p>
				</div>
			</motion.div>

			<motion.div
				animate={{ opacity: 1, y: 0 }}
				className="mb-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
				initial={{ opacity: 0, y: 12 }}
				transition={{ delay: 0.1, duration: 0.4, ease: 'easeOut' }}
			>
				<StatsContent
					dueStats={dueStats}
					errorMessage={statsError?.message}
					isError={isStatsError}
					isLoading={isLoadingStats || isLoadingDueStats}
					onRetry={refetchStats}
					stats={stats}
				/>
			</motion.div>

			<motion.div
				animate={{ opacity: 1, y: 0 }}
				initial={{ opacity: 0, y: 12 }}
				transition={{ delay: 0.2, duration: 0.4, ease: 'easeOut' }}
			>
				<h2 className="mb-4 font-semibold text-lg">{t('review.selectMode')}</h2>
				<div className="grid gap-4 sm:grid-cols-2">
					{REVIEW_RULES.map(({ key, labelKey, icon, descriptionKey }, index) => (
						<motion.div
							animate={{ opacity: 1, y: 0 }}
							initial={{ opacity: 0, y: 8 }}
							key={key}
							transition={{
								delay: 0.25 + index * 0.06,
								duration: 0.35,
								ease: 'easeOut',
							}}
						>
							<Card
								aria-label={t(labelKey)}
								className="group cursor-pointer border-border/40 bg-card/60 backdrop-blur-sm transition-all duration-200 hover:scale-[1.01] hover:border-primary/20 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
								onClick={() => onStartReview(key)}
								onKeyDown={(e) => {
									if (e.key === 'Enter' || e.key === ' ') {
										e.preventDefault()
										onStartReview(key)
									}
								}}
								role="button"
								tabIndex={0}
							>
								<CardHeader className="pb-2">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-3">
											<div className="flex size-9 items-center justify-center rounded-lg bg-linear-to-br from-primary/15 to-purple-500/10">
												<HugeiconsIcon className="size-5 text-primary" icon={icon} />
											</div>
											<CardTitle className="text-base">{t(labelKey)}</CardTitle>
										</div>
										<HugeiconsIcon
											aria-hidden="true"
											className="size-5 text-muted-foreground transition-transform duration-200 group-hover:translate-x-0.5"
											icon={ArrowRight01Icon}
										/>
									</div>
								</CardHeader>
								<CardContent className="pt-0">
									<p className="text-muted-foreground text-sm">
										{t(descriptionKey)}
									</p>
								</CardContent>
							</Card>
						</motion.div>
					))}
				</div>
			</motion.div>
		</div>
	)
}
