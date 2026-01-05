import { useForm } from '@tanstack/react-form'
import { router } from 'expo-router'
import { Button, TextField } from 'heroui-native'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	ScrollView,
	Text,
	View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { z } from 'zod'
import { Container } from '@/components/container'
import { authClient } from '@/lib/auth-client'
import { queryClient } from '@/utils/orpc'

const PASSWORD_MIN_LENGTH = 8

export default function SignUpScreen() {
	const { t } = useTranslation()
	const insets = useSafeAreaInsets()
	const [submitError, setSubmitError] = useState<string | null>(null)

	const form = useForm({
		defaultValues: {
			name: '',
			email: '',
			password: '',
		},
		onSubmit: async ({ value }) => {
			setSubmitError(null)

			await authClient.signUp.email(
				{
					name: value.name.trim(),
					email: value.email.trim(),
					password: value.password,
				},
				{
					onError(signUpError) {
						setSubmitError(signUpError.error?.message || t('auth.signUpFailed'))
					},
					onSuccess() {
						form.reset()
						queryClient.refetchQueries()
						// Stack.Protected will automatically navigate when session state updates
					},
				}
			)
		},
	})

	const navigateToSignIn = useCallback(() => {
		router.replace('/(auth)/sign-in')
	}, [])

	return (
		<Container className="flex-1" disableBottomInset disableTopInset>
			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				className="flex-1"
			>
				<View className="flex-1 pt-4">
					<ScrollView
						className="flex-1"
						contentContainerStyle={{
							paddingHorizontal: 24,
						}}
						keyboardShouldPersistTaps="handled"
					>
						{/* Form */}
						<View>
							{/* Welcome Text */}
							<Text className="mb-2 font-semibold text-foreground text-xl">
								{t('auth.getStarted')}
							</Text>
							<Text className="mb-8 text-muted">{t('auth.signUpSubtitle')}</Text>

							{/* Form Error Message */}
							{submitError ? (
								<View className="mb-4 rounded-xl bg-danger/10 p-4">
									<Text className="text-danger text-sm">{submitError}</Text>
								</View>
							) : null}

							{/* Name Input */}
							<form.Field
								name="name"
								validators={{
									onBlur: z.string().min(1, t('auth.nameRequired')),
								}}
							>
								{(field) => (
									<TextField
										className="mb-4"
										isInvalid={
											field.state.meta.isTouched &&
											field.state.meta.errors.length > 0
										}
									>
										<TextField.Label>{t('auth.name')}</TextField.Label>
										<TextField.Input
											autoCapitalize="words"
											autoComplete="name"
											onBlur={field.handleBlur}
											onChangeText={field.handleChange}
											placeholder={t('auth.namePlaceholder')}
											value={field.state.value}
										/>
										<TextField.ErrorMessage>
											{field.state.meta.errors[0]?.message}
										</TextField.ErrorMessage>
									</TextField>
								)}
							</form.Field>

							{/* Email Input */}
							<form.Field
								name="email"
								validators={{
									onBlur: z.email(),
								}}
							>
								{(field) => (
									<TextField
										className="mb-4"
										isInvalid={
											field.state.meta.isTouched &&
											field.state.meta.errors.length > 0
										}
									>
										<TextField.Label>{t('auth.email')}</TextField.Label>
										<TextField.Input
											autoCapitalize="none"
											autoComplete="email"
											keyboardType="email-address"
											onBlur={field.handleBlur}
											onChangeText={field.handleChange}
											placeholder={t('auth.emailPlaceholder')}
											value={field.state.value}
										/>
										<TextField.ErrorMessage>
											{field.state.meta.errors[0]?.message}
										</TextField.ErrorMessage>
									</TextField>
								)}
							</form.Field>

							{/* Password Input */}
							<form.Field
								name="password"
								validators={{
									onBlur: z
										.string()
										.min(1, t('auth.passwordRequired'))
										.min(PASSWORD_MIN_LENGTH, t('auth.passwordTooShort')),
								}}
							>
								{(field) => (
									<TextField
										className="mb-2"
										isInvalid={
											field.state.meta.isTouched &&
											field.state.meta.errors.length > 0
										}
									>
										<TextField.Label>{t('auth.password')}</TextField.Label>
										<TextField.Input
											autoCapitalize="none"
											autoComplete="password-new"
											onBlur={field.handleBlur}
											onChangeText={field.handleChange}
											onSubmitEditing={() => form.handleSubmit()}
											placeholder={t('auth.passwordPlaceholder')}
											returnKeyType="done"
											secureTextEntry
											value={field.state.value}
										/>
										<TextField.ErrorMessage>
											{field.state.meta.errors[0]?.message}
										</TextField.ErrorMessage>
									</TextField>
								)}
							</form.Field>

							{/* Password Hint */}
							<Text className="text-muted text-xs">{t('auth.passwordHint')}</Text>
						</View>
					</ScrollView>

					{/* Bottom Actions */}
					<View className="px-6" style={{ paddingBottom: insets.bottom + 16 }}>
						{/* Sign Up Button */}
						<form.Subscribe
							selector={(state) => [state.canSubmit, state.isSubmitting]}
						>
							{([canSubmit, isSubmitting]) => (
								<Button
									className="mb-4 w-full"
									isDisabled={!canSubmit || isSubmitting}
									onPress={() => form.handleSubmit()}
								>
									{isSubmitting ? (
										<ActivityIndicator color="white" size="small" />
									) : (
										t('auth.signUp')
									)}
								</Button>
							)}
						</form.Subscribe>

						{/* Sign In Link */}
						<View className="flex-row items-center justify-center">
							<Text className="text-muted">{t('auth.haveAccount')} </Text>
							<Button onPress={navigateToSignIn} size="sm" variant="ghost">
								{t('auth.signIn')}
							</Button>
						</View>
					</View>
				</View>
			</KeyboardAvoidingView>
		</Container>
	)
}
