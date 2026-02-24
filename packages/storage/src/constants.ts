/**
 * Re-export shared file upload constants from @folionote/constants
 * so existing consumers of @folionote/storage don't need to change imports.
 */
export {
	ALLOWED_ATTACHMENT_IMAGE_TYPES,
	ALLOWED_AVATAR_TYPES,
	type AllowedAttachmentImageType,
	type AllowedAvatarType,
	MAX_ATTACHMENT_SIZE,
	MAX_AVATAR_SIZE,
	STORAGE_BUCKETS,
	type StorageBucket,
} from '@folionote/constants'

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
