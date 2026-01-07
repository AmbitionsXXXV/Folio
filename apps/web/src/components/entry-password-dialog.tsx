import { LockPasswordIcon, SquareUnlock01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
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
import { Input } from './ui/input'
import { Label } from './ui/label'

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

	const [password, setPassword] = useState('')
	const [confirmPassword, setConfirmPassword] = useState('')
	const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)

	// Check if entry has password
	const { data: passwordStatus, isLoading } = useQuery({
		queryKey: ['entry-password', entryId],
		queryFn: () => orpc.entries.checkPassword.call({ id: entryId }),
		enabled: open,
	})

	// Reset form when dialog opens/closes
	useEffect(() => {
		if (open) {
			setPassword('')
			setConfirmPassword('')
		}
	}, [open])

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

	const handleSetPassword = useCallback(() => {
		if (password.length >= 4 && password === confirmPassword) {
			setPasswordMutation.mutate(password)
		}
	}, [password, confirmPassword, setPasswordMutation])

	const handleRemovePassword = useCallback(() => {
		setShowRemoveConfirm(true)
	}, [])

	const handleConfirmRemovePassword = useCallback(() => {
		removePasswordMutation.mutate()
		setShowRemoveConfirm(false)
	}, [removePasswordMutation])

	const passwordsMatch = password === confirmPassword
	const isValidPassword = password.length >= 4
	const hasPassword = passwordStatus?.hasPassword ?? false

	// Compute disabled state for set password button
	const canSetPassword = isValidPassword && passwordsMatch
	const isSetPasswordDisabled = !canSetPassword || setPasswordMutation.isPending

	// Render loading state
	const renderLoading = () => (
		<div className="py-8 text-center text-muted-foreground">
			{t('common.loading')}
		</div>
	)

	// Render form for entry with existing password
	const renderHasPassword = () => (
		<div className="space-y-4">
			<div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
				<p className="text-amber-800 text-sm dark:text-amber-200">
					{t('privacy.currentlyProtected')}
				</p>
			</div>

			<div className="space-y-4">
				<div className="space-y-2">
					<Label htmlFor="new-password">{t('privacy.newPassword')}</Label>
					<Input
						id="new-password"
						minLength={4}
						onChange={(e) => setPassword(e.target.value)}
						placeholder={t('privacy.passwordPlaceholder')}
						type="password"
						value={password}
					/>
				</div>

				{password.length > 0 && (
					<div className="space-y-2">
						<Label htmlFor="confirm-password">{t('privacy.confirmPassword')}</Label>
						<Input
							id="confirm-password"
							onChange={(e) => setConfirmPassword(e.target.value)}
							placeholder={t('privacy.confirmPlaceholder')}
							type="password"
							value={confirmPassword}
						/>
						{confirmPassword.length > 0 && !passwordsMatch && (
							<p className="text-destructive text-sm">
								{t('privacy.passwordMismatch')}
							</p>
						)}
					</div>
				)}
			</div>

			<DialogFooter className="flex-col gap-2 sm:flex-row">
				<Button
					className="w-full sm:w-auto"
					disabled={removePasswordMutation.isPending}
					onClick={handleRemovePassword}
					variant="outline"
				>
					<HugeiconsIcon className="mr-2 size-4" icon={SquareUnlock01Icon} />
					{t('privacy.removePassword')}
				</Button>
				<Button
					className="w-full sm:w-auto"
					disabled={isSetPasswordDisabled}
					onClick={handleSetPassword}
				>
					<HugeiconsIcon className="mr-2 size-4" icon={LockPasswordIcon} />
					{t('privacy.changePassword')}
				</Button>
			</DialogFooter>
		</div>
	)

	// Render form for entry without password
	const renderNoPassword = () => (
		<div className="space-y-4">
			<div className="space-y-2">
				<Label htmlFor="password">{t('privacy.password')}</Label>
				<Input
					id="password"
					minLength={4}
					onChange={(e) => setPassword(e.target.value)}
					placeholder={t('privacy.passwordPlaceholder')}
					type="password"
					value={password}
				/>
				{password.length > 0 && password.length < 4 && (
					<p className="text-muted-foreground text-sm">{t('privacy.minLength')}</p>
				)}
			</div>

			{password.length >= 4 && (
				<div className="space-y-2">
					<Label htmlFor="confirm-password">{t('privacy.confirmPassword')}</Label>
					<Input
						id="confirm-password"
						onChange={(e) => setConfirmPassword(e.target.value)}
						placeholder={t('privacy.confirmPlaceholder')}
						type="password"
						value={confirmPassword}
					/>
					{confirmPassword.length > 0 && !passwordsMatch && (
						<p className="text-destructive text-sm">
							{t('privacy.passwordMismatch')}
						</p>
					)}
				</div>
			)}

			<DialogFooter>
				<Button onClick={() => onOpenChange(false)} variant="outline">
					{t('common.cancel')}
				</Button>
				<Button disabled={isSetPasswordDisabled} onClick={handleSetPassword}>
					<HugeiconsIcon className="mr-2 size-4" icon={LockPasswordIcon} />
					{t('privacy.setPassword')}
				</Button>
			</DialogFooter>
		</div>
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
