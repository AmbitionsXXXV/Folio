# Supabase Storage Integration (S3 Protocol)

This document describes how to configure and use Supabase Storage via S3 protocol for file uploads in FolioNote.

## Overview

FolioNote uses Supabase Storage through the S3-compatible API for storing user-uploaded files, starting with user avatar images. The storage integration is encapsulated in the `@folionote/storage` package using the AWS S3 SDK.

## Architecture

```text
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Web Client    │────▶│   Server API    │────▶│    Supabase     │
│  (avatar-       │     │  (storage       │     │  Storage (S3)   │
│   uploader)     │     │   router)       │     │   (avatars)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                                │
                                ▼
                        ┌─────────────────┐
                        │    Database     │
                        │  (user.image)   │
                        └─────────────────┘
```

## Environment Variables

### Server Configuration

Add the following environment variables to `apps/server/.env`:

```env
# S3 Endpoint for Supabase Storage
S3_ENDPOINT=http://127.0.0.1:54321/storage/v1/s3

# S3 Access Key
S3_ACCESS_KEY=625729a08b95bf1b7ff351a663f3a23c

# S3 Secret Key
S3_SECRET_KEY=850181e4652dd023b7a98c58ae0d2d34bd487ee0cc3254aed6eda37307425907

# S3 Region
S3_REGION=local
```

### Local Development

When running local Supabase (`pnpm run db:start:supabase`), the S3 credentials can be found in the CLI output:

```text
╭───────────────────────────────────────────────────────────────────────────────╮
│ 📦 Storage (S3)                                                               │
├────────────┬──────────────────────────────────────────────────────────────────┤
│ URL        │ http://127.0.0.1:54321/storage/v1/s3                             │
│ Access Key │ 625729a08b95bf1b7ff351a663f3a23c                                 │
│ Secret Key │ 850181e4652dd023b7a98c58ae0d2d34bd487ee0cc3254aed6eda37307425907 │
│ Region     │ local                                                            │
╰────────────┴──────────────────────────────────────────────────────────────────╯
```

Or run `supabase status` in the `packages/db` directory to get the configuration values.

### Production Configuration

For production Supabase, configure as follows:

1. Go to Project Settings → Storage
2. Enable S3 protocol if not already enabled
3. Get the S3 endpoint URL, access key, and secret key
4. Set `S3_REGION` to your Supabase project region (e.g., `us-east-1`)

## Storage Buckets

### Avatars Bucket

You need to create the `avatars` bucket manually in Supabase Studio or via CLI:

**Via Supabase Studio:**

1. Open Supabase Studio at `http://127.0.0.1:54323` (local)
2. Go to Storage → Create new bucket
3. Name it `avatars`
4. Set to Public (for direct URL access)

**Via SQL:**

```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
```

**Bucket Configuration:**

| Setting         | Value                                               |
| --------------- | --------------------------------------------------- |
| Bucket Name     | `avatars`                                           |
| Public          | Yes (for direct URL access)                         |
| Max File Size   | 3MB (Supabase allows 50MB)                          |
| Allowed Types   | image/jpeg, image/png, image/gif, image/webp        |

## API Endpoints

### `storage.uploadAvatar`

Upload a new avatar image.

**Rate limit:** 5 requests per minute per user.

**Input:**

```typescript
{
  fileData: string  // Base64 encoded file data
  contentType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp'
  filename?: string  // Optional original filename
}
```

**Output:**

```typescript
{
  imageUrl: string  // Public URL of the uploaded avatar
  path: string      // Storage path for the file
}
```

**Behavior:**

- Validates file type and size
- Deletes existing avatar if present
- Uploads new file to `avatars/{userId}/{nanoid}.{ext}` via S3 PutObject
- Updates `user.image` in database

### `storage.updateAvatar`

Update the current user's avatar image.

**Rate limit:** 1 request per week per user.

**Input:** Same as `storage.uploadAvatar`.

**Output:** Same as `storage.uploadAvatar`.

**Behavior:** Same as `storage.uploadAvatar`, but uses a separate rate limit bucket to enforce a weekly update quota.

### `storage.deleteAvatar`

Delete the current user's avatar.

**Output:**

```typescript
{
  success: boolean
  message?: string
}
```

### `storage.getAvatarConfig`

Get upload configuration for client-side validation.

**Output:**

```typescript
{
  allowedTypes: string[]  // ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  maxSize: number         // 3145728 (3MB in bytes)
  maxSizeMB: number       // 3
}
```

### `storage.getRateLimitStatus`

Get the current rate limit status for avatar operations.

**Input:**

```typescript
{
  action: 'upload' | 'update' | 'delete'
}
```

**Output:**

```typescript
{
  action: 'upload' | 'update' | 'delete'
  remaining: number
  limit: number
  resetAt: number
  resetInMs: number
  isLimited: boolean
  windowMs: number
}
```

## Web Components

### AvatarUploader

A React component for uploading and managing avatars.

```tsx
import { AvatarUploader } from '@/components/avatar-uploader'

<AvatarUploader
  currentImageUrl={user.image}
  userName={user.name}
  size="lg"  // 'sm' | 'md' | 'lg'
  readonly={false}
  onAvatarChange={(newUrl) => console.log('Avatar updated:', newUrl)}
/>
```

Features:

- Drag & drop support
- File type and size validation
- **Image cropping dialog** - circular crop with zoom control
- **Automatic image compression** - resizes to 512px max and compresses to JPEG
- Image preview before upload
- Loading state during upload
- Delete button for existing avatar (improved size and positioning)

### Profile Page

A dedicated profile page route (`/profile`) for viewing and editing user settings.

Features:

- Avatar upload with cropping
- Account information display
- Theme settings (Light/Dark/System)
- Language selection
- Sign out and danger zone options

Navigate to `/profile` or use the profile link in the user menu.

## Storage Package API

The `@folionote/storage` package exports these functions:

### Client Functions

```typescript
import { getS3Client, resetS3Client } from '@folionote/storage'

// Get the S3 client
const s3 = getS3Client()
```

### Avatar Functions

```typescript
import {
  uploadAvatar,
  deleteAvatar,
  deleteUserAvatars,
  validateAvatarFile,
  getPathFromPublicUrl,
} from '@folionote/storage'

// Upload an avatar
const result = await uploadAvatar({
  userId: 'user-id',
  file: buffer,
  contentType: 'image/png',
})

// Validate before upload
const validation = validateAvatarFile('image/png', fileSize)
if (!validation.valid) {
  console.error(validation.error)
}

// Delete a specific avatar
await deleteAvatar('user-id/avatar-id.png')

// Delete all avatars for a user
await deleteUserAvatars('user-id')
```

### Constants

```typescript
import {
  STORAGE_BUCKETS,
  ALLOWED_AVATAR_TYPES,
  MAX_AVATAR_SIZE,
  getS3Config,
} from '@folionote/storage'

console.log(STORAGE_BUCKETS.AVATARS)  // 'avatars'
console.log(MAX_AVATAR_SIZE)           // 3145728 (3MB)
```

## Troubleshooting

### "S3_ACCESS_KEY and S3_SECRET_KEY are required"

Ensure the environment variables are set in your `.env` file and the server has been restarted.

### Avatar not displaying after upload

1. Check the browser console for CORS errors
2. Ensure the bucket is set to public
3. Verify the URL format matches `{S3_PUBLIC_URL}/avatars/{path}`

### File upload fails with "Invalid file type"

Ensure the file's MIME type is one of:

- `image/jpeg`
- `image/png`
- `image/gif`
- `image/webp`

### File too large

Maximum file size is 3MB. Consider compressing the image before upload or using a client-side image resizer.

### S3 Connection Error

1. Verify `S3_ENDPOINT` is correct
2. Check that Supabase is running: `pnpm run db:start:supabase`
3. Verify Access Key and Secret Key match the `supabase status` output

## Security Considerations

1. **S3 Credentials**: Only use on the server. Never expose to the client.
2. **File Validation**: Always validate file type and size both client-side and server-side.
3. **User Isolation**: Files are stored in user-specific paths (`{userId}/{fileId}`).
4. **Public Access**: Avatar images are publicly accessible by URL. Don't store sensitive files in the avatars bucket.

## Entry Attachments (Images)

Entry images are stored in the `attachments` bucket and managed via oRPC endpoints.

### Bucket Setup

The `attachments` bucket is created via `packages/db/supabase/seed.sql` during local development.
For production, create it manually in the Supabase dashboard with:

- **Name**: `attachments`
- **Public**: Yes
- **File size limit**: 10 MB
- **Allowed types**: `image/jpeg`, `image/png`, `image/gif`, `image/webp`, `image/svg+xml`

### Storage Path Convention

```text
{userId}/entries/{entryId}/{nanoid}.{ext}   # Attached to entry
{userId}/orphan/{nanoid}.{ext}              # Not yet linked
```

### API Endpoints

| Endpoint | Description |
|---|---|
| `storage.uploadAttachment` | Upload an image, writes metadata to `attachments` table |
| `storage.deleteAttachment` | Soft-delete an attachment (marks `deletedAt`, removes from S3) |
| `storage.getAttachmentConfig` | Returns allowed types and max size for client validation |

### Editor Integration

Images can be inserted in the Tiptap editor via:

1. **Slash command**: Type `/image` to open a file picker
2. **Paste**: Paste an image from the clipboard
3. **Drag and drop**: Drop an image file onto the editor

All methods use the same upload pipeline: client-side validation → oRPC `storage.uploadAttachment` → S3 upload → insert `<img>` node.

### Rate Limits

- Upload: 20 requests per minute per user
- Delete: 20 requests per minute per user

## Future Enhancements

- [ ] Image optimization and thumbnails
- [ ] Native app avatar upload support
- [ ] Presigned URLs for large file uploads
- [ ] Document attachments (PDF, etc.)
