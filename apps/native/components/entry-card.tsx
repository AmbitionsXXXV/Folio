import { formatDate } from '@folionote/locales'
import { PinIcon, StarIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react-native'
import { useRouter } from 'expo-router'
import { Card, useThemeColor } from 'heroui-native'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Pressable, Text, View } from 'react-native'

type Entry = {
	id: string
	title: string | null
	contentText: string | null
	isStarred: boolean | null
	isPinned: boolean | null
	isInbox: boolean | null
	createdAt: Date
	updatedAt: Date
}

type EntryCardProps = {
	entry: Entry
	onPress?: (entry: Entry) => void
	/** Whether to navigate to detail page on press (default: true) */
	navigateOnPress?: boolean
}

function truncateText(text: string | null, maxLength: number): string {
	if (!text) {
		return ''
	}
	if (text.length <= maxLength) {
		return text
	}
	return `${text.slice(0, maxLength)}...`
}

export function EntryCard({
	entry,
	onPress,
	navigateOnPress = true,
}: EntryCardProps) {
	const { t, i18n } = useTranslation()
	const router = useRouter()
	const warningColor = useThemeColor('warning')
	const accentColor = useThemeColor('accent')

	const handlePress = useCallback(() => {
		if (onPress) {
			onPress(entry)
		} else if (navigateOnPress) {
			router.push(`/inbox/${entry.id}`)
		}
	}, [entry, onPress, navigateOnPress, router])

	const title = entry.title || t('entryCard.untitled')
	const preview = entry.contentText
		? truncateText(entry.contentText, 120)
		: t('entryCard.emptyNote')

	return (
		<Pressable onPress={handlePress}>
			<Card className="p-4 active:opacity-90" variant="secondary">
				<View className="flex-row items-start justify-between">
					<View className="flex-1 pr-2">
						<View className="mb-1 flex-row items-center">
							{entry.isPinned && (
								<View className="mr-1">
									<HugeiconsIcon color={accentColor} icon={PinIcon} size={14} />
								</View>
							)}
							<Text
								className="flex-1 font-medium text-base text-foreground"
								numberOfLines={1}
							>
								{title}
							</Text>
						</View>

						{preview && (
							<Text className="mb-2 text-muted text-sm" numberOfLines={2}>
								{preview}
							</Text>
						)}

						<View className="flex-row items-center">
							<Text className="text-muted text-xs">
								{formatDate(entry.updatedAt, {
									locale: i18n.language,
									preset: 'relative',
								})}
							</Text>
						</View>
					</View>

					{entry.isStarred && (
						<HugeiconsIcon color={warningColor} icon={StarIcon} size={18} />
					)}
				</View>
			</Card>
		</Pressable>
	)
}
