import { GoogleIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useForm } from '@tanstack/react-form'
import { Link, useNavigate } from '@tanstack/react-router'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import z from 'zod'
import {
	Field,
	FieldError,
	FieldGroup,
	FieldLabel,
	FieldSeparator,
} from '@/components/ui/field'
import { authClient } from '@/lib/auth-client'
import { prettifyFormErrors } from '@/lib/form-error'
import Loader from './loader'
import { Button } from './ui/button'
import { Input } from './ui/input'

/**
 * Renders the sign-in form and handles user authentication.
 *
 * Displays a loader while session state is pending, validates email and password, submits credentials,
 * navigates to the dashboard and shows a success toast on success, and shows an error toast on failure.
 *
 * @returns The React element for the sign-in form.
 */
export default function SignInForm() {
	const { t } = useTranslation()
	const navigate = useNavigate({
		from: '/',
	})
	const { isPending } = authClient.useSession()

	// 创建带有国际化错误消息的 schema
	const signInSchema = z.object({
		email: z.email(t('auth.invalidEmail')),
		password: z.string().min(8, t('auth.passwordTooShort')),
	})

	const form = useForm({
		defaultValues: {
			email: '',
			password: '',
		},
		validators: {
			onSubmit: signInSchema,
		},
		onSubmit: async ({ value }) => {
			await authClient.signIn.email(
				{
					email: value.email,
					password: value.password,
				},
				{
					onSuccess: () => {
						navigate({
							to: '/dashboard',
						})
						toast.success(t('auth.signInSuccess'))
					},
					onError: (error) => {
						// 开发环境下打印详细错误
						if (import.meta.env.DEV) {
							console.warn('[SignIn] Auth error:', error.error.message)
						}
						toast.error(error.error.message || t('auth.signInFailed'))
					},
				}
			)
		},
		onSubmitInvalid: ({ formApi }) => {
			// 表单验证失败时，记录格式化的错误日志
			if (import.meta.env.DEV) {
				const errors = formApi.state.errors
				if (errors.length > 0) {
					console.warn('[SignIn] Form validation failed:')
					for (const error of errors) {
						if (error && typeof error === 'object' && 'issues' in error) {
							console.warn(prettifyFormErrors(error as unknown as z.ZodError))
							break
						}
					}
				}
			}
		},
	})

	if (isPending) {
		return <Loader />
	}

	return (
		<div className="mx-auto mt-10 w-full max-w-md p-6">
			<h1 className="mb-6 text-center font-bold text-3xl">{t('auth.welcome')}</h1>

			<form
				id="sign-in-form"
				onSubmit={(e) => {
					e.preventDefault()
					e.stopPropagation()
					form.handleSubmit()
				}}
			>
				<FieldGroup className="gap-4">
					<form.Field
						name="email"
						validators={{
							onBlur: z.email(t('auth.invalidEmail')),
						}}
					>
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid
							return (
								<Field data-invalid={isInvalid || undefined}>
									<FieldLabel htmlFor={field.name}>{t('auth.email')}</FieldLabel>
									<Input
										aria-invalid={isInvalid}
										autoComplete="email"
										id={field.name}
										name={field.name}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder={t('auth.emailPlaceholder')}
										type="email"
										value={field.state.value}
									/>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							)
						}}
					</form.Field>

					<form.Field
						name="password"
						validators={{
							onBlur: z.string().min(1, t('auth.passwordRequired')),
						}}
					>
						{(field) => {
							const isInvalid =
								field.state.meta.isTouched && !field.state.meta.isValid
							return (
								<Field data-invalid={isInvalid || undefined}>
									<FieldLabel htmlFor={field.name}>{t('auth.password')}</FieldLabel>
									<Input
										aria-invalid={isInvalid}
										autoComplete="current-password"
										id={field.name}
										name={field.name}
										onBlur={field.handleBlur}
										onChange={(e) => field.handleChange(e.target.value)}
										placeholder={t('auth.passwordPlaceholder')}
										type="password"
										value={field.state.value}
									/>
									{isInvalid && <FieldError errors={field.state.meta.errors} />}
								</Field>
							)
						}}
					</form.Field>

					<form.Subscribe
						selector={(state) => [state.canSubmit, state.isSubmitting]}
					>
						{([canSubmit, isSubmitting]) => (
							<Button
								className="w-full"
								disabled={!canSubmit || isSubmitting}
								type="submit"
							>
								{isSubmitting ? t('common.loading') : t('auth.signIn')}
							</Button>
						)}
					</form.Subscribe>

					<FieldSeparator />

					<Button
						className="w-full"
						onClick={() =>
							authClient.signIn.social({
								provider: 'google',
								callbackURL: `${import.meta.env.VITE_WEB_URL}/dashboard`,
							})
						}
						type="button"
					>
						<HugeiconsIcon className="size-6 fill-white" icon={GoogleIcon} />
						<span className="sr-only">Sign in with Google</span>
					</Button>
				</FieldGroup>
			</form>

			<div className="mt-4 text-center">
				<Link className="text-indigo-600 hover:text-indigo-800" to="/register">
					{t('auth.noAccount')} {t('auth.signUp')}
				</Link>
			</div>
		</div>
	)
}
