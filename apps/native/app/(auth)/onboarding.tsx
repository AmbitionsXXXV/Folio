import {
	Book02Icon,
	CloudIcon,
	NoteEditIcon,
	RefreshIcon,
} from '@hugeicons/core-free-icons'
import type { IconSvgElement } from '@hugeicons/react-native'
import { HugeiconsIcon } from '@hugeicons/react-native'
import { router } from 'expo-router'
import { Button, useThemeColor } from 'heroui-native'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Container } from '@/components/container'
import { useLocalMode } from '@/contexts/local-mode-context'

export default function OnboardingScreen() {
	const { t } = useTranslation()
	const insets = useSafeAreaInsets()
	const accentColor = useThemeColor('accent')
	const mutedColor = useThemeColor('muted')
	const { enableLocalMode } = useLocalMode()
	const [isSkipping, setIsSkipping] = useState(false)

	const handleSignIn = useCallback(() => {
		router.push('/(auth)/sign-in')
	}, [])

	const handleSignUp = useCallback(() => {
		router.push('/(auth)/sign-up')
	}, [])

	const handleSkipLogin = useCallback(async () => {
		setIsSkipping(true)
		try {
			await enableLocalMode()
			// Stack.Protected will automatically navigate when isLocalMode becomes true
			// No need to manually call router.replace
		} catch {
			// Error is logged in context
			setIsSkipping(false)
		}
	}, [enableLocalMode])

	return (
		<Container className="flex-1">
			<View
				className="flex-1 justify-between"
				style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
			>
				{/* Hero Section */}
				<View className="flex-1 items-center justify-center px-8">
					{/* Logo / Icon */}
					<View className="mb-8 size-24 items-center justify-center rounded-3xl bg-accent/10">
						<HugeiconsIcon color={accentColor} icon={Book02Icon} size={48} />
					</View>

					{/* App Name */}
					<Text className="mb-3 text-center font-bold text-4xl text-foreground">
						FolioNote
					</Text>

					{/* Tagline */}
					<Text className="mb-8 px-4 text-center text-lg text-muted">
						{t('onboarding.tagline')}
					</Text>

					{/* Features */}
					<View className="w-full max-w-sm">
						<FeatureItem
							accentColor={accentColor}
							description={t('onboarding.feature1Desc')}
							icon={NoteEditIcon}
							title={t('onboarding.feature1')}
						/>
						<FeatureItem
							accentColor={accentColor}
							description={t('onboarding.feature2Desc')}
							icon={RefreshIcon}
							title={t('onboarding.feature2')}
						/>
						<FeatureItem
							accentColor={accentColor}
							description={t('onboarding.feature3Desc')}
							icon={CloudIcon}
							title={t('onboarding.feature3')}
						/>
					</View>
				</View>

				{/* Action Buttons */}
				<View className="px-6 pb-4">
					{/* Sign Up Button (Primary) */}
					<Button
						className="mb-3 flex-row items-center justify-center bg-accent active:opacity-80"
						onPress={handleSignUp}
					>
						<Text className="font-semibold text-lg text-white">
							{t('auth.createAccount')}
						</Text>
					</Button>

					{/* Sign In Button (Secondary) */}
					<Button
						className="mb-3 flex-row items-center justify-center border border-divider bg-surface active:opacity-80"
						onPress={handleSignIn}
					>
						<Text className="font-semibold text-foreground text-lg">
							{t('auth.signIn')}
						</Text>
					</Button>

					{/* Skip Login Button (Tertiary) */}
					<Button
						className="flex-row items-center justify-center active:opacity-80"
						isDisabled={isSkipping}
						onPress={handleSkipLogin}
						variant="ghost"
					>
						{isSkipping ? (
							<ActivityIndicator color={mutedColor} size="small" />
						) : (
							<Text className="font-medium text-muted">
								{t('onboarding.skipLogin')}
							</Text>
						)}
					</Button>

					{/* Local Mode Hint */}
					<Text className="mt-2 px-4 text-center text-muted text-xs">
						{t('onboarding.localModeHint')}
					</Text>
				</View>
			</View>
		</Container>
	)
}

function FeatureItem({
	icon,
	title,
	description,
	accentColor,
}: {
	icon: IconSvgElement
	title: string
	description: string
	accentColor: string
}) {
	return (
		<View className="mb-4 flex-row items-start">
			<View className="mr-4 size-10 items-center justify-center rounded-full bg-accent/10">
				<HugeiconsIcon color={accentColor} icon={icon} size={20} />
			</View>
			<View className="flex-1">
				<Text className="mb-1 font-semibold text-foreground">{title}</Text>
				<Text className="text-muted text-sm">{description}</Text>
			</View>
		</View>
	)
}
