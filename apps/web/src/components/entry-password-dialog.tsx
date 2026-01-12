import { getPasswordStrength } from '@folionote/utils'
import {
	CheckmarkCircle02Icon,
	LockPasswordIcon,
	SquareUnlock01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useForm } from '@tanstack/react-form'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import z from 'zod'
import { cn } from '@/lib/utils'
import { orpc } from '@/utils/orpc'
import { ConfirmDeleteDialog } from './confirm-delete-dialog'
import { Button } from './ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from './ui/dialog'
import { Field, FieldError, FieldGroup, FieldLabel } from './ui/field'
import { Input } from './ui/input'
import { Spinner } from './ui/spinner'

// 密码强度指示器的稳定 ID
const STRENGTH_BAR_IDS = ['bar-1', 'bar-2', 'bar-3', 'bar-4'] as const

type PasswordStrengthIndicatorProps = {
	password: string
}

/**
 * 密码强度指示器
 */
function PasswordStrengthIndicator({ password }: PasswordStrengthIndicatorProps) {
	const { t } = useTranslation()
	const strength = useMemo(() => getPasswordStrength(password), [password])

	if (!password) return null

	const strengthLabels = [
		t('privacy.strengthWeak'),
		t('privacy.strengthFair'),
		t('privacy.strengthGood'),
		t('privacy.strengthStrong'),
		t('privacy.strengthVeryStrong'),
	]

	const strengthColors = [
		'bg-destructive',
		'bg-orange-500',
		'bg-amber-500',
		'bg-green-500',
		'bg-green-600',
	]

	return (
		<div aria-live="polite" className="space-y-1.5" role="status">
			<div className="flex gap-1">
				{STRENGTH_BAR_IDS.map((id, index) => (
					<div
						className={cn(
							'h-1 flex-1 rounded-full',
							index < strength ? strengthColors[strength] : 'bg-muted'
						)}
						key={id}
					/>
				))}
			</div>
			<p className="text-muted-foreground text-xs">{strengthLabels[strength]}</p>
		</div>
	)
}

type EntryPasswordDialogProps = {
	entryId: string
	open: boolean
	onOpenChange: (open: boolean) => void
}

/**
 * Dialog for setting or removing password protection on an entry
 */
export function EntryPasswordDialog({
	entryId,
	open,
	onOpenChange,
}: EntryPasswordDialogProps) {
	const { t } = useTranslation()
	const queryClient = useQueryClient()
	const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)

	// 构建密码验证 schema
	const passwordSchema = useMemo(
		() =>
			z
				.object({
					password: z.string().min(4, t('privacy.minLength')),
					confirmPassword: z.string(),
				})
				.refine((data) => data.password === data.confirmPassword, {
					message: t('privacy.passwordMismatch'),
					path: ['confirmPassword'],
				}),
		[t]
	)

	// Check if entry has password
	const { data: passwordStatus, isLoading } = useQuery({
		queryKey: ['entry-password', entryId],
		queryFn: () => orpc.entries.checkPassword.call({ id: entryId }),
		enabled: open,
	})

	// Set password mutation
	const setPasswordMutation = useMutation({
		mutationFn: (newPassword: string) =>
			orpc.entries.setPassword.call({ id: entryId, password: newPassword }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['entry-password', entryId] })
			queryClient.invalidateQueries({ queryKey: ['entries', entryId] })
			toast.success(t('privacy.passwordSet'))
			onOpenChange(false)
		},
		onError: () => {
			toast.error(t('privacy.setPasswordError'))
		},
	})

	// Remove password mutation
	const removePasswordMutation = useMutation({
		mutationFn: () => orpc.entries.removePassword.call({ id: entryId }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['entry-password', entryId] })
			queryClient.invalidateQueries({ queryKey: ['entries', entryId] })
			toast.success(t('privacy.passwordRemoved'))
			onOpenChange(false)
		},
		onError: () => {
			toast.error(t('privacy.removePasswordError'))
		},
	})

	// TanStack Form 实例
	const form = useForm({
		defaultValues: {
			password: '',
			confirmPassword: '',
		},
		validators: {
			onSubmit: passwordSchema,
		},
		onSubmit: ({ value }) => {
			setPasswordMutation.mutate(value.password)
		},
	})

	// Reset form when dialog opens/closes
	useEffect(() => {
		if (open) {
			form.reset()
		}
	}, [open, form])

	const handleRemovePassword = useCallback(() => {
		setShowRemoveConfirm(true)
	}, [])

	const handleConfirmRemovePassword = useCallback(() => {
		removePasswordMutation.mutate()
		setShowRemoveConfirm(false)
	}, [removePasswordMutation])

	const hasPassword = passwordStatus?.hasPassword ?? false

	// Render loading state
	const renderLoading = () => (
		<div
			aria-busy="true"
			aria-label={t('common.loading')}
			className="flex items-center justify-center py-8"
			role="status"
		>
			<div className="flex flex-col items-center gap-3">
				<Spinner className="size-6" />
				<span className="text-muted-foreground text-sm">{t('common.loading')}</span>
			</div>
		</div>
	)

	// Render form for entry with existing password
	const renderHasPassword = () => (
		<form
			onSubmit={(e) => {
				e.preventDefault()
				e.stopPropagation()
				form.handleSubmit()
			}}
		>
			<FieldGroup className="gap-4">
				<div
					className="flex items-center gap-3 rounded-lg border border-amber-200/50 bg-amber-50/50 p-4 dark:border-amber-800/50 dark:bg-amber-950/30"
					role="status"
				>
					<HugeiconsIcon
						className="size-5 shrink-0 text-amber-600 dark:text-amber-400"
						icon={LockPasswordIcon}
					/>
					<p className="text-amber-800 text-sm dark:text-amber-200">
						{t('privacy.currentlyProtected')}
					</p>
				</div>

				{/* 新密码字段 */}
				<form.Field
					name="password"
					validators={{
						onBlur: z.string().min(4, t('privacy.minLength')),
					}}
				>
					{(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
						return (
							<Field data-invalid={isInvalid || undefined}>
								<FieldLabel htmlFor={field.name}>
									{t('privacy.newPassword')}
								</FieldLabel>
								<Input
									autoComplete="new-password"
									id={field.name}
									minLength={4}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder={t('privacy.passwordPlaceholder')}
									type="password"
									value={field.state.value}
								/>
								<PasswordStrengthIndicator password={field.state.value} />
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						)
					}}
				</form.Field>

				{/* 确认密码字段 */}
				<form.Subscribe selector={(state) => state.values.password}>
					{(password) =>
						password.length > 0 && (
							<form.Field
								name="confirmPassword"
								validators={{
									onChangeListenTo: ['password'],
									onChange: ({ value, fieldApi }) => {
										if (value && fieldApi.form.getFieldValue('password') !== value) {
											return t('privacy.passwordMismatch')
										}
										return undefined
									},
								}}
							>
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid
									const passwordsMatch =
										field.state.value === form.getFieldValue('password') &&
										field.state.value.length > 0
									return (
										<Field data-invalid={isInvalid || undefined}>
											<FieldLabel htmlFor={field.name}>
												{t('privacy.confirmPassword')}
											</FieldLabel>
											<div className="relative">
												<Input
													autoComplete="new-password"
													className={cn(
														'pr-10',
														passwordsMatch &&
															'border-green-500 focus-visible:border-green-500 focus-visible:ring-green-500/30'
													)}
													id={field.name}
													name={field.name}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													placeholder={t('privacy.confirmPlaceholder')}
													type="password"
													value={field.state.value}
												/>
												{passwordsMatch && (
													<HugeiconsIcon
														className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-green-500"
														icon={CheckmarkCircle02Icon}
													/>
												)}
											</div>
											{isInvalid && <FieldError errors={field.state.meta.errors} />}
										</Field>
									)
								}}
							</form.Field>
						)
					}
				</form.Subscribe>

				<DialogFooter className="flex-col gap-2 sm:flex-row">
					<Button
						className="w-full sm:w-auto"
						disabled={removePasswordMutation.isPending}
						onClick={handleRemovePassword}
						type="button"
						variant="outline"
					>
						<HugeiconsIcon className="mr-2 size-4" icon={SquareUnlock01Icon} />
						{t('privacy.removePassword')}
					</Button>
					<form.Subscribe
						selector={(state) => [state.canSubmit, state.isSubmitting]}
					>
						{([canSubmit, isSubmitting]) => (
							<Button
								className="w-full gap-2 sm:w-auto"
								disabled={
									!canSubmit || isSubmitting || setPasswordMutation.isPending
								}
								type="submit"
							>
								{(isSubmitting || setPasswordMutation.isPending) && (
									<Spinner className="size-4" />
								)}
								<HugeiconsIcon className="size-4" icon={LockPasswordIcon} />
								{t('privacy.changePassword')}
							</Button>
						)}
					</form.Subscribe>
				</DialogFooter>
			</FieldGroup>
		</form>
	)

	// Render form for entry without password
	const renderNoPassword = () => (
		<form
			onSubmit={(e) => {
				e.preventDefault()
				e.stopPropagation()
				form.handleSubmit()
			}}
		>
			<FieldGroup className="gap-4">
				{/* 密码字段 */}
				<form.Field
					name="password"
					validators={{
						onBlur: z.string().min(4, t('privacy.minLength')),
					}}
				>
					{(field) => {
						const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid
						return (
							<Field data-invalid={isInvalid || undefined}>
								<FieldLabel htmlFor={field.name}>{t('privacy.password')}</FieldLabel>
								<Input
									autoComplete="new-password"
									id={field.name}
									minLength={4}
									name={field.name}
									onBlur={field.handleBlur}
									onChange={(e) => field.handleChange(e.target.value)}
									placeholder={t('privacy.passwordPlaceholder')}
									type="password"
									value={field.state.value}
								/>
								<PasswordStrengthIndicator password={field.state.value} />
								{isInvalid && <FieldError errors={field.state.meta.errors} />}
							</Field>
						)
					}}
				</form.Field>

				{/* 确认密码字段 */}
				<form.Subscribe selector={(state) => state.values.password}>
					{(password) =>
						password.length >= 4 && (
							<form.Field
								name="confirmPassword"
								validators={{
									onChangeListenTo: ['password'],
									onChange: ({ value, fieldApi }) => {
										if (value && fieldApi.form.getFieldValue('password') !== value) {
											return t('privacy.passwordMismatch')
										}
										return undefined
									},
								}}
							>
								{(field) => {
									const isInvalid =
										field.state.meta.isTouched && !field.state.meta.isValid
									const passwordsMatch =
										field.state.value === form.getFieldValue('password') &&
										field.state.value.length > 0
									return (
										<Field data-invalid={isInvalid || undefined}>
											<FieldLabel htmlFor={field.name}>
												{t('privacy.confirmPassword')}
											</FieldLabel>
											<div className="relative">
												<Input
													autoComplete="new-password"
													className={cn(
														'pr-10',
														passwordsMatch &&
															'border-green-500 focus-visible:border-green-500 focus-visible:ring-green-500/30'
													)}
													id={field.name}
													name={field.name}
													onBlur={field.handleBlur}
													onChange={(e) => field.handleChange(e.target.value)}
													placeholder={t('privacy.confirmPlaceholder')}
													type="password"
													value={field.state.value}
												/>
												{passwordsMatch && (
													<HugeiconsIcon
														className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-green-500"
														icon={CheckmarkCircle02Icon}
													/>
												)}
											</div>
											{isInvalid && <FieldError errors={field.state.meta.errors} />}
										</Field>
									)
								}}
							</form.Field>
						)
					}
				</form.Subscribe>

				<DialogFooter>
					<Button
						onClick={() => onOpenChange(false)}
						type="button"
						variant="outline"
					>
						{t('common.cancel')}
					</Button>
					<form.Subscribe
						selector={(state) => [state.canSubmit, state.isSubmitting]}
					>
						{([canSubmit, isSubmitting]) => (
							<Button
								className="gap-2"
								disabled={
									!canSubmit || isSubmitting || setPasswordMutation.isPending
								}
								type="submit"
							>
								{(isSubmitting || setPasswordMutation.isPending) && (
									<Spinner className="size-4" />
								)}
								<HugeiconsIcon className="size-4" icon={LockPasswordIcon} />
								{t('privacy.setPassword')}
							</Button>
						)}
					</form.Subscribe>
				</DialogFooter>
			</FieldGroup>
		</form>
	)

	// Determine which content to render
	const renderContent = () => {
		if (isLoading) return renderLoading()
		if (hasPassword) return renderHasPassword()
		return renderNoPassword()
	}

	return (
		<>
			<Dialog onOpenChange={onOpenChange} open={open}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<HugeiconsIcon className="size-5" icon={LockPasswordIcon} />
							{t('privacy.title')}
						</DialogTitle>
						<DialogDescription>
							{hasPassword
								? t('privacy.changeOrRemove')
								: t('privacy.setDescription')}
						</DialogDescription>
					</DialogHeader>

					{renderContent()}
				</DialogContent>
			</Dialog>

			<ConfirmDeleteDialog
				cancelText={t('common.cancel')}
				confirmText={t('privacy.removePassword')}
				description={t('privacy.removeConfirm')}
				isLoading={removePasswordMutation.isPending}
				onConfirm={handleConfirmRemovePassword}
				onOpenChange={setShowRemoveConfirm}
				open={showRemoveConfirm}
				title={t('privacy.removePassword')}
			/>
		</>
	)
}
