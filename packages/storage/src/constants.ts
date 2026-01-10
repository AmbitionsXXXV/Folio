/**
 * Supabase Storage bucket names (used as S3 bucket names)
 */
export const STORAGE_BUCKETS = {
	/** User avatar images bucket */
	AVATARS: 'avatars',
} as const

export type StorageBucket = (typeof STORAGE_BUCKETS)[keyof typeof STORAGE_BUCKETS]

/**
 * Allowed image MIME types for avatars
 */
export const ALLOWED_AVATAR_TYPES = [
	'image/jpeg',
	'image/png',
	'image/gif',
	'image/webp',
] as const

export type AllowedAvatarType = (typeof ALLOWED_AVATAR_TYPES)[number]

/**
 * Maximum file size for avatars (3MB)
 * Note: Supabase has a 50MB limit, but we use 3MB for better UX
 */
export const MAX_AVATAR_SIZE = 3 * 1024 * 1024

/**
 * Get the default S3 endpoint for local Supabase development
 */
export function getDefaultS3Endpoint(): string {
	return 'http://127.0.0.1:54321/storage/v1/s3'
}

/**
 * Get S3 configuration from environment variables
 *
 * Environment variables:
 * - S3_ENDPOINT: S3 endpoint URL (default: http://127.0.0.1:54321/storage/v1/s3)
 * - S3_ACCESS_KEY: S3 access key ID
 * - S3_SECRET_KEY: S3 secret access key
 * - S3_REGION: S3 region (default: local)
 * - S3_PUBLIC_URL: Base URL for public file access (default: http://127.0.0.1:54321/storage/v1/object/public)
 */
export function getS3Config() {
	const endpoint = process.env.S3_ENDPOINT || getDefaultS3Endpoint()
	const accessKeyId = process.env.S3_ACCESS_KEY
	const secretAccessKey = process.env.S3_SECRET_KEY
	const region = process.env.S3_REGION || 'local'

	// Derive public URL from endpoint if not explicitly set
	// S3 endpoint: http://127.0.0.1:54321/storage/v1/s3
	// Public URL: http://127.0.0.1:54321/storage/v1/object/public
	const defaultPublicUrl = endpoint.replace('/s3', '/object/public')
	const publicUrl = process.env.S3_PUBLIC_URL || defaultPublicUrl

	return {
		endpoint,
		accessKeyId,
		secretAccessKey,
		region,
		publicUrl,
	}
}
