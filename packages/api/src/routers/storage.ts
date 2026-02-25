import { attachments, db, user } from '@folionote/db'
import {
	ALLOWED_ATTACHMENT_IMAGE_TYPES,
	ALLOWED_AVATAR_TYPES,
	type AllowedAttachmentImageType,
	type AllowedAvatarType,
	deleteAttachment,
	deleteAvatar,
	getPathFromPublicUrl,
	MAX_ATTACHMENT_SIZE,
	MAX_AVATAR_SIZE,
	uploadAttachment,
	uploadAvatar,
	validateAttachmentFile,
	validateAvatarFile,
} from '@folionote/storage'
import { ORPCError } from '@orpc/server'
import { and, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { protectedProcedure } from '../index'
import {
	createRateLimitMiddleware,
	getRateLimitStatus,
	RATE_LIMIT_CONFIGS,
} from '../utils/rate-limit'

/**
 * Input schema for uploading avatar
 * Uses base64 encoding for file data transport
 */
const UploadAvatarInputSchema = z.object({
	/** Base64 encoded file data */
	fileData: z.string(),
	/** MIME type of the file */
	contentType: z.enum(ALLOWED_AVATAR_TYPES as unknown as [string, ...string[]]),
	/** Original filename (optional) */
	filename: z.string().optional(),
})

// Rate limit middlewares
const uploadRateLimitMiddleware = createRateLimitMiddleware(
	RATE_LIMIT_CONFIGS.AVATAR_UPLOAD
)
const updateRateLimitMiddleware = createRateLimitMiddleware(
	RATE_LIMIT_CONFIGS.AVATAR_UPDATE
)
const deleteRateLimitMiddleware = createRateLimitMiddleware(
	RATE_LIMIT_CONFIGS.AVATAR_DELETE
)

/**
 * Get current user's avatar image URL from database
 */
async function getCurrentUserImage(
	userId: string
): Promise<string | null | undefined> {
	const [currentUser] = await db
		.select({ image: user.image })
		.from(user)
		.where(eq(user.id, userId))
		.limit(1)
	return currentUser?.image
}

/**
 * Safely delete old avatar from storage (non-blocking)
 * Old avatar cleanup failure should not block the operation
 */
async function safeDeleteOldAvatar(
	imageUrl: string | null | undefined
): Promise<void> {
	if (!imageUrl) return

	const oldPath = getPathFromPublicUrl(imageUrl)
	if (!oldPath) return

	try {
		await deleteAvatar(oldPath)
	} catch {
		// Silently ignore - old avatar cleanup is not critical
		// In production, consider logging to a proper logging service
	}
}

type ProcessAvatarUploadParams = {
	userId: string
	fileData: string
	contentType: string
	filename?: string
}

type ProcessAvatarUploadResult = {
	imageUrl: string
	path: string
}

/**
 * Shared logic for processing avatar upload
 * Used by both uploadUserAvatar and updateUserAvatar
 */
async function processAvatarUpload({
	userId,
	fileData,
	contentType,
	filename,
}: ProcessAvatarUploadParams): Promise<ProcessAvatarUploadResult> {
	// Decode base64 to buffer
	const buffer = Buffer.from(fileData, 'base64')

	// Validate file
	const validation = validateAvatarFile(contentType, buffer.length)
	if (!validation.valid) {
		throw new ORPCError('BAD_REQUEST', { message: validation.error })
	}

	// Get current user's avatar and clean up old one
	const currentImage = await getCurrentUserImage(userId)
	await safeDeleteOldAvatar(currentImage)

	// Upload new avatar
	const result = await uploadAvatar({
		userId,
		file: buffer,
		contentType: contentType as AllowedAvatarType,
		filename,
	})

	// Update user.image in database
	const [updatedUser] = await db
		.update(user)
		.set({ image: result.publicUrl })
		.where(eq(user.id, userId))
		.returning({ id: user.id, image: user.image })

	if (!updatedUser) {
		throw new ORPCError('NOT_FOUND', { message: 'User not found' })
	}

	return {
		imageUrl: result.publicUrl,
		path: result.path,
	}
}

/**
 * storage.uploadAvatar - Upload a new avatar image
 *
 * Process:
 * 1. Validate file type and size
 * 2. Delete old avatar if exists
 * 3. Upload new avatar to Supabase Storage
 * 4. Update user.image with new URL
 *
 * Rate limited: 5 requests per minute
 */
export const uploadUserAvatar = protectedProcedure
	.use(uploadRateLimitMiddleware)
	.input(UploadAvatarInputSchema)
	.handler(({ context, input }) => {
		return processAvatarUpload({
			userId: context.session.user.id,
			...input,
		})
	})

/**
 * storage.deleteAvatar - Delete current user's avatar
 *
 * Rate limited: 10 requests per minute
 */
export const deleteUserAvatar = protectedProcedure
	.use(deleteRateLimitMiddleware)
	.handler(async ({ context }) => {
		const userId = context.session.user.id

		// Get current user avatar
		const currentImage = await getCurrentUserImage(userId)

		if (!currentImage) {
			return { success: true, message: 'No avatar to delete' }
		}

		// Delete from storage (non-blocking failure)
		await safeDeleteOldAvatar(currentImage)

		// Clear user.image in database
		await db.update(user).set({ image: null }).where(eq(user.id, userId))

		return { success: true }
	})

/**
 * storage.updateAvatar - Update user avatar (upload new + update db)
 *
 * This is a dedicated endpoint for avatar updates with its own rate limit.
 * Use this when you want to track update operations separately from raw uploads.
 *
 * Rate limited: 1 request per week
 */
export const updateUserAvatar = protectedProcedure
	.use(updateRateLimitMiddleware)
	.input(UploadAvatarInputSchema)
	.handler(({ context, input }) => {
		return processAvatarUpload({
			userId: context.session.user.id,
			...input,
		})
	})

/**
 * storage.getAvatarConfig - Get avatar upload configuration
 * Returns allowed types and max size for client-side validation
 */
export const getAvatarConfig = protectedProcedure.handler(() => {
	return {
		allowedTypes: ALLOWED_AVATAR_TYPES,
		maxSize: MAX_AVATAR_SIZE,
		maxSizeMB: MAX_AVATAR_SIZE / 1024 / 1024,
	}
})

/**
 * Rate limit action type for querying status
 */
const RateLimitActionSchema = z.enum(['upload', 'update', 'delete'])

/**
 * storage.getRateLimitStatus - Get current rate limit status for avatar operations
 *
 * Returns the remaining requests and reset time for the specified action.
 * Use this to display rate limit information to users.
 */
export const getAvatarRateLimitStatus = protectedProcedure
	.input(
		z.object({
			/** The action to check rate limit for */
			action: RateLimitActionSchema,
		})
	)
	.handler(async ({ context, input }) => {
		const userId = context.session.user.id
		const { action } = input

		const configMap = {
			upload: RATE_LIMIT_CONFIGS.AVATAR_UPLOAD,
			update: RATE_LIMIT_CONFIGS.AVATAR_UPDATE,
			delete: RATE_LIMIT_CONFIGS.AVATAR_DELETE,
		} as const

		const config = configMap[action]
		const status = await getRateLimitStatus(config.keyPrefix, userId, config)

		return {
			action,
			...status,
			windowMs: config.windowMs,
		}
	})

/**
 * storage.getAllRateLimitStatus - Get rate limit status for all avatar operations
 *
 * Returns the remaining requests and reset time for all actions at once.
 */
export const getAllAvatarRateLimitStatus = protectedProcedure.handler(
	async ({ context }) => {
		const userId = context.session.user.id

		const [uploadStatus, updateStatus, deleteStatus] = await Promise.all([
			getRateLimitStatus(
				RATE_LIMIT_CONFIGS.AVATAR_UPLOAD.keyPrefix,
				userId,
				RATE_LIMIT_CONFIGS.AVATAR_UPLOAD
			),
			getRateLimitStatus(
				RATE_LIMIT_CONFIGS.AVATAR_UPDATE.keyPrefix,
				userId,
				RATE_LIMIT_CONFIGS.AVATAR_UPDATE
			),
			getRateLimitStatus(
				RATE_LIMIT_CONFIGS.AVATAR_DELETE.keyPrefix,
				userId,
				RATE_LIMIT_CONFIGS.AVATAR_DELETE
			),
		])

		return {
			upload: {
				...uploadStatus,
				windowMs: RATE_LIMIT_CONFIGS.AVATAR_UPLOAD.windowMs,
			},
			update: {
				...updateStatus,
				windowMs: RATE_LIMIT_CONFIGS.AVATAR_UPDATE.windowMs,
			},
			delete: {
				...deleteStatus,
				windowMs: RATE_LIMIT_CONFIGS.AVATAR_DELETE.windowMs,
			},
		}
	}
)

// =============================================================================
// Attachment Operations
// =============================================================================

const UploadAttachmentInputSchema = z.object({
	fileData: z.string(),
	contentType: z.enum(
		ALLOWED_ATTACHMENT_IMAGE_TYPES as unknown as [string, ...string[]]
	),
	filename: z.string().optional(),
	entryId: z.string().optional(),
})

const attachmentUploadRateLimitMiddleware = createRateLimitMiddleware(
	RATE_LIMIT_CONFIGS.ATTACHMENT_UPLOAD
)
const attachmentDeleteRateLimitMiddleware = createRateLimitMiddleware(
	RATE_LIMIT_CONFIGS.ATTACHMENT_DELETE
)

/**
 * storage.uploadAttachment - Upload an image attachment for a note entry
 *
 * Rate limited: 20 requests per minute
 */
export const uploadEntryAttachment = protectedProcedure
	.use(attachmentUploadRateLimitMiddleware)
	.input(UploadAttachmentInputSchema)
	.handler(async ({ context, input }) => {
		const userId = context.session.user.id
		const buffer = Buffer.from(input.fileData, 'base64')

		const validation = validateAttachmentFile(input.contentType, buffer.length)
		if (!validation.valid) {
			throw new ORPCError('BAD_REQUEST', { message: validation.error })
		}

		const result = await uploadAttachment({
			userId,
			entryId: input.entryId,
			file: buffer,
			contentType: input.contentType as AllowedAttachmentImageType,
			filename: input.filename,
		})

		const attachmentId = nanoid()
		const [record] = await db
			.insert(attachments)
			.values({
				id: attachmentId,
				userId,
				entryId: input.entryId ?? null,
				filename:
					input.filename || `image.${input.contentType.split('/').at(1) || 'bin'}`,
				mimeType: input.contentType,
				size: String(buffer.length),
				storageKey: result.path,
			})
			.returning({
				id: attachments.id,
				storageKey: attachments.storageKey,
			})

		return {
			id: record?.id ?? attachmentId,
			publicUrl: result.publicUrl,
			path: result.path,
		}
	})

/**
 * storage.deleteAttachment - Delete an attachment by ID
 *
 * Rate limited: 20 requests per minute
 */
export const deleteEntryAttachment = protectedProcedure
	.use(attachmentDeleteRateLimitMiddleware)
	.input(z.object({ attachmentId: z.string() }))
	.handler(async ({ context, input }) => {
		const userId = context.session.user.id

		const [record] = await db
			.select({ id: attachments.id, storageKey: attachments.storageKey })
			.from(attachments)
			.where(
				and(eq(attachments.id, input.attachmentId), eq(attachments.userId, userId))
			)
			.limit(1)

		if (!record) {
			throw new ORPCError('NOT_FOUND', { message: 'Attachment not found' })
		}

		try {
			await deleteAttachment(record.storageKey)
		} catch {
			// Storage deletion failure is non-critical
		}

		await db
			.update(attachments)
			.set({ deletedAt: new Date() })
			.where(eq(attachments.id, input.attachmentId))

		return { success: true }
	})

/**
 * storage.getAttachmentConfig - Get attachment upload config for client validation
 */
export const getAttachmentConfig = protectedProcedure.handler(() => ({
	allowedTypes: ALLOWED_ATTACHMENT_IMAGE_TYPES,
	maxSize: MAX_ATTACHMENT_SIZE,
	maxSizeMB: MAX_ATTACHMENT_SIZE / 1024 / 1024,
}))

// =============================================================================
// Router
// =============================================================================

/**
 * Storage router - file storage related procedures
 */
export const storageRouter = {
	uploadAvatar: uploadUserAvatar,
	updateAvatar: updateUserAvatar,
	deleteAvatar: deleteUserAvatar,
	getAvatarConfig,
	getRateLimitStatus: getAvatarRateLimitStatus,
	getAllRateLimitStatus: getAllAvatarRateLimitStatus,
	uploadAttachment: uploadEntryAttachment,
	deleteAttachment: deleteEntryAttachment,
	getAttachmentConfig,
}
