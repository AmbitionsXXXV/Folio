/**
 * Redis client utilities for server
 *
 * Wraps the @folionote/api redis client with server-specific helpers.
 */

import { getRedisClient as getApiRedisClient } from '@folionote/api/utils/redis'

/**
 * Check if Redis is configured via environment variables
 */
export function isRedisConfigured(): boolean {
	return Boolean(
		process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
	)
}

/**
 * Get the Redis client instance
 * Re-exports from @folionote/api for consistency
 */
export const getRedisClient = getApiRedisClient
