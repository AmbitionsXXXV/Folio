// Client

// Avatar operations
export {
	deleteAvatar,
	deleteUserAvatars,
	getPathFromPublicUrl,
	type UploadAvatarOptions,
	type UploadAvatarResult,
	uploadAvatar,
	validateAvatarFile,
} from './avatar'
export { getS3Client, resetS3Client } from './client'
// Constants
export {
	ALLOWED_AVATAR_TYPES,
	type AllowedAvatarType,
	getDefaultS3Endpoint,
	getS3Config,
	MAX_AVATAR_SIZE,
	STORAGE_BUCKETS,
	type StorageBucket,
} from './constants'
