import {
	AVATAR_MAX_COMPRESSED_SIZE,
	AVATAR_MIN_COMPRESSION_QUALITY,
	AVATAR_TARGET_IMAGE_SIZE,
	AVATAR_TARGET_QUALITY,
	FILE_EXTENSION_REGEX,
} from '@folionote/constants'
import type { CropArea } from './types'

/**
 * Convert a File to base64 string (without the data URL prefix)
 */
export function fileToBase64(file: File): Promise<string> {
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
export function createImage(url: string): Promise<HTMLImageElement> {
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
export async function getCroppedImage(
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
			AVATAR_TARGET_QUALITY
		)
	})
}

/**
 * Compress image to reduce file size while maintaining quality
 */
export async function compressImage(file: File): Promise<File> {
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
	const maxSize = AVATAR_TARGET_IMAGE_SIZE

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
	let quality = AVATAR_TARGET_QUALITY
	let blob: Blob | null = null

	// Progressively reduce quality if file is still too large
	while (quality >= AVATAR_MIN_COMPRESSION_QUALITY) {
		blob = await new Promise<Blob | null>((resolve) => {
			canvas.toBlob(resolve, 'image/jpeg', quality)
		})

		if (blob && blob.size <= AVATAR_MAX_COMPRESSED_SIZE) {
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

/**
 * Get initials from a name string
 * @param name - Full name to extract initials from
 * @returns Up to 2 uppercase initials
 */
export function getInitials(name?: string): string {
	if (!name) return ''
	return name
		.split(' ')
		.map((part) => part[0])
		.join('')
		.toUpperCase()
		.slice(0, 2)
}
