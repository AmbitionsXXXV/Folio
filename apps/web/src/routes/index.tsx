import { Avatar, AvatarFallback, AvatarImage } from '@folionote/ui/avatar'
import { Badge } from '@folionote/ui/badge'
import { Button } from '@folionote/ui/button'
import {
	AiChat02Icon,
	BookOpen01Icon,
	Calendar03Icon,
	FireIcon,
	InboxIcon,
	LibraryIcon,
	MagicWand01Icon,
	PencilEdit02Icon,
	Search01Icon,
	Settings02Icon,
	Tag01Icon,
	UserCircle02Icon,
	UserCircleIcon,
} from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react'
import { HugeiconsIcon } from '@hugeicons/react'
import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link, redirect } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { getUser } from '@/functions/get-user'
import { cn, getSimpleGreetingKey } from '@/lib/utils'
import { orpc } from '@/utils/orpc'

/**
 * Get initials from a name string
 */
function getInitials(name?: string | null): string {
	if (!name) return ''
	return name
		.split(' ')
		.map((part) => part[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)
}

/**
 * Get inbox badge text
 */
function getInboxBadgeText(count: number, hasMore: boolean): string {
	return hasMore ? `${count}+` : `${count}`
}

/**
 * Quick action item type
 */
interface QuickActionItem {
	badge?: string
	badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
	color: string
	description: string
	href: string
	icon: IconSvgElement
	label: string
}

/**
 * Get system status text
 */
function getSystemStatus(
	isLoading: boolean,
	isOnline: boolean,
	t: (key: string) => string
): string {
	if (isLoading) return t('home.connecting')
	return isOnline ? t('home.systemReady') : t('home.offline')
}

/**
 * Action card component
 */
function ActionCard({
	action,
	index,
	baseDelay = 2,
}: {
	action: QuickActionItem
	index: number
	baseDelay?: number
}) {
	return (
		<Link
			className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 transition-all hover:border-primary/30 hover:shadow-lg"
			key={action.href}
			style={{ animationDelay: `${(index + baseDelay) * 100}ms` }}
			to={action.href}
		>
			<div
				className={cn(
					'absolute inset-0 bg-linear-to-br',
					action.color,
					'opacity-0 transition-opacity group-hover:opacity-100'
				)}
			/>
			<div className="relative">
				<div className="mb-3 flex items-center justify-between">
					<div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 transition-transform group-hover:scale-110">
						<HugeiconsIcon className="size-6 text-primary" icon={action.icon} />
					</div>
					{action.badge && (
						<Badge className="text-xs" variant={action.badgeVariant}>
							{action.badge}
						</Badge>
					)}
				</div>
				<h3 className="mb-1 font-semibold">{action.label}</h3>
				<p className="text-muted-foreground text-sm">{action.description}</p>
			</div>
		</Link>
	)
}

/**
 * Stats card component
 */
function StatsCard({
	href,
	icon,
	iconColor,
	value,
	label,
	badge,
	badgeVariant = 'secondary',
}: {
	href: string
	icon: IconSvgElement
	iconColor: string
	value: string | number
	label: string
	badge?: string
	badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline'
}) {
	return (
		<Link
			className="group rounded-xl border border-border/50 bg-card/50 p-4 transition-all hover:border-primary/30 hover:shadow-md"
			to={href}
		>
			<div className="mb-2 flex items-center justify-between">
				<div
					className={cn(
						'flex size-10 items-center justify-center rounded-lg',
						iconColor
					)}
				>
					<HugeiconsIcon className="size-5" icon={icon} />
				</div>
				{badge && (
					<Badge className="text-xs" variant={badgeVariant}>
						{badge}
					</Badge>
				)}
			</div>
			<p className="font-bold text-2xl tabular-nums">{value}</p>
			<p className="text-muted-foreground text-sm">{label}</p>
		</Link>
	)
}

export const Route = createFileRoute('/')({
	component: HomeComponent,
	beforeLoad: async ({ location }) => {
		const session = await getUser()
		if (!session) {
			throw redirect({
				to: '/login',
				search: { redirect: location.href },
			})
		}
		return { session }
	},
})

function HomeComponent() {
	const { t } = useTranslation()
	const { session } = Route.useRouteContext()
	const healthCheck = useQuery(orpc.healthCheck.queryOptions())
	const greetingKey = getSimpleGreetingKey()

	// Get user timezone offset in minutes
	const tzOffset = new Date().getTimezoneOffset() * -1

	// Fetch stats data
	const inboxQuery = useQuery(
		orpc.entries.list.queryOptions({ input: { filter: 'inbox', limit: 1 } })
	)
	const reviewStatsQuery = useQuery(
		orpc.review.getTodayStats.queryOptions({ input: { tzOffset } })
	)
	const dueStatsQuery = useQuery(
		orpc.review.getDueStats.queryOptions({ input: { tzOffset } })
	)

	const inboxCount = inboxQuery.data?.items?.length ?? 0
	const hasMoreInbox = inboxQuery.data?.hasMore ?? false
	const reviewedToday = reviewStatsQuery.data?.reviewedToday ?? 0
	const streak = reviewStatsQuery.data?.streak ?? 0
	const dueCount =
		(dueStatsQuery.data?.overdue ?? 0) + (dueStatsQuery.data?.dueToday ?? 0)
	const overdueCount = dueStatsQuery.data?.overdue ?? 0

	const quickActions: QuickActionItem[] = [
		{
			icon: PencilEdit02Icon,
			label: t('entry.newEntry'),
			description: t('home.actionDescription.newEntry'),
			href: '/entries/new',
			color:
				'from-violet-500/10 to-purple-500/10 hover:from-violet-500/20 hover:to-purple-500/20',
		},
		{
			icon: InboxIcon,
			label: t('entry.inbox'),
			description: t('home.actionDescription.inbox'),
			href: '/inbox',
			color:
				'from-blue-500/10 to-indigo-500/10 hover:from-blue-500/20 hover:to-indigo-500/20',
			badge:
				inboxCount > 0 ? getInboxBadgeText(inboxCount, hasMoreInbox) : undefined,
			badgeVariant: 'secondary',
		},
		{
			icon: LibraryIcon,
			label: t('entry.library'),
			description: t('home.actionDescription.library'),
			href: '/library',
			color:
				'from-purple-500/10 to-pink-500/10 hover:from-purple-500/20 hover:to-pink-500/20',
		},
		{
			icon: Search01Icon,
			label: t('common.search'),
			description: t('home.actionDescription.search'),
			href: '/search',
			color:
				'from-fuchsia-500/10 to-violet-500/10 hover:from-fuchsia-500/20 hover:to-violet-500/20',
		},
	]

	const moreFeatures: QuickActionItem[] = [
		{
			icon: Calendar03Icon,
			label: t('review.today'),
			description: t('review.description'),
			href: '/review',
			color:
				'from-amber-500/10 to-orange-500/10 hover:from-amber-500/20 hover:to-orange-500/20',
			badge: dueCount > 0 ? `${dueCount}` : undefined,
			badgeVariant: overdueCount > 0 ? 'destructive' : 'default',
		},
		{
			icon: AiChat02Icon,
			label: t('knowledge.title'),
			description: t('knowledge.subtitle'),
			href: '/knowledge',
			color:
				'from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20',
		},
		{
			icon: Tag01Icon,
			label: t('nav.tags'),
			description: t('home.moreFeatures.tagsDesc'),
			href: '/tags',
			color:
				'from-rose-500/10 to-pink-500/10 hover:from-rose-500/20 hover:to-pink-500/20',
		},
		{
			icon: Settings02Icon,
			label: t('nav.settings'),
			description: t('settings.subtitle'),
			href: '/settings',
			color:
				'from-slate-500/10 to-gray-500/10 hover:from-slate-500/20 hover:to-gray-500/20',
		},
	]

	return (
		<div className="relative h-full overflow-auto">
			<div className="container mx-auto max-w-5xl px-6 py-12">
				{/* User Profile Header */}
				<div className="mb-10 flex animate-fade-in items-center justify-between">
					<div className="flex items-center gap-5">
						<Link
							aria-label={t('nav.profile')}
							className="group relative"
							to="/profile"
						>
							<Avatar className="size-16! ring-2 ring-primary/20 transition-all duration-300 group-hover:ring-4 group-hover:ring-primary/40">
								{session.user.image ? (
									<AvatarImage
										alt={session.user.name || 'User avatar'}
										src={session.user.image}
									/>
								) : null}
								<AvatarFallback className="bg-linear-to-br from-primary/20 to-purple-500/20 font-semibold text-lg text-primary">
									{session.user.name ? (
										getInitials(session.user.name)
									) : (
										<HugeiconsIcon className="size-7" icon={UserCircleIcon} />
									)}
								</AvatarFallback>
							</Avatar>
							<div className="absolute -right-0.5 -bottom-0.5 size-4 rounded-full border-2 border-background bg-green-500" />
						</Link>
						<div>
							<p className="text-muted-foreground text-sm">
								{t(`activity.${greetingKey}`)}
							</p>
							<h1 className="bg-linear-to-r from-foreground to-foreground/70 bg-clip-text font-script font-script-en font-semibold text-2xl text-primary md:text-3xl">
								{session.user.name || t('auth.welcome')}
							</h1>
						</div>
					</div>

					<div className="flex items-center gap-3">
						<div className="hidden items-center gap-2 rounded-full border border-border/50 bg-card/50 px-3 py-1.5 sm:flex">
							<div
								className={cn(
									'size-2 rounded-full',
									healthCheck.data ? 'bg-green-500' : 'bg-red-500',
									healthCheck.data ? 'animate-pulse' : ''
								)}
							/>
							<span className="font-medium font-script text-muted-foreground text-xs">
								{getSystemStatus(healthCheck.isLoading, !!healthCheck.data, t)}
							</span>
						</div>
						<Link to="/profile">
							<Button className="gap-2 rounded-full" size="sm" variant="outline">
								<HugeiconsIcon className="size-4" icon={UserCircle02Icon} />
								<span className="hidden sm:inline">{t('nav.profile')}</span>
							</Button>
						</Link>
					</div>
				</div>

				{/* Hero Section */}
				<div className="mb-10 animate-fade-in delay-100">
					<p className="max-w-2xl text-lg text-muted-foreground leading-relaxed">
						{t('home.subtitleUser')}
					</p>
				</div>

				{/* Stats Cards */}
				<div className="mb-10 grid animate-fade-in gap-4 delay-150 sm:grid-cols-2 lg:grid-cols-4">
					<StatsCard
						badge={overdueCount > 0 ? t('review.overdue') : undefined}
						badgeVariant="destructive"
						href="/review"
						icon={Calendar03Icon}
						iconColor="bg-amber-500/10 text-amber-500"
						label={t('review.statsDueEntries')}
						value={dueCount}
					/>
					<StatsCard
						href="/review"
						icon={BookOpen01Icon}
						iconColor="bg-green-500/10 text-green-500"
						label={t('review.statsReviewedToday')}
						value={reviewedToday}
					/>
					<StatsCard
						badge={streak >= 7 ? '🔥' : undefined}
						badgeVariant="secondary"
						href="/review"
						icon={FireIcon}
						iconColor="bg-orange-500/10 text-orange-500"
						label={t('review.statsStreak')}
						value={streak}
					/>
					<StatsCard
						badge={
							inboxCount > 0
								? getInboxBadgeText(inboxCount, hasMoreInbox)
								: undefined
						}
						badgeVariant="outline"
						href="/inbox"
						icon={InboxIcon}
						iconColor="bg-blue-500/10 text-blue-500"
						label={t('entry.inbox')}
						value={getInboxBadgeText(inboxCount, hasMoreInbox)}
					/>
				</div>

				{/* Quick Actions Grid */}
				<div className="mb-10 animate-fade-in delay-200">
					<div className="mb-6 flex items-center gap-3">
						<HugeiconsIcon className="h-5 w-5 text-primary" icon={MagicWand01Icon} />
						<h2 className="font-script font-semibold text-2xl">
							{t('home.quickActions')}
						</h2>
					</div>

					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{quickActions.map((action, index) => (
							<ActionCard
								action={action}
								baseDelay={2}
								index={index}
								key={action.href}
							/>
						))}
					</div>
				</div>

				{/* More Features */}
				<div className="mb-10 animate-fade-in delay-250">
					<div className="mb-6 flex items-center gap-3">
						<HugeiconsIcon className="size-5 text-primary" icon={BookOpen01Icon} />
						<h2 className="font-script font-semibold text-2xl">
							{t('home.moreFeatures.title')}
						</h2>
					</div>

					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
						{moreFeatures.map((feature, index) => (
							<ActionCard
								action={feature}
								baseDelay={6}
								index={index}
								key={feature.href}
							/>
						))}
					</div>
				</div>

				{/* Feature Highlights */}
				<div className="animate-fade-in delay-300">
					<div className="mb-6 flex items-center gap-3">
						<HugeiconsIcon className="size-5 text-primary" icon={MagicWand01Icon} />
						<h2 className="font-script font-semibold text-2xl">
							{t('home.whatYouCanDo')}
						</h2>
					</div>

					<div className="grid gap-6 md:grid-cols-3">
						<div className="group rounded-xl border border-border/50 bg-card/50 p-6 transition-colors hover:border-primary/30">
							<img
								alt={t('home.feature.capture.title')}
								className="mb-3 size-12"
								src="/img/note.png"
							/>
							<h3 className="mb-2 font-display font-semibold text-lg">
								{t('home.feature.capture.title')}
							</h3>
							<p className="text-muted-foreground text-sm leading-relaxed">
								{t('home.feature.capture.desc')}
							</p>
						</div>

						<div className="group rounded-xl border border-border/50 bg-card/50 p-6 transition-colors hover:border-primary/30">
							<img
								alt={t('home.feature.organize.title')}
								className="mb-3 size-12"
								src="/img/bookmark.png"
							/>
							<h3 className="mb-2 font-display font-semibold text-lg">
								{t('home.feature.organize.title')}
							</h3>
							<p className="text-muted-foreground text-sm leading-relaxed">
								{t('home.feature.organize.desc')}
							</p>
						</div>

						<div className="group rounded-xl border border-border/50 bg-card/50 p-6 transition-colors hover:border-primary/30">
							<img
								alt={t('home.feature.revisit.title')}
								className="mb-3 size-12"
								src="/img/zoom.png"
							/>
							<h3 className="mb-2 font-display font-semibold text-lg">
								{t('home.feature.revisit.title')}
							</h3>
							<p className="text-muted-foreground text-sm leading-relaxed">
								{t('home.feature.revisit.desc')}
							</p>
						</div>
					</div>
				</div>
			</div>
		</div>
	)
}
