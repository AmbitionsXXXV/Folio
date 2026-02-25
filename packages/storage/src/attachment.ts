import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { nanoid } from 'nanoid'
import { getS3Client } from './client'
import {
	ALLOWED_ATTACHMENT_IMAGE_TYPES,
	type AllowedAttachmentImageType,
	getS3Config,
	MAX_ATTACHMENT_SIZE,
	STORAGE_BUCKETS,
} from './constants'

export type UploadAttachmentOptions = {
	userId: string
	entryId?: string
	file: Buffer | Uint8Array
	contentType: AllowedAttachmentImageType
	filename?: string
}

export type UploadAttachmentResult = {
	path: string
	publicUrl: string
}

/**
 * Validate an attachment file before upload
 */
export function validateAttachmentFile(
	contentType: string,
	size: number
): { valid: true } | { valid: false; error: string } {
	if (
		!ALLOWED_ATTACHMENT_IMAGE_TYPES.includes(
			contentType as AllowedAttachmentImageType
		)
	) {
		return {
			valid: false,
			error: `Invalid file type. Allowed types: ${ALLOWED_ATTACHMENT_IMAGE_TYPES.join(', ')}`,
		}
	}

	if (size > MAX_ATTACHMENT_SIZE) {
		return {
			valid: false,
			error: `File too large. Maximum size is ${MAX_ATTACHMENT_SIZE / 1024 / 1024}MB`,
		}
	}

	return { valid: true }
}

function getExtensionFromContentType(contentType: string): string {
	const extensions: Record<string, string> = {
		'image/jpeg': 'jpg',
		'image/png': 'png',
		'image/gif': 'gif',
		'image/webp': 'webp',
		'image/svg+xml': 'svg',
	}
	return extensions[contentType] || 'bin'
}

function getAttachmentPublicUrl(path: string): string {
	const config = getS3Config()
	return `${config.publicUrl}/${STORAGE_BUCKETS.ATTACHMENTS}/${path}`
}

/**
 * Upload an attachment image to S3-compatible Supabase Storage.
 * Path: {userId}/entries/{entryId}/{nanoid}.{ext}
 * or    {userId}/orphan/{nanoid}.{ext} when no entry is associated.
 */
export async function uploadAttachment(
	options: UploadAttachmentOptions
): Promise<UploadAttachmentResult> {
	const { userId, entryId, file, contentType } = options
	const s3 = getS3Client()

	const extension = getExtensionFromContentType(contentType)
	const folder = entryId ? `entries/${entryId}` : 'orphan'
	const path = `${userId}/${folder}/${nanoid()}.${extension}`

	const command = new PutObjectCommand({
		Bucket: STORAGE_BUCKETS.ATTACHMENTS,
		Key: path,
		Body: file,
		ContentType: contentType,
	})

	await s3.send(command)

	return {
		path,
		publicUrl: getAttachmentPublicUrl(path),
	}
}

/**
 * Delete an attachment from S3-compatible Supabase Storage
 */
export async function deleteAttachment(path: string): Promise<void> {
	const s3 = getS3Client()

	const command = new DeleteObjectCommand({
		Bucket: STORAGE_BUCKETS.ATTACHMENTS,
		Key: path,
	})

	await s3.send(command)
}
