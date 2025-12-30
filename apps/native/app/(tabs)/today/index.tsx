import { useQuery } from '@tanstack/react-query'
import { router } from 'expo-router'
import { useThemeColor } from 'heroui-native'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator } from 'react-native'
import { Container } from '@/components/container'
import { TodayContent } from '@/components/today-content'
import { useDataServiceContext } from '@/contexts/data-service-context'
import { authClient } from '@/lib/auth-client'
import { getTzOffset } from '@/utils/time'

export default function TodayScreen() {
	const { t } = useTranslation()
	const { data: session } = authClient.useSession()
	const { dataService, isMigrating } = useDataServiceContext()
	const accentColor = useThemeColor('accent')

	const {
		data: todayStats,
		isLoading: isLoadingTodayStats,
		refetch: refetchTodayStats,
		isRefetching: isRefetchingTodayStats,
	} = useQuery({
		queryKey: ['review', 'todayStats'],
		queryFn: () => dataService?.review.getTodayStats(getTzOffset()),
		enabled: !!dataService,
	})

	const {
		data: dueStats,
		isLoading: isLoadingDueStats,
		refetch: refetchDueStats,
		isRefetching: isRefetchingDueStats,
	} = useQuery({
		queryKey: ['review', 'dueStats'],
		queryFn: () => dataService?.review.getDueStats(getTzOffset()),
		enabled: !!dataService,
	})

	const handleRefresh = useCallback(() => {
		refetchTodayStats()
		refetchDueStats()
	}, [refetchTodayStats, refetchDueStats])

	const navigateToReview = useCallback(() => {
		router.push('/review' as never)
	}, [])

	// Show loading while migrating or loading data
	const isLoading =
		isMigrating || isLoadingTodayStats || isLoadingDueStats || !dataService
	if (isLoading) {
		return (
			<Container className="flex-1 items-center justify-center">
				<ActivityIndicator color={accentColor} size="large" />
			</Container>
		)
	}

	const isRefetching = isRefetchingTodayStats || isRefetchingDueStats
	const userName = session?.user?.name?.split(' ')[0] ?? t('common.other')

	return (
		<Container className="flex-1">
			<TodayContent
				dueToday={dueStats?.dueToday ?? 0}
				isRefetching={isRefetching}
				newCount={dueStats?.newCount ?? 0}
				onRefresh={handleRefresh}
				onStartReview={navigateToReview}
				overdue={dueStats?.overdue ?? 0}
				reviewedToday={todayStats?.reviewedToday ?? 0}
				starredEntries={todayStats?.starredEntries ?? 0}
				streak={todayStats?.streak ?? 0}
				totalEntries={todayStats?.totalEntries ?? 0}
				unreviewedEntries={todayStats?.unreviewedEntries ?? 0}
				userName={userName}
			/>
		</Container>
	)
}
