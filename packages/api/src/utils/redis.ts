import { Redis } from "@upstash/redis"

/**
 * Upstash Redis client singleton
 * Uses environment variables: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
 */
let redisClient: Redis | null = null

/**
 * Get the Redis client instance
 * Creates a new instance if one doesn't exist
 */
export function getRedisClient(): Redis {
  if (!redisClient) {
    redisClient = Redis.fromEnv()
  }
  return redisClient
}
