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
import { getGreetingKey } from '@/lib/utils'
import { orpc } from '@/utils/orpc'

export const Route = createFileRoute('/_app/activity')({
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
				<Skeleton className="h-32" />
				<Skeleton className="h-32" />
				<Skeleton className="h-32" />
				<Skeleton className="h-32" />
			</div>
		)
	}

	if (entries.length === 0) {
		return (
			<Card>
				<CardContent className="flex flex-col items-center justify-center py-12 text-center">
					<p className="mb-2 text-muted-foreground">
						{t('activity.noRecentEntries')}
					</p>
					<p className="text-muted-foreground text-sm">
						{t('activity.startCapturing')}
					</p>
				</CardContent>
			</Card>
		)
	}

	return (
		<div className="grid gap-4 sm:grid-cols-2">
			{entries.map((entry) => (
				<EntryCard
					contentText={entry.contentText}
					id={entry.id}
					isPinned={entry.isPinned ?? false}
					isStarred={entry.isStarred ?? false}
					key={entry.id}
					title={entry.title ?? ''}
					updatedAt={entry.updatedAt}
				/>
			))}
		</div>
	)
}

function ActivityPage() {
	const { t, i18n } = useTranslation()
	const { session } = Route.useRouteContext()
	const tzOffset = getUserTimezoneOffset()

	// Fetch recent entries
	const { data: recentData, isLoading: isLoadingRecent } = useQuery({
		queryKey: ['entries', 'recent', 4],
		queryFn: () =>
			orpc.entries.list.call({
				filter: 'all',
				limit: 4,
			}),
	})

	// Fetch today stats for total entries count
	const { data: todayStats, isLoading: isLoadingStats } = useQuery({
		queryKey: ['review', 'stats', tzOffset],
		queryFn: () => orpc.review.getTodayStats.call({ tzOffset }),
	})

	// Fetch due stats for review count
	const { data: dueStats, isLoading: isLoadingDue } = useQuery({
		queryKey: ['review', 'dueStats', tzOffset],
		queryFn: () => orpc.review.getDueStats.call({ tzOffset }),
	})

	// Fetch inbox count
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

	return (
		<div className="container mx-auto max-w-5xl px-4 py-8">
			{/* Header */}
			<div className="mb-8">
				<h1 className="mb-1 font-bold text-2xl">
					{t(`activity.${greetingKey}`, { name: session.user.name })}
				</h1>
				<p className="text-muted-foreground">
					{formatDate(new Date(), {
						locale: i18n.language,
						options: { weekday: 'long', month: 'long', day: 'numeric' },
					})}
				</p>
				{totalDue > 0 && (
					<Link
						className="mt-2 inline-flex items-center gap-1 text-primary text-sm hover:underline"
						to="/review"
					>
						{t('activity.reviewReminder', { count: totalDue })}
						<HugeiconsIcon className="size-4" icon={ArrowRight01Icon} />
					</Link>
				)}
			</div>

			{/* Quick Capture */}
			<section className="mb-8">
				<h2 className="mb-3 font-semibold text-lg">{t('activity.quickCapture')}</h2>
				<QuickCapture placeholder={t('activity.quickCapturePlaceholder')} />
			</section>

			{/* Recent Entries */}
			<section className="mb-8">
				<div className="mb-3 flex items-center justify-between">
					<h2 className="font-semibold text-lg">{t('activity.recentEntries')}</h2>
					<Link
						className="flex items-center gap-1 text-muted-foreground text-sm hover:text-foreground"
						to="/library"
					>
						{t('activity.viewAll')}
						<HugeiconsIcon className="size-4" icon={ArrowRight01Icon} />
					</Link>
				</div>

				<RecentEntriesContent
					entries={recentEntries}
					isLoading={isLoadingRecent}
					t={t}
				/>
			</section>

			{/* Quick Access */}
			<section>
				<h2 className="mb-3 font-semibold text-lg">{t('activity.quickAccess')}</h2>
				<div className="grid gap-4 sm:grid-cols-3">
					{/* Inbox */}
					<Link to="/inbox">
						<Card className="cursor-pointer transition-all hover:shadow-md">
							<CardContent className="flex items-center gap-4">
								<div className="rounded-lg bg-blue-500/10 p-3">
									<HugeiconsIcon className="size-6 text-blue-500" icon={InboxIcon} />
								</div>
								<div>
									<p className="font-medium">{t('nav.inbox')}</p>
									<p className="text-muted-foreground text-sm">
										{isLoadingInbox ? (
											<Skeleton className="h-4 w-16" />
										) : (
											<>
												{t('activity.inboxCount', { count: inboxData?.count ?? 0 })}
												{inboxData?.hasMore && '+'}
											</>
										)}
									</p>
								</div>
							</CardContent>
						</Card>
					</Link>

					{/* Library */}
					<Link to="/library">
						<Card className="cursor-pointer transition-all hover:shadow-md">
							<CardContent className="flex items-center gap-4">
								<div className="rounded-lg bg-green-500/10 p-3">
									<HugeiconsIcon
										className="size-6 text-green-500"
										icon={BookOpen01Icon}
									/>
								</div>
								<div>
									<p className="font-medium">{t('nav.library')}</p>
									<p className="text-muted-foreground text-sm">
										{isLoadingStats ? (
											<Skeleton className="h-4 w-16" />
										) : (
											t('activity.libraryCount', {
												count: todayStats?.totalEntries ?? 0,
											})
										)}
									</p>
								</div>
							</CardContent>
						</Card>
					</Link>

					{/* Review */}
					<Link to="/review">
						<Card className="cursor-pointer transition-all hover:shadow-md">
							<CardContent className="flex items-center gap-4">
								<div className="rounded-lg bg-orange-500/10 p-3">
									<HugeiconsIcon
										className="size-6 text-orange-500"
										icon={Rocket01Icon}
									/>
								</div>
								<div>
									<p className="font-medium">{t('nav.review')}</p>
									<p className="text-muted-foreground text-sm">
										{isLoadingDue ? (
											<Skeleton className="h-4 w-16" />
										) : (
											t('activity.dueCount', { count: totalDue })
										)}
									</p>
								</div>
							</CardContent>
						</Card>
					</Link>
				</div>
			</section>
		</div>
	)
}
