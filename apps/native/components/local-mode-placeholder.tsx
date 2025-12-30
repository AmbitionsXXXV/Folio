import { CloudIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react-native'
import { router } from 'expo-router'
import { Button, useThemeColor } from 'heroui-native'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Text, View } from 'react-native'
import { Container } from '@/components/container'
import { useLocalMode } from '@/contexts/local-mode-context'

/**
 * Placeholder component shown in local mode for features that require authentication
 * Displays a friendly message and sign-in button
 */
export function LocalModePlaceholder() {
	const { t } = useTranslation()
	const { disableLocalMode } = useLocalMode()
	const accentColor = useThemeColor('accent')

	const handleSignIn = useCallback(async () => {
		await disableLocalMode()
		router.replace('/(auth)/sign-in')
	}, [disableLocalMode])

	return (
		<Container className="flex-1 items-center justify-center p-6" disableScroll>
			<View className="mb-6 size-20 items-center justify-center rounded-full bg-accent/10">
				<HugeiconsIcon color={accentColor} icon={CloudIcon} size={40} />
			</View>

			<Text className="mb-2 text-center font-semibold text-foreground text-xl">
				{t('onboarding.localModeFeatureComingSoon')}
			</Text>

			<Text className="mb-8 px-4 text-center text-muted">
				{t('onboarding.localModeFeatureDesc')}
			</Text>

			<Button
				className="bg-accent px-8 py-4 active:opacity-70"
				onPress={handleSignIn}
			>
				<Text className="font-semibold text-white">{t('onboarding.signInNow')}</Text>
			</Button>

			<Text className="mt-4 text-center text-muted text-xs">
				{t('onboarding.localModeHint')}
			</Text>
		</Container>
	)
}
