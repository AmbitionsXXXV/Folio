import { formatDate } from '@folionote/locales'
import {
	ArrowRight01Icon,
	BookOpen01Icon,
	CloudIcon,
	InboxIcon,
	NoteIcon,
	Rocket01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react-native'
import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { Button, Card, useThemeColor } from 'heroui-native'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import {
	ActivityIndicator,
	Pressable,
	RefreshControl,
	ScrollView,
	Text,
	View,
} from 'react-native'
import { Container } from '@/components/container'
import { EntryCard } from '@/components/entry-card'
import { useLocalMode } from '@/contexts/local-mode-context'
import { authClient } from '@/lib/auth-client'
import { orpc } from '@/utils/orpc'
import { getTzOffset } from '@/utils/time'

/**
 * Get greeting key based on current hour
 */
function getGreetingKey(): 'goodMorning' | 'goodAfternoon' | 'goodEvening' {
	const hour = new Date().getHours()
	if (hour < 12) return 'goodMorning'
	if (hour < 18) return 'goodAfternoon'
	return 'goodEvening'
}

type RecentEntry = {
	id: string
	title: string | null
	contentText: string | null
	isStarred: boolean | null
	isPinned: boolean | null
	isInbox: boolean | null
	createdAt: Date
	updatedAt: Date
}

type RecentEntriesContentProps = {
	entries: RecentEntry[]
	isLoading: boolean
	accentColor: string
	mutedColor: string
	t: (key: string) => string
}

/**
 * Recent entries content component
 */
function RecentEntriesContent({
	entries,
	isLoading,
	accentColor,
	mutedColor,
	t,
}: RecentEntriesContentProps) {
	if (isLoading) {
		return (
			<View className="items-center py-8">
				<ActivityIndicator color={accentColor} />
			</View>
		)
	}

	if (entries.length === 0) {
		return (
			<Card className="p-6" variant="secondary">
				<View className="items-center">
					<HugeiconsIcon color={mutedColor} icon={NoteIcon} size={48} />
					<Text className="mt-3 text-center text-muted">
						{t('activity.noRecentEntries')}
					</Text>
					<Text className="mt-1 text-center text-muted text-sm">
						{t('activity.startCapturing')}
					</Text>
				</View>
			</Card>
		)
	}

	return (
		<View className="gap-3">
			{entries.map((entry) => (
				<EntryCard entry={entry} key={entry.id} />
			))}
		</View>
	)
}

export default function HomeScreen() {
	const { t, i18n } = useTranslation()
	const { data: session } = authClient.useSession()
	const { isLocalMode, disableLocalMode } = useLocalMode()
	const healthCheck = useQuery(orpc.healthCheck.queryOptions())

	const accentColor = useThemeColor('accent')
	const mutedColor = useThemeColor('muted')
	const successColor = useThemeColor('success')
	const warningColor = useThemeColor('warning')

	const handleSignIn = useCallback(async () => {
		await disableLocalMode()
		router.replace('/(auth)/sign-in')
	}, [disableLocalMode])

	// Fetch due stats if logged in
	const {
		data: dueStats,
		isLoading: isLoadingStats,
		refetch: refetchStats,
		isRefetching: isRefetchingStats,
	} = useQuery({
		...orpc.review.getDueStats.queryOptions({ input: { tzOffset: getTzOffset() } }),
		enabled: !!session?.user,
	})

	// Fetch recent entries
	const {
		data: recentData,
		isLoading: isLoadingRecent,
		refetch: refetchRecent,
	} = useQuery({
		...orpc.entries.list.queryOptions({ input: { filter: 'all', limit: 4 } }),
		enabled: !!session?.user,
	})

	// Fetch today stats for total entries count
	const { data: todayStats, isLoading: isLoadingTodayStats } = useQuery({
		...orpc.review.getTodayStats.queryOptions({
			input: { tzOffset: getTzOffset() },
		}),
		enabled: !!session?.user,
	})

	// Fetch inbox count
	const { data: inboxData, isLoading: isLoadingInbox } = useQuery({
		...orpc.entries.list.queryOptions({ input: { filter: 'inbox', limit: 1 } }),
		enabled: !!session?.user,
		select: (data) => ({
			count: data.items.length,
			hasMore: data.hasMore,
		}),
	})

	const isConnected = healthCheck?.data === 'OK'
	const isLoading = healthCheck?.isLoading

	const handleRefresh = useCallback(() => {
		healthCheck.refetch()
		if (session?.user) {
			refetchStats()
			refetchRecent()
		}
	}, [healthCheck, session?.user, refetchStats, refetchRecent])

	const navigateToInbox = useCallback(() => {
		router.push('/inbox' as never)
	}, [])

	const navigateToLibrary = useCallback(() => {
		router.push('/today' as never)
	}, [])

	const navigateToReview = useCallback(() => {
		router.push('/review' as never)
	}, [])

	const totalDue = (dueStats?.overdue ?? 0) + (dueStats?.dueToday ?? 0)
	const recentEntries = recentData?.items?.filter((e) => !e.isInbox) ?? []
	const greetingKey = getGreetingKey()

	return (
		<Container className="flex-1" disableScroll disableTopInset>
			<ScrollView
				contentContainerStyle={{ padding: 16, flexGrow: 1 }}
				contentInsetAdjustmentBehavior="automatic"
				refreshControl={
					<RefreshControl
						onRefresh={handleRefresh}
						refreshing={isRefetchingStats}
						tintColor={accentColor}
					/>
				}
			>
				{/* Header with greeting */}
				<View className="mb-6">
					{session?.user ? (
						<>
							<Text className="mb-1 font-bold text-2xl text-foreground">
								{t(`activity.${greetingKey}`, { name: session.user.name })}
							</Text>
							<Text className="text-muted">
								{formatDate(new Date(), {
									locale: i18n.language,
									options: { weekday: 'long', month: 'long', day: 'numeric' },
								})}
							</Text>
							{totalDue > 0 && (
								<Pressable
									className="mt-2 flex-row items-center"
									onPress={navigateToReview}
								>
									<Text className="text-sm">
										{t('activity.reviewReminder', { count: totalDue })}
									</Text>
									<HugeiconsIcon icon={ArrowRight01Icon} size={16} />
								</Pressable>
							)}
						</>
					) : (
						<>
							<Text className="mb-1 font-bold text-3xl text-foreground">
								FolioNote
							</Text>
							<View className="flex-row items-center">
								<View
									className={`mr-2 h-2 w-2 rounded-full ${isConnected ? 'bg-success' : 'bg-danger'}`}
								/>
								<Text className="text-muted text-sm">
									{(() => {
										if (isLoading) return t('home.connecting')
										if (isConnected) return t('home.systemReady')
										return t('home.offline')
									})()}
								</Text>
							</View>
						</>
					)}
				</View>

				{/* Local Mode Banner */}
				{isLocalMode && !session?.user && (
					<Card
						className="mb-4 border border-accent-soft-hover bg-accent/5 p-4"
						variant="secondary"
					>
						<View className="flex-row items-center">
							<View className="mr-3 size-10 items-center justify-center rounded-full bg-accent/10">
								<HugeiconsIcon color={accentColor} icon={CloudIcon} size={20} />
							</View>
							<View className="flex-1">
								<Text className="font-medium text-foreground">
									{t('onboarding.localModeTitle')}
								</Text>
								<Text className="text-muted text-xs">
									{t('onboarding.localModeHint')}
								</Text>
							</View>
							<Button
								className="bg-accent px-3 py-2 active:opacity-70"
								onPress={handleSignIn}
							>
								<Text className="font-medium text-white text-xs">
									{t('auth.signIn')}
								</Text>
							</Button>
						</View>
					</Card>
				)}

				{/* Recent Entries Section - Only for logged in users */}
				{session?.user && (
					<View className="mb-6">
						<View className="mb-3 flex-row items-center justify-between">
							<Text className="font-semibold text-foreground text-lg">
								{t('activity.recentEntries')}
							</Text>
							<Pressable
								className="flex-row items-center"
								onPress={navigateToLibrary}
							>
								<Text className="mr-1 text-muted text-sm">
									{t('activity.viewAll')}
								</Text>
								<HugeiconsIcon
									color={mutedColor}
									icon={ArrowRight01Icon}
									size={16}
								/>
							</Pressable>
						</View>

						<RecentEntriesContent
							accentColor={accentColor}
							entries={recentEntries}
							isLoading={isLoadingRecent}
							mutedColor={mutedColor}
							t={t}
						/>
					</View>
				)}

				{/* Quick Access Section */}
				<View>
					<Text className="mb-3 font-semibold text-foreground text-lg">
						{t('activity.quickAccess')}
					</Text>

					<View className="gap-3">
						{/* Inbox */}
						<Pressable onPress={navigateToInbox}>
							<Card className="p-4" variant="secondary">
								<View className="flex-row items-center">
									<View className="mr-3 size-12 items-center justify-center rounded-lg bg-accent/10">
										<HugeiconsIcon color={accentColor} icon={InboxIcon} size={24} />
									</View>
									<View className="flex-1">
										<Text className="font-medium text-foreground">
											{t('nav.inbox')}
										</Text>
										<Text className="text-muted text-sm">
											{isLoadingInbox ? (
												'...'
											) : (
												<>
													{t('activity.inboxCount', {
														count: inboxData?.count ?? 0,
													})}
													{inboxData?.hasMore ? '+' : ''}
												</>
											)}
										</Text>
									</View>
									<HugeiconsIcon
										color={mutedColor}
										icon={ArrowRight01Icon}
										size={20}
									/>
								</View>
							</Card>
						</Pressable>

						{/* Library */}
						<Pressable onPress={navigateToLibrary}>
							<Card className="p-4" variant="secondary">
								<View className="flex-row items-center">
									<View className="mr-3 size-12 items-center justify-center rounded-lg bg-success/10">
										<HugeiconsIcon
											color={successColor}
											icon={BookOpen01Icon}
											size={24}
										/>
									</View>
									<View className="flex-1">
										<Text className="font-medium text-foreground">
											{t('nav.library')}
										</Text>
										<Text className="text-muted text-sm">
											{isLoadingTodayStats
												? '...'
												: t('activity.libraryCount', {
														count: todayStats?.totalEntries ?? 0,
													})}
										</Text>
									</View>
									<HugeiconsIcon
										color={mutedColor}
										icon={ArrowRight01Icon}
										size={20}
									/>
								</View>
							</Card>
						</Pressable>

						{/* Review */}
						<Pressable onPress={navigateToReview}>
							<Card className="p-4" variant="secondary">
								<View className="flex-row items-center">
									<View className="mr-3 size-12 items-center justify-center rounded-lg bg-warning/10">
										<HugeiconsIcon
											color={warningColor}
											icon={Rocket01Icon}
											size={24}
										/>
									</View>
									<View className="flex-1">
										<Text className="font-medium text-foreground">
											{t('nav.review')}
										</Text>
										<Text className="text-muted text-sm">
											{isLoadingStats
												? '...'
												: t('activity.dueCount', { count: totalDue })}
										</Text>
									</View>
									<HugeiconsIcon
										color={mutedColor}
										icon={ArrowRight01Icon}
										size={20}
									/>
								</View>
							</Card>
						</Pressable>
					</View>
				</View>

				{/* Loading indicator for stats */}
				{session?.user && isLoadingStats && (
					<View className="items-center py-4">
						<ActivityIndicator color={accentColor} />
					</View>
				)}
			</ScrollView>
		</Container>
	)
}
