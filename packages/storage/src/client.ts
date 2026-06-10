import { S3Client } from "@aws-sdk/client-s3"
import "dotenv/config"

import { getS3Config } from "./constants"

let s3Client: S3Client | null = null

/**
 * Get or create an S3 client instance for Supabase Storage
 */
export function getS3Client(): S3Client {
  if (s3Client) {
    return s3Client
  }

  const config = getS3Config()

  if (!(config.accessKeyId && config.secretAccessKey)) {
    throw new Error(
      "S3_ACCESS_KEY and S3_SECRET_KEY are required for storage operations"
    )
  }

  s3Client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey
    },
    forcePathStyle: true // Required for Supabase S3
  })

  return s3Client
}

/**
 * Reset the S3 client (useful for testing)
 */
export function resetS3Client(): void {
  s3Client = null
}
