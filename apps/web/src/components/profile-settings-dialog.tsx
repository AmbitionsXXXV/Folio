import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@folionote/ui/dialog'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { AvatarUploader } from '@/components/avatar-uploader'
import { useAvatarState } from '@/hooks/use-avatar-state'

type ProfileSettingsDialogProps = {
	/** Trigger element */
	children: React.ReactNode
	/** Whether to open the dialog */
	open?: boolean
	/** Callback when open state changes */
	onOpenChange?: (open: boolean) => void
}

/**
 * Profile settings dialog for updating user avatar and profile information.
 */
export function ProfileSettingsDialog({
	children,
	open,
	onOpenChange,
}: ProfileSettingsDialogProps) {
	const { t } = useTranslation()
	const { currentImageUrl, setLocalImageUrl, resetAvatarState, user } =
		useAvatarState()

	// Reset local state when dialog closes
	const handleOpenChange = useCallback(
		(newOpen: boolean) => {
			if (!newOpen) {
				resetAvatarState()
			}
			onOpenChange?.(newOpen)
		},
		[onOpenChange, resetAvatarState]
	)

	return (
		<Dialog onOpenChange={handleOpenChange} open={open}>
			<DialogTrigger>{children}</DialogTrigger>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>{t('profile.settings', 'Profile Settings')}</DialogTitle>
					<DialogDescription>
						{t(
							'profile.settingsDescription',
							'Update your profile picture and information.'
						)}
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col items-center gap-6 py-4">
					{/* Avatar uploader */}
					<AvatarUploader
						currentImageUrl={currentImageUrl}
						onAvatarChange={setLocalImageUrl}
						size="lg"
						userName={user?.name}
					/>

					{/* User info display */}
					<div className="w-full space-y-4 text-center">
						<div>
							<p className="font-medium text-lg">{user?.name}</p>
							<p className="text-muted-foreground text-sm">{user?.email}</p>
						</div>
					</div>

					{/* Help text */}
					<p className="text-center text-muted-foreground text-xs">
						{t(
							'profile.avatarHelp',
							'Click or drag an image to upload. Supported formats: JPEG, PNG, GIF, WebP. Max size: 3MB.'
						)}
					</p>
				</div>
			</DialogContent>
		</Dialog>
	)
}

export default ProfileSettingsDialog
