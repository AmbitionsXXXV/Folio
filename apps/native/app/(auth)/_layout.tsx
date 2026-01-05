import { Stack } from 'expo-router'
import { useThemeColor } from 'heroui-native'
import { useTranslation } from 'react-i18next'

export default function AuthLayout() {
	const { t } = useTranslation()
	const backgroundColor = useThemeColor('background')
	const foregroundColor = useThemeColor('foreground')

	return (
		<Stack
			screenOptions={{
				headerShown: true,
				headerBackTitle: '',
				headerBackButtonDisplayMode: 'minimal',
				headerShadowVisible: false,
				headerStyle: { backgroundColor },
				headerTintColor: foregroundColor,
				headerTitleStyle: {
					fontWeight: '700',
					fontSize: 18,
				},
				contentStyle: { backgroundColor },
				gestureEnabled: true,
				fullScreenGestureEnabled: true,
			}}
		>
			<Stack.Screen name="onboarding" options={{ headerShown: false }} />
			<Stack.Screen name="sign-in" options={{ title: t('auth.signIn') }} />
			<Stack.Screen name="sign-up" options={{ title: t('auth.createAccount') }} />
		</Stack>
	)
}
