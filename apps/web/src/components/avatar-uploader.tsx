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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
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
import { client } from '@/utils/orpc'

/** Target size for compressed images (in pixels) */
const TARGET_IMAGE_SIZE = 512
/** Target quality for JPEG compression (0-1) */
const TARGET_QUALITY = 0.85
/** Maximum file size after compression (2MB) */
const MAX_COMPRESSED_SIZE = 2 * 1024 * 1024

/** Regex for extracting file extension */
const FILE_EXTENSION_REGEX = /\.[^.]+$/

type CropArea = {
	x: number
	y: number
	width: number
	height: number
}

type AvatarUploaderProps = {
	/** Current avatar URL */
	currentImageUrl?: string | null
	/** User name for fallback display */
	userName?: string
	/** Size variant */
	size?: 'default' | 'sm' | 'lg'
	/** Whether the component is read-only */
	readonly?: boolean
	/** Callback when avatar is updated */
	onAvatarChange?: (newUrl: string | null) => void
	/** Additional class name */
	className?: string
	/** Additional class name for the avatar */
	avatarClassName?: string
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
	const queryClient = useQueryClient()
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [previewUrl, setPreviewUrl] = useState<string | null>(null)
	const [isDragging, setIsDragging] = useState(false)

	// Action dialog state (for edit/delete options)
	const [actionDialogOpen, setActionDialogOpen] = useState(false)

	// Delete confirmation dialog state
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)

	// Cropper state
	const [cropDialogOpen, setCropDialogOpen] = useState(false)
	const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
	const [crop, setCrop] = useState({ x: 0, y: 0 })
	const [zoom, setZoom] = useState(1)
	const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null)
	const [originalFile, setOriginalFile] = useState<File | null>(null)

	// Get avatar config (allowed types, max size)
	const { data: config } = useQuery({
		queryKey: ['storage', 'avatarConfig'],
		queryFn: () => client.storage.getAvatarConfig(),
		staleTime: Number.POSITIVE_INFINITY,
	})

	// Get rate limit status
	const { data: rateLimitStatus, refetch: refetchRateLimit } = useQuery({
		queryKey: ['storage', 'rateLimitStatus', 'update'],
		queryFn: () => client.storage.getRateLimitStatus({ action: 'update' }),
		staleTime: 10 * 1000, // Cache for 10 seconds
		refetchInterval: (query) => {
			// Countdown is handled locally; avoid frequent polling for long windows.
			const data = query.state.data
			if (data?.isLimited) {
				return 60 * 1000 // Every minute when limited
			}
			return 30 * 1000 // Every 30 seconds normally
		},
	})

	// Countdown timer for rate limit
	const [countdown, setCountdown] = useState<number | null>(null)

	useEffect(() => {
		if (!rateLimitStatus?.isLimited) {
			setCountdown(null)
			return
		}

		const updateCountdown = () => {
			const remaining = Math.max(
				0,
				Math.ceil((rateLimitStatus.resetAt - Date.now()) / 1000)
			)
			setCountdown(remaining)
			if (remaining === 0) {
				refetchRateLimit()
			}
		}

		updateCountdown()
		const interval = setInterval(updateCountdown, 1000)
		return () => clearInterval(interval)
	}, [rateLimitStatus?.isLimited, rateLimitStatus?.resetAt, refetchRateLimit])

	// Check if rate limited
	const isRateLimited = rateLimitStatus?.isLimited ?? false

	// Upload mutation
	const uploadMutation = useMutation({
		mutationFn: async (file: File) => {
			// Compress the image before uploading
			const compressedFile = await compressImage(file)
			// Convert file to base64
			const base64 = await fileToBase64(compressedFile)
			return client.storage.updateAvatar({
				fileData: base64,
				contentType: compressedFile.type as
					| 'image/jpeg'
					| 'image/png'
					| 'image/gif'
					| 'image/webp',
				filename: compressedFile.name,
			})
		},
		onSuccess: (data) => {
			toast.success(t('avatar.uploadSuccess', 'Avatar uploaded successfully'))
			setPreviewUrl(null)
			onAvatarChange?.(data.imageUrl)
			// Invalidate session to refresh user data
			queryClient.invalidateQueries({ queryKey: ['session'] })
			// Refresh rate limit status
			refetchRateLimit()
		},
		onError: (error) => {
			// Check if it's a rate limit error
			if (error.message.includes('Rate limit')) {
				refetchRateLimit()
			}
			toast.error(
				t('avatar.uploadError', 'Failed to upload avatar: {{message}}', {
					message: error.message,
				})
			)
			setPreviewUrl(null)
		},
	})

	// Delete mutation
	const deleteMutation = useMutation({
		mutationFn: () => client.storage.deleteAvatar(),
		onSuccess: () => {
			toast.success(t('avatar.deleteSuccess', 'Avatar deleted successfully'))
			onAvatarChange?.(null)
			// Invalidate session to refresh user data
			queryClient.invalidateQueries({ queryKey: ['session'] })
			// Refresh rate limit status
			refetchRateLimit()
		},
		onError: (error) => {
			// Check if it's a rate limit error
			if (error.message.includes('Rate limit')) {
				refetchRateLimit()
			}
			toast.error(
				t('avatar.deleteError', 'Failed to delete avatar: {{message}}', {
					message: error.message,
				})
			)
		},
	})

	const isUploading = uploadMutation.isPending
	const isDeleting = deleteMutation.isPending
	const isLoading = isUploading || isDeleting

	// Allowed avatar types for validation
	const allowedTypes = [
		'image/jpeg',
		'image/png',
		'image/gif',
		'image/webp',
	] as const

	type AllowedType = (typeof allowedTypes)[number]

	// Validate file
	const validateFile = useCallback(
		(file: File): string | null => {
			if (!config) return null

			if (!allowedTypes.includes(file.type as AllowedType)) {
				return t(
					'avatar.invalidType',
					'Invalid file type. Please use JPEG, PNG, GIF, or WebP.'
				)
			}

			if (file.size > config.maxSize) {
				return t(
					'avatar.fileTooLarge',
					'File is too large. Maximum size is {{size}}MB.',
					{
						size: config.maxSizeMB,
					}
				)
			}

			return null
		},
		[config, t]
	)

	// Handle crop complete
	const onCropComplete = useCallback(
		(_croppedArea: CropArea, croppedAreaPixels: CropArea) => {
			setCroppedAreaPixels(croppedAreaPixels)
		},
		[]
	)

	// Handle file selection - open cropper dialog instead of direct upload
	const handleFileSelect = useCallback(
		(file: File) => {
			// Check rate limit first
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

			// Create preview for cropper
			const imageUrl = URL.createObjectURL(file)
			setCropImageSrc(imageUrl)
			setOriginalFile(file)
			setCrop({ x: 0, y: 0 })
			setZoom(1)
			setCropDialogOpen(true)
		},
		[validateFile, isRateLimited, countdown, rateLimitStatus?.resetInMs, t]
	)

	// Handle crop confirm
	const handleCropConfirm = useCallback(async () => {
		if (!(cropImageSrc && croppedAreaPixels && originalFile)) return

		try {
			// Create cropped image
			const croppedFile = await getCroppedImage(
				cropImageSrc,
				croppedAreaPixels,
				originalFile.name
			)

			// Create preview
			const preview = URL.createObjectURL(croppedFile)
			setPreviewUrl(preview)

			// Close dialog and reset
			setCropDialogOpen(false)
			setCropImageSrc(null)
			setOriginalFile(null)

			// Upload
			uploadMutation.mutate(croppedFile)
		} catch {
			toast.error(t('avatar.cropError', 'Failed to crop image. Please try again.'))
		}
	}, [cropImageSrc, croppedAreaPixels, originalFile, uploadMutation, t])

	// Handle crop cancel
	const handleCropCancel = useCallback(() => {
		setCropDialogOpen(false)
		if (cropImageSrc) {
			URL.revokeObjectURL(cropImageSrc)
		}
		setCropImageSrc(null)
		setOriginalFile(null)
	}, [cropImageSrc])

	// Handle file input change
	const handleInputChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const file = e.target.files?.[0]
			if (file) {
				handleFileSelect(file)
			}
			// Reset input so same file can be selected again
			e.target.value = ''
		},
		[handleFileSelect]
	)

	// Size configurations
	const sizeConfig = {
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

	const sizes = sizeConfig[size ?? 'default']
	const displayUrl = previewUrl || currentImageUrl

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

	// Handle click - open action dialog if has avatar, otherwise open file picker
	const handleClick = useCallback(() => {
		if (readonly || isLoading) {
			return
		}
		// If has avatar, show action dialog with options
		if (displayUrl) {
			setActionDialogOpen(true)
		} else {
			// No avatar, directly open file picker
			fileInputRef.current?.click()
		}
	}, [readonly, isLoading, displayUrl])

	// Handle reupload action from dialog
	const handleReupload = useCallback(() => {
		setActionDialogOpen(false)
		fileInputRef.current?.click()
	}, [])

	// Handle delete action from dialog
	const handleDeleteClick = useCallback(() => {
		setActionDialogOpen(false)
		setDeleteDialogOpen(true)
	}, [])

	// Handle delete confirmation
	const handleDeleteConfirm = useCallback(() => {
		deleteMutation.mutate()
		setDeleteDialogOpen(false)
	}, [deleteMutation])

	// Get initials from name
	const getInitials = (name?: string) => {
		if (!name) return ''
		return name
			.split(' ')
			.map((part) => part[0])
			.join('')
			.toUpperCase()
			.slice(0, 2)
	}

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
							className="flex-1"
							max={3}
							min={1}
							onValueChange={(value) => {
								const newZoom = Array.isArray(value) ? value[0] : value
								setZoom(newZoom ?? 1)
							}}
							step={0.1}
							value={[zoom]}
						/>
						<span className="w-12 text-right text-muted-foreground text-sm">
							{Math.round(zoom * 100)}%
						</span>
					</div>

					<DialogFooter className="gap-2 sm:gap-0">
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

/**
 * Convert a File to base64 string (without the data URL prefix)
 */
function fileToBase64(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader()
		reader.onload = () => {
			const result = reader.result as string
			// Remove the data URL prefix (e.g., "data:image/png;base64,")
			const base64 = result.split(',')[1]
			if (base64) {
				resolve(base64)
			} else {
				reject(new Error('Failed to convert file to base64'))
			}
		}
		reader.onerror = () => reject(reader.error)
		reader.readAsDataURL(file)
	})
}

/**
 * Create an image element from a URL
 */
function createImage(url: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const image = new Image()
		image.addEventListener('load', () => resolve(image))
		image.addEventListener('error', (error) => reject(error))
		image.crossOrigin = 'anonymous'
		image.src = url
	})
}

/**
 * Get cropped image from canvas
 */
async function getCroppedImage(
	imageSrc: string,
	pixelCrop: CropArea,
	filename: string
): Promise<File> {
	const image = await createImage(imageSrc)
	const canvas = document.createElement('canvas')
	const ctx = canvas.getContext('2d')

	if (!ctx) {
		throw new Error('No 2d context')
	}

	// Set canvas size to the cropped area
	canvas.width = pixelCrop.width
	canvas.height = pixelCrop.height

	// Draw the cropped image
	ctx.drawImage(
		image,
		pixelCrop.x,
		pixelCrop.y,
		pixelCrop.width,
		pixelCrop.height,
		0,
		0,
		pixelCrop.width,
		pixelCrop.height
	)

	// Convert to blob
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (!blob) {
					reject(new Error('Canvas is empty'))
					return
				}
				// Create file with original filename but jpeg extension
				const file = new File(
					[blob],
					filename.replace(FILE_EXTENSION_REGEX, '.jpg'),
					{
						type: 'image/jpeg',
					}
				)
				resolve(file)
			},
			'image/jpeg',
			TARGET_QUALITY
		)
	})
}

/**
 * Compress image to reduce file size while maintaining quality
 */
async function compressImage(file: File): Promise<File> {
	// If file is already small enough, skip compression for GIFs (to preserve animation)
	if (file.type === 'image/gif') {
		return file
	}

	// Create image element
	const imageSrc = URL.createObjectURL(file)
	const image = await createImage(imageSrc)
	URL.revokeObjectURL(imageSrc)

	// Calculate new dimensions (resize to TARGET_IMAGE_SIZE max)
	let { width, height } = image
	const maxSize = TARGET_IMAGE_SIZE

	if (width > maxSize || height > maxSize) {
		if (width > height) {
			height = Math.round((height * maxSize) / width)
			width = maxSize
		} else {
			width = Math.round((width * maxSize) / height)
			height = maxSize
		}
	}

	// Create canvas and draw resized image
	const canvas = document.createElement('canvas')
	canvas.width = width
	canvas.height = height

	const ctx = canvas.getContext('2d')
	if (!ctx) {
		throw new Error('No 2d context')
	}

	// Use better image scaling
	ctx.imageSmoothingEnabled = true
	ctx.imageSmoothingQuality = 'high'
	ctx.drawImage(image, 0, 0, width, height)

	// Try to compress to JPEG first (better compression)
	let quality = TARGET_QUALITY
	let blob: Blob | null = null

	// Progressively reduce quality if file is still too large
	while (quality >= 0.5) {
		blob = await new Promise<Blob | null>((resolve) => {
			canvas.toBlob(resolve, 'image/jpeg', quality)
		})

		if (blob && blob.size <= MAX_COMPRESSED_SIZE) {
			break
		}
		quality -= 0.1
	}

	if (!blob) {
		throw new Error('Failed to compress image')
	}

	// Create new file
	const newFilename = file.name.replace(FILE_EXTENSION_REGEX, '.jpg')
	return new File([blob], newFilename, { type: 'image/jpeg' })
}

export default AvatarUploader
