/**
 * Time unit constants (in milliseconds)
 */
const ONE_SECOND_MS = 1000
const ONE_MINUTE_MS = 60 * ONE_SECOND_MS
const ONE_WEEK_MS = 7 * 24 * 60 * ONE_MINUTE_MS

import {
	type ErrorMap,
	type Meta,
	type Middleware,
	ORPCError,
	type ORPCErrorConstructorMap,
} from '@orpc/server'
import type { Context } from '../context'
import { getRedisClient } from './redis'

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
	/** Unique identifier prefix for the rate limit bucket */
	keyPrefix: string
	/** Maximum number of requests allowed in the time window */
	maxRequests: number
	/** Time window in milliseconds */
	windowMs: number
}

/**
 * Rate limit status returned to clients
 */
export interface RateLimitStatus {
	/** Whether the client is currently rate limited */
	isLimited: boolean
	/** Maximum requests allowed in window */
	limit: number
	/** Number of remaining requests in current window */
	remaining: number
	/** Unix timestamp when the rate limit resets */
	resetAt: number
	/** Milliseconds until the rate limit resets */
	resetInMs: number
}

/**
 * Get the rate limit key for a user and action
 */
function getRateLimitKey(keyPrefix: string, userId: string): string {
	return `ratelimit:${keyPrefix}:${userId}`
}

/**
 * Lua script for atomic rate limit check and increment
 *
 * This script atomically:
 * 1. Gets current count (or 0 if key doesn't exist)
 * 2. If count < maxRequests, increments and sets TTL on first request
 * 3. Returns [allowed (0/1), currentCount, ttlMs]
 *
 * Using single key design - TTL is derived from PTTL, no separate resetTime key needed
 */
const RATE_LIMIT_SCRIPT = `
local key = KEYS[1]
local maxRequests = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])

-- Get current count (returns nil if key doesn't exist)
local current = redis.call('GET', key)
local count = 0
if current then
	count = tonumber(current) or 0
end

-- Get TTL to calculate reset time
local pttl = redis.call('PTTL', key)

-- If key doesn't exist or has no TTL (expired), this is a new window
if pttl < 0 then
	-- New window: set count to 1 with TTL
	redis.call('SET', key, 1, 'PX', windowMs)
	-- allowed=1, count=1, ttl=windowMs
	return {1, 1, windowMs}
end

-- Key exists with valid TTL
if count >= maxRequests then
	-- Already at limit, reject
	-- allowed=0, count=current, ttl=remaining
	return {0, count, pttl}
end

-- Under limit, increment
local newCount = redis.call('INCR', key)
-- allowed=1, count=newCount, ttl=remaining
return {1, newCount, pttl}
`

/**
 * Lua script for getting rate limit status without incrementing
 */
const GET_STATUS_SCRIPT = `
local key = KEYS[1]
local maxRequests = tonumber(ARGV[1])
local windowMs = tonumber(ARGV[2])

-- Get current count
local current = redis.call('GET', key)
local count = 0
if current then
	count = tonumber(current) or 0
end

-- Get TTL
local pttl = redis.call('PTTL', key)

-- If key doesn't exist or expired
if pttl < 0 then
	-- No active window
	-- count=0, ttl=windowMs (would be the TTL if a new request came in)
	return {0, windowMs}
end

-- Return current count and remaining TTL
return {count, pttl}
`

/**
 * Check and update rate limit for a user using atomic Lua script
 * Returns the current status and whether the request should be allowed
 */
export async function checkRateLimit(
	keyPrefix: string,
	userId: string,
	config: RateLimitConfig
): Promise<RateLimitStatus & { allowed: boolean }> {
	const redis = getRedisClient()
	const key = getRateLimitKey(keyPrefix, userId)
	const now = Date.now()

	// Execute atomic Lua script
	// Returns [allowed (0/1), currentCount, ttlMs]
	const result = (await redis.eval(
		RATE_LIMIT_SCRIPT,
		[key],
		[config.maxRequests, config.windowMs]
	)) as [number, number, number]

	const [allowed, currentCount, ttlMs] = result
	const isAllowed = allowed === 1

	return {
		remaining: Math.max(0, config.maxRequests - currentCount),
		limit: config.maxRequests,
		resetAt: now + ttlMs,
		resetInMs: ttlMs,
		isLimited: !isAllowed,
		allowed: isAllowed,
	}
}

/**
 * Get current rate limit status without incrementing (async version using Redis)
 */
export async function getRateLimitStatus(
	keyPrefix: string,
	userId: string,
	config: RateLimitConfig
): Promise<RateLimitStatus> {
	const redis = getRedisClient()
	const key = getRateLimitKey(keyPrefix, userId)
	const now = Date.now()

	// Execute atomic Lua script for status check
	// Returns [currentCount, ttlMs]
	const result = (await redis.eval(
		GET_STATUS_SCRIPT,
		[key],
		[config.maxRequests, config.windowMs]
	)) as [number, number]

	const [currentCount, ttlMs] = result

	return {
		remaining: Math.max(0, config.maxRequests - currentCount),
		limit: config.maxRequests,
		resetAt: now + ttlMs,
		resetInMs: ttlMs,
		isLimited: currentCount >= config.maxRequests,
	}
}

/**
 * Predefined rate limit configurations
 */
export const RATE_LIMIT_CONFIGS = {
	/** Avatar upload: 5 requests per minute */
	AVATAR_UPLOAD: {
		maxRequests: 5,
		windowMs: ONE_MINUTE_MS,
		keyPrefix: 'avatar:upload',
	},
	/** Avatar update (includes upload + db update): 1 request per week */
	AVATAR_UPDATE: {
		maxRequests: 1,
		windowMs: ONE_WEEK_MS,
		keyPrefix: 'avatar:update',
	},
	/** Avatar delete: 10 requests per minute */
	AVATAR_DELETE: {
		maxRequests: 10,
		windowMs: ONE_MINUTE_MS,
		keyPrefix: 'avatar:delete',
	},
	/** Attachment upload: 20 requests per minute */
	ATTACHMENT_UPLOAD: {
		maxRequests: 20,
		windowMs: ONE_MINUTE_MS,
		keyPrefix: 'attachment:upload',
	},
	/** Attachment delete: 20 requests per minute */
	ATTACHMENT_DELETE: {
		maxRequests: 20,
		windowMs: ONE_MINUTE_MS,
		keyPrefix: 'attachment:delete',
	},
} as const satisfies Record<string, RateLimitConfig>

type AuthenticatedContext = Context & { session: NonNullable<Context['session']> }

type RateLimitContextValue = Pick<RateLimitStatus, 'limit' | 'remaining' | 'resetAt'>

type RateLimitedContext = AuthenticatedContext & {
	rateLimit: RateLimitContextValue
}

export type RateLimitMiddleware = Middleware<
	AuthenticatedContext,
	RateLimitedContext,
	unknown,
	unknown,
	ORPCErrorConstructorMap<ErrorMap>,
	Meta
>

/**
 * Create a rate limit middleware for oRPC
 */
export function createRateLimitMiddleware(
	config: RateLimitConfig
): RateLimitMiddleware {
	return async ({ context, next }) => {
		// Ensure user is authenticated (should already be handled by protectedProcedure)
		if (!context.session?.user?.id) {
			throw new ORPCError('UNAUTHORIZED', {
				message: 'Authentication required',
			})
		}

		const userId = context.session.user.id
		const status = await checkRateLimit(config.keyPrefix, userId, config)

		if (!status.allowed) {
			const retryAfterSeconds = Math.ceil(status.resetInMs / 1000)
			throw new ORPCError('TOO_MANY_REQUESTS', {
				message: `Rate limit exceeded. Please try again in ${retryAfterSeconds} seconds.`,
				data: {
					remaining: status.remaining,
					limit: status.limit,
					resetAt: status.resetAt,
					resetInMs: status.resetInMs,
					retryAfterSeconds,
				},
			})
		}

		// Add rate limit info to context for handlers to use
		const result = await next({
			context: {
				...context,
				rateLimit: {
					remaining: status.remaining,
					limit: status.limit,
					resetAt: status.resetAt,
				},
			},
		})

		return result
	}
}

/**
 * For testing: clear all rate limit entries in Redis
 * WARNING: This clears ALL rate limit keys matching the pattern
 */
export async function clearRateLimits(): Promise<void> {
	const redis = getRedisClient()
	// Scan and delete all rate limit keys
	let cursor = '0'
	do {
		const scanResult: [string, string[]] = await redis.scan(cursor, {
			match: 'ratelimit:*',
			count: 100,
		})
		cursor = scanResult[0]
		const keys = scanResult[1]
		if (keys.length > 0) {
			await redis.del(...keys)
		}
	} while (cursor !== '0')
}
