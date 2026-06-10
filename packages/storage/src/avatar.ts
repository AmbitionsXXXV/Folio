import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand
} from "@aws-sdk/client-s3"
import { nanoid } from "nanoid"

import { getS3Client } from "./client"
import {
  ALLOWED_AVATAR_TYPES,
  getS3Config,
  MAX_AVATAR_SIZE,
  STORAGE_BUCKETS
} from "./constants"
import type { AllowedAvatarType } from "./constants"

export interface UploadAvatarOptions {
  userId: string
  file: Buffer | Uint8Array
  contentType: AllowedAvatarType
  filename?: string
}

export interface UploadAvatarResult {
  path: string
  publicUrl: string
}

export const AVATARS_PATH_REGEX = /\/storage\/v1\/object\/public\/avatars\/(.+)/

/**
 * Validate avatar file before upload
 */
export function validateAvatarFile(
  contentType: string,
  size: number
): { valid: true } | { valid: false; error: string } {
  if (!ALLOWED_AVATAR_TYPES.includes(contentType as AllowedAvatarType)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_AVATAR_TYPES.join(", ")}`
    }
  }

  if (size > MAX_AVATAR_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size is ${MAX_AVATAR_SIZE / 1024 / 1024}MB`
    }
  }

  return { valid: true }
}

/**
 * Get file extension from content type
 */
function getExtensionFromContentType(contentType: string): string {
  const extensions: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp"
  }
  return extensions[contentType] || "jpg"
}

/**
 * Get the public URL for a file in the avatars bucket
 */
function getPublicUrl(path: string): string {
  const config = getS3Config()
  return `${config.publicUrl}/${STORAGE_BUCKETS.AVATARS}/${path}`
}

/**
 * Upload an avatar image to S3-compatible Supabase Storage
 */
export async function uploadAvatar(
  options: UploadAvatarOptions
): Promise<UploadAvatarResult> {
  const { userId, file, contentType } = options
  const s3 = getS3Client()

  // Generate a unique filename
  const extension = getExtensionFromContentType(contentType)
  const path = `${userId}/${nanoid()}.${extension}`

  // Upload the file using S3 PutObject
  const command = new PutObjectCommand({
    Bucket: STORAGE_BUCKETS.AVATARS,
    Key: path,
    Body: file,
    ContentType: contentType
  })

  await s3.send(command)

  return {
    path,
    publicUrl: getPublicUrl(path)
  }
}

/**
 * Delete an avatar from S3-compatible Supabase Storage
 */
export async function deleteAvatar(path: string): Promise<void> {
  const s3 = getS3Client()

  const command = new DeleteObjectCommand({
    Bucket: STORAGE_BUCKETS.AVATARS,
    Key: path
  })

  await s3.send(command)
}

/**
 * Maximum number of objects to delete in a single batch
 * S3 allows up to 1000 objects per DeleteObjects request
 */
const DELETE_BATCH_SIZE = 1000

/**
 * Delete all avatars for a user using batch delete
 * Uses DeleteObjectsCommand for better performance
 */
export async function deleteUserAvatars(userId: string): Promise<void> {
  const s3 = getS3Client()

  // List all files in the user's folder
  const listCommand = new ListObjectsV2Command({
    Bucket: STORAGE_BUCKETS.AVATARS,
    Prefix: `${userId}/`
  })

  const listResult = await s3.send(listCommand)

  if (!listResult.Contents || listResult.Contents.length === 0) {
    return
  }

  // Filter out objects without keys
  const objectsToDelete = listResult.Contents.filter((obj) => obj.Key).map(
    (obj) => ({ Key: obj.Key as string })
  )

  if (objectsToDelete.length === 0) {
    return
  }

  // Delete in batches (S3 supports up to 1000 objects per request)
  for (let i = 0; i < objectsToDelete.length; i += DELETE_BATCH_SIZE) {
    const batch = objectsToDelete.slice(i, i + DELETE_BATCH_SIZE)

    const deleteCommand = new DeleteObjectsCommand({
      Bucket: STORAGE_BUCKETS.AVATARS,
      Delete: {
        Objects: batch,
        Quiet: true // Don't return info about each deleted object
      }
    })

    await s3.send(deleteCommand)
  }
}

/**
 * Extract storage path from a public URL
 */
export function getPathFromPublicUrl(publicUrl: string): string | null {
  try {
    const url = new URL(publicUrl)
    // URL format: {base_url}/object/public/avatars/{path}
    const match = url.pathname.match(AVATARS_PATH_REGEX)
    return match?.[1] || null
  } catch {
    return null
  }
}
