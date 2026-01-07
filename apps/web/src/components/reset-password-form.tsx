import {
	ArrowLeft02Icon,
	CheckmarkCircle02Icon,
	SecurityLockIcon,
	ViewIcon,
	ViewOffSlashIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useForm } from '@tanstack/react-form'
import { Link, useNavigate, useSearch } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import z from 'zod'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { authClient } from '@/lib/auth-client'
import { prettifyFormErrors } from '@/lib/form-error'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Spinner } from './ui/spinner'

const PASSWORD_MIN_LENGTH = 8

/**
 * Renders the reset password form and handles password reset.
 *
 * Validates new password input, submits reset request with token from URL,
 * and shows success message before redirecting to login.
 *
 * @returns The React element for the reset password form.
 */
export default function ResetPasswordForm() {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const search = useSearch({ strict: false }) as { token?: string }
	const [showPassword, setShowPassword] = useState(false)
	const [showConfirmPassword, setShowConfirmPassword] = useState(false)
	const [resetSuccess, setResetSuccess] = useState(false)

	const token = search.token

	const resetPasswordSchema = useMemo(
		() =>
			z
				.object({
					password: z
						.string()
						.min(1, t('auth.passwordRequired'))
						.min(PASSWORD_MIN_LENGTH, t('auth.passwordTooShort')),
					confirmPassword: z.string().min(1, t('auth.confirmPasswordRequired')),
				})
				.refine((data) => data.password === data.confirmPassword, {
					message: t('auth.passwordsDoNotMatch'),
					path: ['confirmPassword'],
				}),
		[t]
	)

	const form = useForm({
		defaultValues: {
			password: '',
			confirmPassword: '',
		},
		validators: {
			onSubmit: resetPasswordSchema,
		},
		onSubmit: async ({ value }) => {
			if (!token) {
				toast.error(t('auth.invalidResetToken'))
				return
			}

			const { error } = await authClient.resetPassword({
				newPassword: value.password,
				token,
			})

			if (error) {
				if (import.meta.env.DEV) {
					console.warn('[ResetPassword] Auth error:', error.message)
				}
				toast.error(error.message || t('auth.resetPasswordFailed'))
				return
			}

			setResetSuccess(true)
			toast.success(t('auth.passwordResetSuccess'))
		},
		onSubmitInvalid: ({ formApi }) => {
			if (import.meta.env.DEV) {
				const errors = formApi.state.errors
				if (errors.length > 0) {
					console.warn('[ResetPassword] Form validation failed:')
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

	// No token provided
	if (!token) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-linear-to-br from-background to-muted/20 px-4 py-6 sm:px-6 sm:py-10">
				<div className="w-full max-w-md">
					<div className="mb-8 text-center">
						<div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-destructive shadow-lg">
							<HugeiconsIcon
								className="size-8 text-destructive-foreground"
								icon={SecurityLockIcon}
							/>
						</div>
						<h1 className="mb-2 font-bold text-3xl">{t('auth.invalidLink')}</h1>
						<p className="text-muted-foreground text-sm">
							{t('auth.invalidLinkDescription')}
						</p>
					</div>

					<div className="rounded-2xl border bg-card p-8 shadow-xl dark:border-border/50 dark:bg-card/50">
						<div className="space-y-4 text-center">
							<Link className="block" to="/forgot-password">
								<Button className="w-full" variant="default">
									{t('auth.requestNewLink')}
								</Button>
							</Link>

							<Link
								className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
								to="/login"
							>
								<HugeiconsIcon className="size-4" icon={ArrowLeft02Icon} />
								{t('auth.backToSignIn')}
							</Link>
						</div>
					</div>
				</div>
			</div>
		)
	}

	// Password reset success
	if (resetSuccess) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-linear-to-br from-background to-muted/20 px-4 py-6 sm:px-6 sm:py-10">
				<div className="w-full max-w-md">
					<div className="mb-8 text-center">
						<div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-green-500 shadow-lg">
							<HugeiconsIcon
								className="size-8 text-white"
								icon={CheckmarkCircle02Icon}
							/>
						</div>
						<h1 className="mb-2 font-bold text-3xl">
							{t('auth.passwordResetComplete')}
						</h1>
						<p className="text-muted-foreground text-sm">
							{t('auth.passwordResetCompleteDescription')}
						</p>
					</div>

					<div className="rounded-2xl border bg-card p-8 shadow-xl dark:border-border/50 dark:bg-card/50">
						<Button className="w-full" onClick={() => navigate({ to: '/login' })}>
							{t('auth.signIn')}
						</Button>
					</div>
				</div>
			</div>
		)
	}

	return (
		<div className="flex min-h-screen items-center justify-center bg-linear-to-br from-background to-muted/20 px-4 py-6 sm:px-6 sm:py-10">
			<div className="w-full max-w-md">
				{/* Branding Section */}
				<div className="mb-8 text-center">
					<div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
						<HugeiconsIcon
							className="size-8 text-primary-foreground"
							icon={SecurityLockIcon}
						/>
					</div>
					<h1 className="mb-2 font-bold text-3xl">{t('auth.resetPasswordTitle')}</h1>
					<p className="text-muted-foreground text-sm">
						{t('auth.resetPasswordSubtitle')}
					</p>
				</div>

				{/* Card Container */}
				<div className="rounded-2xl border bg-card p-8 shadow-xl dark:border-border/50 dark:bg-card/50">
					<form
						id="reset-password-form"
						onSubmit={(e) => {
							e.preventDefault()
							e.stopPropagation()
							form.handleSubmit()
						}}
					>
						<FieldGroup className="gap-5">
							{/* Password Field */}
							<form.Field
								name="password"
								validators={{
									onBlur: z
										.string()
										.min(1, t('auth.passwordRequired'))
										.min(PASSWORD_MIN_LENGTH, t('auth.passwordTooShort')),
								}}
							>
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid
									return (
										<Field data-invalid={isInvalid || undefined}>
											<FieldLabel htmlFor={field.name}>
												{t('auth.newPassword')}
											</FieldLabel>
											<div className="relative">
												<HugeiconsIcon
													className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
													icon={SecurityLockIcon}
												/>
												<Input
													aria-invalid={isInvalid}
													autoComplete="new-password"
													className="pr-10 pl-10 transition-all duration-200 hover:border-primary/50"
													id={field.name}
													name={field.name}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													placeholder={t('auth.newPasswordPlaceholder')}
													type={showPassword ? 'text' : 'password'}
													value={field.state.value}
												/>
												<button
													aria-label={
														showPassword ? 'Hide password' : 'Show password'
													}
													className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
													onClick={() => setShowPassword(!showPassword)}
													type="button"
												>
													<HugeiconsIcon
														className="size-4"
														icon={showPassword ? ViewOffSlashIcon : ViewIcon}
													/>
												</button>
											</div>
											{isInvalid && <FieldError errors={field.state.meta.errors} />}
										</Field>
									)
								}}
							</form.Field>

							{/* Confirm Password Field */}
							<form.Field
								name="confirmPassword"
								validators={{
									onBlur: z.string().min(1, t('auth.confirmPasswordRequired')),
								}}
							>
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid
									return (
										<Field data-invalid={isInvalid || undefined}>
											<FieldLabel htmlFor={field.name}>
												{t('auth.confirmPassword')}
											</FieldLabel>
											<div className="relative">
												<HugeiconsIcon
													className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
													icon={SecurityLockIcon}
												/>
												<Input
													aria-invalid={isInvalid}
													autoComplete="new-password"
													className="pr-10 pl-10 transition-all duration-200 hover:border-primary/50"
													id={field.name}
													name={field.name}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													placeholder={t('auth.confirmPasswordPlaceholder')}
													type={showConfirmPassword ? 'text' : 'password'}
													value={field.state.value}
												/>
												<button
													aria-label={
														showConfirmPassword ? 'Hide password' : 'Show password'
													}
													className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
													onClick={() =>
														setShowConfirmPassword(!showConfirmPassword)
													}
													type="button"
												>
													<HugeiconsIcon
														className="size-4"
														icon={showConfirmPassword ? ViewOffSlashIcon : ViewIcon}
													/>
												</button>
											</div>
											{isInvalid && <FieldError errors={field.state.meta.errors} />}
										</Field>
									)
								}}
							</form.Field>

							{/* Password Requirements Hint */}
							<p className="-mt-3 text-muted-foreground text-xs">
								{t('auth.passwordRequirements')}
							</p>

							{/* Submit Button */}
							<form.Subscribe
								selector={(state) => [state.canSubmit, state.isSubmitting]}
							>
								{([canSubmit, isSubmitting]) => (
									<Button
										className="w-full gap-2 transition-all duration-200 hover:shadow-md active:scale-95"
										disabled={!canSubmit || isSubmitting}
										type="submit"
									>
										{isSubmitting && <Spinner className="size-4" />}
										{isSubmitting
											? t('auth.resettingPassword')
											: t('auth.resetPassword')}
									</Button>
								)}
							</form.Subscribe>
						</FieldGroup>
					</form>

					{/* Back to Login Link */}
					<div className="mt-6 text-center text-sm">
						<Link
							className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
							to="/login"
						>
							<HugeiconsIcon className="size-4" icon={ArrowLeft02Icon} />
							{t('auth.backToSignIn')}
						</Link>
					</div>
				</div>
			</div>
		</div>
	)
}
