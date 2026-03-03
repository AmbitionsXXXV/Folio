import { formatDate } from '@folionote/locales'
import { Card, CardContent } from '@folionote/ui/card'
import { Skeleton } from '@folionote/ui/skeleton'
import {
	ArrowRight01Icon,
	BookOpen01Icon,
	InboxIcon,
	Rocket01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { EntryCard } from '@/components/entry-card'
import { QuickCapture } from '@/components/quick-capture'
import { getUserTimezoneOffset } from '@/constants'
import { cn, getGreetingKey } from '@/lib/utils'
import { orpc } from '@/utils/orpc'

export const Route = createFileRoute('/_app/activity')({
	loader: ({ context: { queryClient } }) => {
		const tzOffset = getUserTimezoneOffset()
		queryClient.ensureQueryData({
			queryKey: ['entries', 'recent', 4],
			queryFn: () => orpc.entries.list.call({ filter: 'all', limit: 4 }),
		})
		queryClient.ensureQueryData({
			queryKey: ['review', 'stats', tzOffset],
			queryFn: () => orpc.review.getTodayStats.call({ tzOffset }),
		})
		queryClient.ensureQueryData({
			queryKey: ['review', 'dueStats', tzOffset],
			queryFn: () => orpc.review.getDueStats.call({ tzOffset }),
		})
		queryClient.ensureQueryData({
			queryKey: ['entries', 'inbox', 'count'],
			queryFn: () => orpc.entries.list.call({ filter: 'inbox', limit: 1 }),
		})
	},
	component: ActivityPage,
})

type RecentEntriesEntry = {
	id: string
	title: string | null
	contentText: string | null
	isStarred: boolean | null
	isPinned: boolean | null
	updatedAt: Date
}

type RecentEntriesContentProps = {
	entries: RecentEntriesEntry[]
	isLoading: boolean
	t: (key: string) => string
}

function RecentEntriesContent({ entries, isLoading, t }: RecentEntriesContentProps) {
	if (isLoading) {
		return (
			<div className="grid gap-4 sm:grid-cols-2">
				{Array.from({ length: 4 }).map((_, i) => (
					<Skeleton
						className={cn(
							'h-36 rounded-2xl',
							`animate-fade-in delay-${(i + 1) * 100}`
						)}
						key={`skeleton-${String(i)}`}
					/>
				))}
			</div>
		)
	}

	if (entries.length === 0) {
		return (
			<div className="flex animate-fade-in flex-col items-center justify-center rounded-2xl border border-border/60 border-dashed py-16 text-center">
				<div className="mb-4 rounded-full bg-primary/5 p-4">
					<HugeiconsIcon className="size-8 text-primary/40" icon={BookOpen01Icon} />
				</div>
				<p className="mb-1 font-display text-foreground/70 text-lg">
					{t('activity.noRecentEntries')}
				</p>
				<p className="text-muted-foreground text-sm">
					{t('activity.startCapturing')}
				</p>
			</div>
		)
	}

	return (
		<div className="grid gap-4 sm:grid-cols-2">
			{entries.map((entry, i) => (
				<div
					className={cn('animate-fade-in', i > 0 && `delay-${i * 100}`)}
					key={entry.id}
				>
					<EntryCard
						contentText={entry.contentText}
						id={entry.id}
						isPinned={entry.isPinned ?? false}
						isStarred={entry.isStarred ?? false}
						title={entry.title ?? ''}
						updatedAt={entry.updatedAt}
					/>
				</div>
			))}
		</div>
	)
}

const QUICK_ACCESS_ITEMS = [
	{
		to: '/inbox' as const,
		labelKey: 'nav.inbox',
		icon: InboxIcon,
		accentClass:
			'from-blue-500/8 to-blue-500/3 dark:from-blue-400/10 dark:to-blue-400/3',
		iconClass: 'text-blue-600 dark:text-blue-400',
		dotClass: 'bg-blue-500',
	},
	{
		to: '/library' as const,
		labelKey: 'nav.library',
		icon: BookOpen01Icon,
		accentClass:
			'from-emerald-500/8 to-emerald-500/3 dark:from-emerald-400/10 dark:to-emerald-400/3',
		iconClass: 'text-emerald-600 dark:text-emerald-400',
		dotClass: 'bg-emerald-500',
	},
	{
		to: '/review' as const,
		labelKey: 'nav.review',
		icon: Rocket01Icon,
		accentClass:
			'from-amber-500/8 to-amber-500/3 dark:from-amber-400/10 dark:to-amber-400/3',
		iconClass: 'text-amber-600 dark:text-amber-400',
		dotClass: 'bg-amber-500',
	},
] as const

function ActivityPage() {
	const { t, i18n } = useTranslation()
	const { session } = Route.useRouteContext()
	const tzOffset = getUserTimezoneOffset()

	const { data: recentData, isLoading: isLoadingRecent } = useQuery({
		queryKey: ['entries', 'recent', 4],
		queryFn: () =>
			orpc.entries.list.call({
				filter: 'all',
				limit: 4,
			}),
	})

	const { data: todayStats, isLoading: isLoadingStats } = useQuery({
		queryKey: ['review', 'stats', tzOffset],
		queryFn: () => orpc.review.getTodayStats.call({ tzOffset }),
	})

	const { data: dueStats, isLoading: isLoadingDue } = useQuery({
		queryKey: ['review', 'dueStats', tzOffset],
		queryFn: () => orpc.review.getDueStats.call({ tzOffset }),
	})

	const { data: inboxData, isLoading: isLoadingInbox } = useQuery({
		queryKey: ['entries', 'inbox', 'count'],
		queryFn: () =>
			orpc.entries.list.call({
				filter: 'inbox',
				limit: 1,
			}),
		select: (data) => ({
			count: data.items.length,
			hasMore: data.hasMore,
		}),
	})

	const recentEntries = recentData?.items?.filter((e) => !e.isInbox) ?? []
	const totalDue = (dueStats?.overdue ?? 0) + (dueStats?.dueToday ?? 0)
	const greetingKey = getGreetingKey()

	const statValues = [
		{
			value: inboxData?.count ?? 0,
			hasMore: inboxData?.hasMore,
			loading: isLoadingInbox,
		},
		{ value: todayStats?.totalEntries ?? 0, loading: isLoadingStats },
		{ value: totalDue, loading: isLoadingDue },
	]

	return (
		<div className="container mx-auto max-w-5xl px-4 py-10 md:py-14">
			{/* Hero greeting */}
			<header className="mb-12 animate-fade-in md:mb-16">
				<p className="mb-2 font-medium text-primary text-sm uppercase tracking-wide">
					{formatDate(new Date(), {
						locale: i18n.language,
						options: { weekday: 'long', month: 'long', day: 'numeric' },
					})}
				</p>
				<h1 className="font-display font-semibold text-3xl text-foreground tracking-tight md:text-4xl">
					{t(`activity.${greetingKey}`, { name: session.user.name })}
				</h1>

				{totalDue > 0 && (
					<Link
						className="group mt-4 inline-flex items-center gap-2 rounded-full bg-primary/8 px-4 py-2 text-primary text-sm transition-colors hover:bg-primary/12 dark:bg-primary/12 dark:hover:bg-primary/18"
						to="/review"
					>
						<span className="relative flex size-2">
							<span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
							<span className="relative inline-flex size-2 rounded-full bg-primary" />
						</span>
						{t('activity.reviewReminder', { count: totalDue })}
						<HugeiconsIcon
							className="size-4 transition-transform group-hover:translate-x-0.5"
							icon={ArrowRight01Icon}
						/>
					</Link>
				)}
			</header>

			{/* Quick Capture */}
			<section className="mb-12 animate-fade-in delay-100">
				<div className="mb-4 flex items-center gap-2">
					<div className="h-px flex-1 bg-border/60" />
					<h2 className="font-display font-medium text-muted-foreground text-sm uppercase tracking-wide">
						{t('activity.quickCapture')}
					</h2>
					<div className="h-px flex-1 bg-border/60" />
				</div>
				<QuickCapture placeholder={t('activity.quickCapturePlaceholder')} />
			</section>

			{/* Quick Access */}
			<section className="mb-12 animate-fade-in delay-200">
				<div className="grid gap-4 sm:grid-cols-3">
					{QUICK_ACCESS_ITEMS.map((item, i) => {
						const stat = statValues[i]
						return (
							<Link key={item.to} to={item.to}>
								<Card className="group relative overflow-hidden border-border/50 transition-all duration-300 hover:border-border hover:shadow-md">
									<div
										className={cn(
											'absolute inset-0 bg-linear-to-br opacity-0 transition-opacity duration-300 group-hover:opacity-100',
											item.accentClass
										)}
									/>
									<CardContent className="relative flex items-center gap-4 py-5">
										<div className="flex size-11 items-center justify-center rounded-xl bg-background shadow-sm ring-1 ring-border/50">
											<HugeiconsIcon
												className={cn('size-5', item.iconClass)}
												icon={item.icon}
											/>
										</div>
										<div className="min-w-0 flex-1">
											<p className="font-medium text-foreground">
												{t(item.labelKey)}
											</p>
											<p className="text-muted-foreground text-sm tabular-nums">
												{stat?.loading ? (
													<Skeleton className="h-4 w-12" />
												) : (
													<>
														{stat?.value ?? 0}
														{stat && 'hasMore' in stat && stat.hasMore ? '+' : ''}
													</>
												)}
											</p>
										</div>
										<HugeiconsIcon
											className="size-4 text-muted-foreground/40 transition-all group-hover:translate-x-0.5 group-hover:text-muted-foreground"
											icon={ArrowRight01Icon}
										/>
									</CardContent>
								</Card>
							</Link>
						)
					})}
				</div>
			</section>

			{/* Recent Entries */}
			<section className="animate-fade-in delay-300">
				<div className="mb-5 flex items-center justify-between">
					<h2 className="font-display font-semibold text-foreground text-xl tracking-tight">
						{t('activity.recentEntries')}
					</h2>
					<Link
						className="group flex items-center gap-1 text-muted-foreground text-sm transition-colors hover:text-foreground"
						to="/library"
					>
						{t('activity.viewAll')}
						<HugeiconsIcon
							className="size-3.5 transition-transform group-hover:translate-x-0.5"
							icon={ArrowRight01Icon}
						/>
					</Link>
				</div>

				<RecentEntriesContent
					entries={recentEntries}
					isLoading={isLoadingRecent}
					t={t}
				/>
			</section>
		</div>
	)
}
