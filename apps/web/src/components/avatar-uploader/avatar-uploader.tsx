import {
	AVATAR_CROPPER_MAX_ZOOM,
	AVATAR_CROPPER_MIN_ZOOM,
	AVATAR_CROPPER_ZOOM_STEP,
} from '@folionote/constants'
import {
	Alert01Icon,
	Cancel01Icon,
	Delete02Icon,
	Edit02Icon,
	Image01Icon,
	ImageUploadIcon,
	Tick01Icon,
	Time02Icon,
	UserCircleIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useCallback, useRef, useState } from 'react'
import Cropper from 'react-easy-crop'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog'
import { Slider } from '@/components/ui/slider'
import { Spinner } from '@/components/ui/spinner'
import { cn } from '@/lib/utils'
import {
	useAvatarCropper,
	useAvatarDelete,
	useAvatarRateLimit,
	useAvatarUpload,
	useAvatarValidation,
} from './hooks'
import type { AvatarSizeConfig, AvatarUploaderProps } from './types'
import { getInitials } from './utils'

/**
 * Size configurations for avatar display
 */
const SIZE_CONFIG: Record<'default' | 'sm' | 'lg', AvatarSizeConfig> = {
	default: {
		avatar: 'size-16',
		icon: 'size-6',
	},
	sm: {
		avatar: 'size-24',
		icon: 'size-10',
	},
	lg: {
		avatar: 'size-32',
		icon: 'size-12',
	},
}

/**
 * Avatar uploader component with preview, upload, crop, and delete functionality.
 */
export function AvatarUploader({
	currentImageUrl,
	userName,
	size = 'lg',
	readonly = false,
	onAvatarChange,
	className,
	avatarClassName,
}: AvatarUploaderProps) {
	const { t } = useTranslation()
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [isDragging, setIsDragging] = useState(false)
	const [actionDialogOpen, setActionDialogOpen] = useState(false)
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

	// Rate limiting
	const { rateLimitStatus, refetchRateLimit, countdown, isRateLimited } =
		useAvatarRateLimit()

	// Upload mutation
	const { uploadMutation, previewUrl, setPreviewUrl } = useAvatarUpload(
		onAvatarChange,
		refetchRateLimit
	)

	// Delete mutation
	const { deleteMutation } = useAvatarDelete(onAvatarChange, refetchRateLimit)

	// Cropper
	const {
		cropDialogOpen,
		setCropDialogOpen,
		cropImageSrc,
		crop,
		setCrop,
		zoom,
		setZoom,
		onCropComplete,
		handleCropConfirm,
		handleCropCancel,
		openCropper,
	} = useAvatarCropper(uploadMutation, setPreviewUrl)

	// Validation
	const { validateFile, config } = useAvatarValidation()

	const isUploading = uploadMutation.isPending
	const isDeleting = deleteMutation.isPending
	const isLoading = isUploading || isDeleting
	const sizes = SIZE_CONFIG[size ?? 'default']
	const displayUrl = previewUrl || currentImageUrl

	// Handle file selection
	const handleFileSelect = useCallback(
		(file: File) => {
			if (isRateLimited) {
				const seconds =
					countdown ?? Math.ceil((rateLimitStatus?.resetInMs ?? 0) / 1000)
				toast.error(
					t(
						'avatar.rateLimited',
						'Too many update attempts. Please try again in {{seconds}} seconds.',
						{ seconds }
					)
				)
				return
			}

			const error = validateFile(file)
			if (error) {
				toast.error(error)
				return
			}

			openCropper(file)
		},
		[
			validateFile,
			isRateLimited,
			countdown,
			rateLimitStatus?.resetInMs,
			t,
			openCropper,
		]
	)

	// Handle file input change
	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0]
			if (file) {
				handleFileSelect(file)
			}
			e.target.value = ''
		},
		[handleFileSelect]
	)

	// Handle drag events
	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		setIsDragging(true)
	}, [])

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		e.preventDefault()
		e.stopPropagation()
		setIsDragging(false)
	}, [])

	const handleDrop = useCallback(
		(e: React.DragEvent) => {
			e.preventDefault()
			e.stopPropagation()
			setIsDragging(false)

			const file = e.dataTransfer.files[0]
			if (file) {
				handleFileSelect(file)
			}
		},
		[handleFileSelect]
	)

	// Handle click
	const handleClick = useCallback(() => {
		if (readonly || isLoading) {
			return
		}
		if (displayUrl) {
			setActionDialogOpen(true)
		} else {
			fileInputRef.current?.click()
		}
	}, [readonly, isLoading, displayUrl])

	// Handle reupload
	const handleReupload = useCallback(() => {
		setActionDialogOpen(false)
		fileInputRef.current?.click()
	}, [])

	// Handle delete click
	const handleDeleteClick = useCallback(() => {
		setActionDialogOpen(false)
		setDeleteDialogOpen(true)
	}, [])

	// Handle delete confirm
	const handleDeleteConfirm = useCallback(() => {
		deleteMutation.mutate()
		setDeleteDialogOpen(false)
	}, [deleteMutation])

	return (
		<div className={cn('relative inline-block', className)}>
			{/* Hidden file input */}
			<input
				accept={config?.allowedTypes.join(',')}
				className="hidden"
				onChange={handleInputChange}
				ref={fileInputRef}
				type="file"
			/>

			{/* Avatar with click/drag zone */}
			<button
				className={cn(
					'group relative cursor-pointer rounded-full border-none bg-transparent p-0 transition-all',
					isDragging && 'ring-2 ring-primary ring-offset-2',
					readonly && 'cursor-default'
				)}
				disabled={readonly}
				onClick={handleClick}
				onDragLeave={handleDragLeave}
				onDragOver={handleDragOver}
				onDrop={handleDrop}
				type="button"
			>
				<Avatar className={cn('rounded-full', avatarClassName)} size={size}>
					{displayUrl ? (
						<AvatarImage alt={userName || 'Avatar'} src={displayUrl} />
					) : null}
					<AvatarFallback className="bg-primary/10 text-primary">
						{userName ? (
							<span className="font-medium">{getInitials(userName)}</span>
						) : (
							<HugeiconsIcon className={sizes.icon} icon={UserCircleIcon} />
						)}
					</AvatarFallback>
				</Avatar>

				{/* Overlay for hover state - only show when no avatar */}
				{!(displayUrl || readonly || isLoading) && (
					<div
						className={cn(
							'absolute inset-0 flex items-center justify-center rounded-full bg-black/10 opacity-0 transition-opacity',
							'group-hover:opacity-100 group-focus-visible:opacity-100'
						)}
					>
						<HugeiconsIcon
							className="size-8 text-primary/60"
							icon={ImageUploadIcon}
						/>
					</div>
				)}

				{/* Loading overlay */}
				{isLoading && (
					<div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
						<Spinner className="size-8 text-white" />
					</div>
				)}
			</button>

			{/* Avatar Action Dialog */}
			<Dialog onOpenChange={setActionDialogOpen} open={actionDialogOpen}>
				<DialogContent className="max-w-xl sm:max-w-xs">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<HugeiconsIcon className="size-5" icon={Edit02Icon} />
							{t('avatar.actions', 'Avatar Actions')}
						</DialogTitle>
						<DialogDescription>
							{t('avatar.actionsDescription', 'Choose an action for your avatar.')}
						</DialogDescription>
					</DialogHeader>

					{/* Rate limit warning */}
					{isRateLimited && countdown !== null && (
						<div className="flex items-center gap-2 rounded-md bg-amber-50 p-3 text-amber-800 text-sm dark:bg-amber-950/30 dark:text-amber-200">
							<HugeiconsIcon className="size-4 shrink-0" icon={Time02Icon} />
							<span>
								{t(
									'avatar.rateLimitedWait',
									'Update limit reached. Please wait {{seconds}}s.',
									{ seconds: countdown }
								)}
							</span>
						</div>
					)}

					{/* Rate limit status indicator */}
					{rateLimitStatus && !isRateLimited && (
						<div className="flex items-center gap-2 text-muted-foreground text-xs">
							<HugeiconsIcon className="size-3" icon={Time02Icon} />
							<span>
								{t(
									'avatar.remainingUploads',
									'{{remaining}}/{{limit}} updates remaining',
									{
										remaining: rateLimitStatus.remaining,
										limit: rateLimitStatus.limit,
									}
								)}
							</span>
						</div>
					)}

					<div className="grid grid-cols-2 gap-2">
						<Button
							className="w-full justify-start"
							disabled={isRateLimited}
							onClick={handleReupload}
							type="button"
							variant="outline"
						>
							<HugeiconsIcon className="mr-2 size-4" icon={ImageUploadIcon} />
							{t('avatar.reupload', 'Upload')}
						</Button>
						<Button
							className="w-full justify-start"
							onClick={handleDeleteClick}
							type="button"
							variant="destructive"
						>
							<HugeiconsIcon className="mr-2 size-4" icon={Delete02Icon} />
							{t('avatar.delete', 'Delete')}
						</Button>
					</div>
				</DialogContent>
			</Dialog>

			{/* Image Cropper Dialog */}
			<Dialog onOpenChange={setCropDialogOpen} open={cropDialogOpen}>
				<DialogContent className="sm:max-w-lg">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<HugeiconsIcon className="size-5" icon={Image01Icon} />
							{t('avatar.cropTitle', 'Crop Avatar')}
						</DialogTitle>
						<DialogDescription>
							{t(
								'avatar.cropDescription',
								'Drag to reposition and use the slider to zoom. The image will be cropped to a circle.'
							)}
						</DialogDescription>
					</DialogHeader>

					{/* Cropper area */}
					<div className="relative h-72 w-full overflow-hidden rounded-lg bg-muted">
						{cropImageSrc && (
							<Cropper
								aspect={1}
								crop={crop}
								cropShape="round"
								image={cropImageSrc}
								onCropChange={setCrop}
								onCropComplete={onCropComplete}
								onZoomChange={setZoom}
								showGrid={false}
								zoom={zoom}
							/>
						)}
					</div>

					{/* Zoom slider */}
					<div className="flex items-center gap-4 px-2">
						<span className="text-muted-foreground text-sm">
							{t('avatar.zoom', 'Zoom')}
						</span>
						<Slider
							className="w-32"
							max={AVATAR_CROPPER_MAX_ZOOM}
							min={AVATAR_CROPPER_MIN_ZOOM}
							onValueChange={(value) => {
								const newZoom = Array.isArray(value) ? value[0] : value
								setZoom(newZoom ?? 1)
							}}
							step={AVATAR_CROPPER_ZOOM_STEP}
							value={[zoom]}
						/>
						<span className="w-12 text-right text-muted-foreground text-sm">
							{Math.round(zoom * 100)}%
						</span>
					</div>

					<DialogFooter>
						<Button onClick={handleCropCancel} type="button" variant="outline">
							<HugeiconsIcon className="mr-2 size-4" icon={Cancel01Icon} />
							{t('common.cancel', 'Cancel')}
						</Button>
						<Button
							disabled={uploadMutation.isPending}
							onClick={handleCropConfirm}
							type="button"
						>
							{uploadMutation.isPending ? (
								<Spinner className="mr-2 size-4" />
							) : (
								<HugeiconsIcon className="mr-2 size-4" icon={Tick01Icon} />
							)}
							{uploadMutation.isPending
								? t('avatar.uploading', 'Uploading...')
								: t('avatar.cropAndUpload', 'Crop & Upload')}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>

			{/* Delete Confirmation Dialog */}
			<AlertDialog onOpenChange={setDeleteDialogOpen} open={deleteDialogOpen}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle className="flex items-center gap-2">
							<HugeiconsIcon
								className="size-5 text-destructive"
								icon={Alert01Icon}
							/>
							{t('avatar.deleteTitle', 'Delete Avatar')}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{t(
								'avatar.deleteConfirmation',
								'Are you sure you want to delete your avatar? This action cannot be undone.'
							)}
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>{t('common.cancel', 'Cancel')}</AlertDialogCancel>
						<AlertDialogAction
							className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
							onClick={handleDeleteConfirm}
						>
							{deleteMutation.isPending ? (
								<Spinner className="mr-2 size-4" />
							) : (
								<HugeiconsIcon className="mr-2 size-4" icon={Delete02Icon} />
							)}
							{deleteMutation.isPending
								? t('avatar.deleting', 'Deleting...')
								: t('avatar.delete', 'Delete')}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</div>
	)
}

export default AvatarUploader
