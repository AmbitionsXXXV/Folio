import {
	ArrowRight01Icon,
	CheckmarkCircle02Icon,
	InboxIcon,
	RefreshIcon,
	Rocket01Icon,
	StarIcon,
	ViewIcon,
} from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { orpc } from '@/utils/orpc'

type ReviewRule = 'new' | 'starred' | 'unreviewed' | 'all'

type Entry = {
	id: string
	title: string
	content: string
	isStarred: boolean
	isPinned: boolean
	isInbox: boolean
	createdAt: Date | string
	updatedAt: Date | string
}

const REVIEW_RULES: {
	key: ReviewRule
	labelKey: string
	icon: IconSvgElement
	descriptionKey: string
}[] = [
	{
		key: 'new',
		labelKey: 'review.newEntries',
		icon: InboxIcon,
		descriptionKey: 'review.newEntriesDescription',
	},
	{
		key: 'starred',
		labelKey: 'review.starredEntries',
		icon: StarIcon,
		descriptionKey: 'review.starredEntriesDescription',
	},
	{
		key: 'unreviewed',
		labelKey: 'review.unreviewedEntries',
		icon: ViewIcon,
		descriptionKey: 'review.unreviewedEntriesDescription',
	},
	{
		key: 'all',
		labelKey: 'review.allEntries',
		icon: RefreshIcon,
		descriptionKey: 'review.allEntriesDescription',
	},
]

export const Route = createFileRoute('/_app/review')({
	component: ReviewPage,
})

function ReviewPage() {
	const [selectedRule, setSelectedRule] = useState<ReviewRule>('all')
	const [currentIndex, setCurrentIndex] = useState(0)
	const [isReviewing, setIsReviewing] = useState(false)

	const handleStartReview = (rule: ReviewRule) => {
		setSelectedRule(rule)
		setCurrentIndex(0)
		setIsReviewing(true)
	}

	const handleStopReview = () => {
		setIsReviewing(false)
		setCurrentIndex(0)
	}

	if (isReviewing) {
		return (
			<ReviewSession
				currentIndex={currentIndex}
				onIndexChange={setCurrentIndex}
				onStop={handleStopReview}
				selectedRule={selectedRule}
			/>
		)
	}

	return <ReviewDashboard onStartReview={handleStartReview} />
}

// Review Session Component
type ReviewSessionProps = {
	selectedRule: ReviewRule
	currentIndex: number
	onIndexChange: (index: number | ((prev: number) => number)) => void
	onStop: () => void
}

function ReviewSession({
	selectedRule,
	currentIndex,
	onIndexChange,
	onStop,
}: ReviewSessionProps) {
	const { t } = useTranslation()
	const queryClient = useQueryClient()

	const {
		data: queueData,
		isLoading: isLoadingQueue,
		isError: isQueueError,
		error: queueError,
		refetch: refetchQueue,
	} = useQuery({
		queryKey: ['review', 'queue', selectedRule],
		queryFn: () =>
			orpc.review.getQueue.call({
				rule: selectedRule,
				limit: 20,
			}),
	})

	const markReviewedMutation = useMutation({
		mutationFn: (entryId: string) => orpc.review.markReviewed.call({ entryId }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['review', 'stats'] })
			const queueItems = queueData?.items ?? []
			if (queueItems.length > 0 && currentIndex < queueItems.length - 1) {
				onIndexChange((prev) => prev + 1)
			} else {
				toast.success(t('review.completedSession'))
				onStop()
				refetchQueue()
			}
		},
		onError: () => {
			toast.error(t('review.markFailed'))
		},
	})

	const handleMarkReviewed = () => {
		const currentEntry = queueData?.items[currentIndex]
		if (currentEntry) {
			markReviewedMutation.mutate(currentEntry.id)
		}
	}

	const handleSkip = () => {
		const queueItems = queueData?.items ?? []
		if (queueItems.length > 0 && currentIndex < queueItems.length - 1) {
			onIndexChange((prev) => prev + 1)
		} else {
			toast.info(t('review.queueEnd'))
		}
	}

	const items = queueData?.items ?? []
	const currentEntry = items[currentIndex] as Entry | undefined
	const totalInQueue = items.length
	const reviewedToday = queueData?.reviewedTodayCount ?? 0
	const ruleRule = REVIEW_RULES.find((r) => r.key === selectedRule)
	const ruleLabel = ruleRule ? t(ruleRule.labelKey) : ''

	return (
		<div className="container mx-auto max-w-3xl px-4 py-8">
			<ReviewSessionHeader
				currentIndex={currentIndex}
				onStop={onStop}
				reviewedToday={reviewedToday}
				ruleLabel={ruleLabel}
				totalInQueue={totalInQueue}
			/>

			<ReviewProgressBar currentIndex={currentIndex} totalInQueue={totalInQueue} />

			{isLoadingQueue ? (
				<div className="space-y-4">
					<Skeleton className="h-8 w-2/3" />
					<Skeleton className="h-48 w-full" />
				</div>
			) : null}

			{/* Error state */}
			{isQueueError ? (
				<div className="flex flex-col items-center justify-center py-16 text-center">
					<HugeiconsIcon
						className="mb-4 size-12 text-destructive/50"
						icon={RefreshIcon}
					/>
					<p className="mb-2 font-medium text-destructive">
						{t('review.loadFailed')}
					</p>
					<p className="mb-4 text-muted-foreground text-sm">
						{queueError?.message ?? t('error.unknown')}
					</p>
					<Button onClick={() => refetchQueue()} variant="outline">
						{t('common.retry')}
					</Button>
				</div>
			) : null}

			{!(isLoadingQueue || isQueueError) && totalInQueue === 0 ? (
				<ReviewEmptyState
					onStop={onStop}
					ruleLabel={ruleLabel}
					selectedRule={selectedRule}
				/>
			) : null}

			{!(isLoadingQueue || isQueueError) && currentEntry ? (
				<ReviewCard
					entry={currentEntry}
					isMarkingReviewed={markReviewedMutation.isPending}
					onMarkReviewed={handleMarkReviewed}
					onSkip={handleSkip}
				/>
			) : null}
		</div>
	)
}

// Review Session Header
type ReviewSessionHeaderProps = {
	ruleLabel: string
	currentIndex: number
	totalInQueue: number
	reviewedToday: number
	onStop: () => void
}

function ReviewSessionHeader({
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

// Review Progress Bar
type ReviewProgressBarProps = {
	currentIndex: number
	totalInQueue: number
}

function ReviewProgressBar({ currentIndex, totalInQueue }: ReviewProgressBarProps) {
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

// Review Empty State
type ReviewEmptyStateProps = {
	selectedRule: ReviewRule
	ruleLabel: string
	onStop: () => void
}

function ReviewEmptyState({
	selectedRule,
	ruleLabel,
	onStop,
}: ReviewEmptyStateProps) {
	const { t } = useTranslation()
	const message =
		selectedRule === 'all'
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

// Review Dashboard Component
type ReviewDashboardProps = {
	onStartReview: (rule: ReviewRule) => void
}

function ReviewDashboard({ onStartReview }: ReviewDashboardProps) {
	const { t } = useTranslation()
	const {
		data: stats,
		isLoading: isLoadingStats,
		isError: isStatsError,
		error: statsError,
		refetch: refetchStats,
	} = useQuery({
		queryKey: ['review', 'stats'],
		queryFn: () => orpc.review.getTodayStats.call({}),
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
					errorMessage={statsError?.message}
					isError={isStatsError}
					isLoading={isLoadingStats}
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

type StatsContentProps = {
	isLoading: boolean
	isError: boolean
	errorMessage?: string
	onRetry: () => void
	stats?: {
		reviewedToday: number
		totalEntries: number
		starredEntries: number
		unreviewedEntries: number
	}
}

function StatsContent({
	isLoading,
	isError,
	errorMessage,
	onRetry,
	stats,
}: StatsContentProps) {
	const { t } = useTranslation()
	if (isLoading) {
		return (
			<>
				<Skeleton className="h-24" />
				<Skeleton className="h-24" />
				<Skeleton className="h-24" />
				<Skeleton className="h-24" />
			</>
		)
	}

	if (isError) {
		return (
			<div className="col-span-full flex flex-col items-center justify-center py-8 text-center">
				<p className="mb-2 text-destructive text-sm">
					{errorMessage ?? t('review.statsLoadFailed')}
				</p>
				<Button onClick={onRetry} size="sm" variant="outline">
					{t('common.retry')}
				</Button>
			</div>
		)
	}

	return (
		<>
			<StatsCard
				description="review.statsReviewedToday"
				icon={CheckmarkCircle02Icon}
				iconColor="text-green-500"
				value={stats?.reviewedToday ?? 0}
			/>
			<StatsCard
				description="review.statsTotalEntries"
				icon={RefreshIcon}
				iconColor="text-blue-500"
				value={stats?.totalEntries ?? 0}
			/>
			<StatsCard
				description="review.statsStarredEntries"
				icon={StarIcon}
				iconColor="text-amber-500"
				value={stats?.starredEntries ?? 0}
			/>
			<StatsCard
				description="review.statsUnreviewedEntries"
				icon={ViewIcon}
				iconColor="text-purple-500"
				value={stats?.unreviewedEntries ?? 0}
			/>
		</>
	)
}

type StatsCardProps = {
	value: number
	description: string
	icon: IconSvgElement
	iconColor?: string
}

function StatsCard({ value, description, icon, iconColor }: StatsCardProps) {
	const { t } = useTranslation()
	return (
		<Card>
			<CardContent className="flex items-center gap-4 pt-6">
				<div className="rounded-lg bg-muted p-2">
					<HugeiconsIcon className={cn('size-5', iconColor)} icon={icon} />
				</div>
				<div>
					<p className="font-bold text-2xl">{value}</p>
					<p className="text-muted-foreground text-sm">{t(description)}</p>
				</div>
			</CardContent>
		</Card>
	)
}

type ReviewCardProps = {
	entry: Entry
	onMarkReviewed: () => void
	onSkip: () => void
	isMarkingReviewed: boolean
}

function ReviewCard({
	entry,
	onMarkReviewed,
	onSkip,
	isMarkingReviewed,
}: ReviewCardProps) {
	const { t } = useTranslation()
	const plainContent = entry.content.replace(/<[^>]*>/g, '').trim()

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

				<div className="flex justify-center gap-4 border-t pt-6">
					<Button
						className="min-w-32"
						disabled={isMarkingReviewed}
						onClick={onSkip}
						variant="outline"
					>
						{t('review.skip')}
					</Button>
					<Button
						className="min-w-32"
						disabled={isMarkingReviewed}
						onClick={onMarkReviewed}
					>
						{isMarkingReviewed ? (
							t('review.marking')
						) : (
							<>
								<HugeiconsIcon
									className="mr-2 size-4"
									icon={CheckmarkCircle02Icon}
								/>
								{t('review.markReviewed')}
							</>
						)}
					</Button>
				</div>
			</CardContent>
		</Card>
	)
}
