/**
 * Avatar image compression and upload constants
 */

/**
 * Target size for compressed avatar images (in pixels)
 * Images larger than this will be resized while maintaining aspect ratio
 */
export const AVATAR_TARGET_IMAGE_SIZE = 512

/**
 * Target quality for JPEG compression (0-1)
 * Higher values mean better quality but larger file sizes
 */
export const AVATAR_TARGET_QUALITY = 0.85

/**
 * Maximum file size after compression (2MB)
 * Files larger than this will be rejected
 */
export const AVATAR_MAX_COMPRESSED_SIZE = 2 * 1024 * 1024

/**
 * Minimum compression quality threshold
 * Compression will not go below this quality level
 */
export const AVATAR_MIN_COMPRESSION_QUALITY = 0.5

/**
 * Regex pattern for extracting file extension from filename
 */
export const FILE_EXTENSION_REGEX = /\.[^.]+$/

/**
 * Default zoom range for avatar cropper
 */
export const AVATAR_CROPPER_MIN_ZOOM = 1
export const AVATAR_CROPPER_MAX_ZOOM = 3
export const AVATAR_CROPPER_ZOOM_STEP = 0.1

/**
 * Rate limit polling intervals (in milliseconds)
 */
export const RATE_LIMIT_POLL_INTERVAL_LIMITED = 60 * 1000 // 1 minute when limited
export const RATE_LIMIT_POLL_INTERVAL_NORMAL = 30 * 1000 // 30 seconds normally
export const RATE_LIMIT_STALE_TIME = 10 * 1000 // 10 seconds cache

/**
 * Time unit constants (in milliseconds)
 * Used for rate limiting and other time-based operations
 */
export const ONE_SECOND_MS = 1000
export const ONE_MINUTE_MS = 60 * ONE_SECOND_MS
export const ONE_HOUR_MS = 60 * ONE_MINUTE_MS
export const ONE_DAY_MS = 24 * ONE_HOUR_MS
export const ONE_WEEK_MS = 7 * ONE_DAY_MS

/**
 * Rate limit cleanup interval (1 minute)
 */
export const RATE_LIMIT_CLEANUP_INTERVAL_MS = ONE_MINUTE_MS
