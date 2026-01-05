import { useForm } from '@tanstack/react-form'
import { router } from 'expo-router'
import { Button, TextField } from 'heroui-native'
import { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	Text,
	View,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { z } from 'zod'
import { Container } from '@/components/container'
import { authClient } from '@/lib/auth-client'
import { queryClient } from '@/utils/orpc'

export default function SignInScreen() {
	const { t } = useTranslation()
	const insets = useSafeAreaInsets()
	const [submitError, setSubmitError] = useState<string | null>(null)

	const form = useForm({
		defaultValues: {
			email: '',
			password: '',
		},
		onSubmit: async ({ value }) => {
			setSubmitError(null)

			await authClient.signIn.email(
				{
					email: value.email.trim(),
					password: value.password,
				},
				{
					onError(signInError) {
						console.log(signInError)
						setSubmitError(signInError.error?.message || t('auth.signInFailed'))
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

	const navigateToSignUp = useCallback(() => {
		router.replace('/(auth)/sign-up')
	}, [])

	return (
		<Container className="flex-1" disableBottomInset disableTopInset>
			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				className="flex-1"
			>
				<View className="flex-1 px-6" style={{ paddingBottom: insets.bottom + 16 }}>
					{/* Form */}
					<View className="flex-1 pt-4">
						{/* Welcome Text */}
						<Text className="mb-2 font-semibold text-foreground text-xl">
							{t('auth.welcomeBack')}
						</Text>
						<Text className="mb-8 text-muted">{t('auth.signInSubtitle')}</Text>

						{/* Form Error Message */}
						{submitError ? (
							<View className="mb-4 rounded-xl bg-danger/10 p-4">
								<Text className="text-danger text-sm">{submitError}</Text>
							</View>
						) : null}

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
										field.state.meta.isTouched && field.state.meta.errors.length > 0
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
								onBlur: z.string().min(1, t('auth.passwordRequired')),
							}}
						>
							{(field) => (
								<TextField
									className="mb-6"
									isInvalid={
										field.state.meta.isTouched && field.state.meta.errors.length > 0
									}
								>
									<TextField.Label>{t('auth.password')}</TextField.Label>
									<TextField.Input
										autoCapitalize="none"
										autoComplete="password"
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
					</View>

					{/* Bottom Actions */}
					<View>
						{/* Sign In Button */}
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
										t('auth.signIn')
									)}
								</Button>
							)}
						</form.Subscribe>

						{/* Sign Up Link */}
						<View className="flex-row items-center justify-center">
							<Text className="text-muted">{t('auth.noAccount')} </Text>
							<Button onPress={navigateToSignUp} size="sm" variant="ghost">
								{t('auth.signUp')}
							</Button>
						</View>
					</View>
				</View>
			</KeyboardAvoidingView>
		</Container>
	)
}
