/**
 * Avatar uploader component types
 */

/**
 * Crop area coordinates and dimensions
 */
export type CropArea = {
	x: number
	y: number
	width: number
	height: number
}

/**
 * Size variants for avatar display
 */
export type AvatarSize = 'default' | 'sm' | 'lg'

/**
 * Props for the AvatarUploader component
 */
export type AvatarUploaderProps = {
	/** Current avatar URL */
	currentImageUrl?: string | null
	/** User name for fallback display */
	userName?: string
	/** Size variant */
	size?: AvatarSize
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
 * Avatar size configuration for styling
 */
export type AvatarSizeConfig = {
	avatar: string
	icon: string
}

/**
 * Allowed MIME types for avatar uploads
 */
export type AllowedAvatarMimeType =
	| 'image/jpeg'
	| 'image/png'
	| 'image/gif'
	| 'image/webp'

/**
 * Allowed avatar types array (used for validation)
 */
export const ALLOWED_AVATAR_TYPES: readonly AllowedAvatarMimeType[] = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
] as const
