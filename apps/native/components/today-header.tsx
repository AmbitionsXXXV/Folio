import { formatDate } from '@folionote/locales'
import { FireIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react-native'
import { useThemeColor } from 'heroui-native'
import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'

type TodayHeaderProps = {
	userName: string
	streak: number
}

export function TodayHeader({ userName, streak }: TodayHeaderProps) {
	const { t, i18n } = useTranslation()
	const warningColor = useThemeColor('warning')

	const dateString = formatDate(new Date(), {
		locale: i18n.language,
		preset: 'full',
	})

	return (
		<View className="mb-6">
			<Text className="mb-1 font-bold text-2xl text-foreground">
				{t('auth.welcome')}, {userName}
			</Text>
			<View className="flex-row items-center justify-between">
				<Text className="text-muted">{dateString}</Text>
				{streak > 0 && (
					<View className="flex-row items-center rounded-full bg-warning/10 px-3 py-1">
						<HugeiconsIcon color={warningColor} icon={FireIcon} size={16} />
						<Text className="ml-1 font-medium text-sm text-warning">
							{t('review.streakDays', { count: streak })}
						</Text>
					</View>
				)}
			</View>
		</View>
	)
}
