import {
	type ErrorMap,
	type Meta,
	type Middleware,
	ORPCError,
	type ORPCErrorConstructorMap,
} from '@orpc/server'
import type { Context } from '../context'

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
	/** Maximum number of requests allowed in the time window */
	maxRequests: number
	/** Time window in milliseconds */
	windowMs: number
	/** Unique identifier prefix for the rate limit bucket */
	keyPrefix: string
}

/**
 * Rate limit entry stored in memory
 */
interface RateLimitEntry {
	count: number
	resetTime: number
}

/**
 * Rate limit status returned to clients
 */
export interface RateLimitStatus {
	/** Number of remaining requests in current window */
	remaining: number
	/** Maximum requests allowed in window */
	limit: number
	/** Unix timestamp when the rate limit resets */
	resetAt: number
	/** Milliseconds until the rate limit resets */
	resetInMs: number
	/** Whether the client is currently rate limited */
	isLimited: boolean
}

/**
 * In-memory rate limit store
 * In production, consider using Redis for distributed rate limiting
 */
const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Clean up expired entries periodically
 */
const ONE_SECOND_MS = 1000
const ONE_MINUTE_MS = 60 * ONE_SECOND_MS
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS
const ONE_DAY_MS = 24 * ONE_HOUR_MS
const ONE_WEEK_MS = 7 * ONE_DAY_MS

const CLEANUP_INTERVAL_MS = ONE_MINUTE_MS
let cleanupTimer: ReturnType<typeof setInterval> | null = null

type IntervalTimer = ReturnType<typeof setInterval>

function hasUnref(
	timer: IntervalTimer
): timer is IntervalTimer & { unref: () => void } {
	return typeof (timer as unknown as { unref?: unknown }).unref === 'function'
}

function startCleanupTimer() {
	if (cleanupTimer) return

	cleanupTimer = setInterval(() => {
		const now = Date.now()
		for (const [key, entry] of rateLimitStore.entries()) {
			if (entry.resetTime <= now) {
				rateLimitStore.delete(key)
			}
		}
	}, CLEANUP_INTERVAL_MS)

	// Don't prevent Node.js from exiting
	if (cleanupTimer && hasUnref(cleanupTimer)) {
		cleanupTimer.unref()
	}
}

// Start cleanup on module load
startCleanupTimer()

/**
 * Get the rate limit key for a user and action
 */
function getRateLimitKey(keyPrefix: string, userId: string): string {
	return `${keyPrefix}:${userId}`
}

/**
 * Check and update rate limit for a user
 * Returns the current status and whether the request should be allowed
 */
export function checkRateLimit(
	keyPrefix: string,
	userId: string,
	config: RateLimitConfig
): RateLimitStatus & { allowed: boolean } {
	const key = getRateLimitKey(keyPrefix, userId)
	const now = Date.now()

	let entry = rateLimitStore.get(key)

	// If no entry or window expired, create new entry
	if (!entry || entry.resetTime <= now) {
		entry = {
			count: 1,
			resetTime: now + config.windowMs,
		}
		rateLimitStore.set(key, entry)

		return {
			remaining: config.maxRequests - 1,
			limit: config.maxRequests,
			resetAt: entry.resetTime,
			resetInMs: config.windowMs,
			isLimited: false,
			allowed: true,
		}
	}

	// Check if rate limited
	if (entry.count >= config.maxRequests) {
		return {
			remaining: 0,
			limit: config.maxRequests,
			resetAt: entry.resetTime,
			resetInMs: entry.resetTime - now,
			isLimited: true,
			allowed: false,
		}
	}

	// Increment count
	entry.count++
	rateLimitStore.set(key, entry)

	return {
		remaining: config.maxRequests - entry.count,
		limit: config.maxRequests,
		resetAt: entry.resetTime,
		resetInMs: entry.resetTime - now,
		isLimited: false,
		allowed: true,
	}
}

/**
 * Get current rate limit status without incrementing
 */
export function getRateLimitStatus(
	keyPrefix: string,
	userId: string,
	config: RateLimitConfig
): RateLimitStatus {
	const key = getRateLimitKey(keyPrefix, userId)
	const now = Date.now()

	const entry = rateLimitStore.get(key)

	// If no entry or window expired
	if (!entry || entry.resetTime <= now) {
		return {
			remaining: config.maxRequests,
			limit: config.maxRequests,
			resetAt: now + config.windowMs,
			resetInMs: config.windowMs,
			isLimited: false,
		}
	}

	return {
		remaining: Math.max(0, config.maxRequests - entry.count),
		limit: config.maxRequests,
		resetAt: entry.resetTime,
		resetInMs: entry.resetTime - now,
		isLimited: entry.count >= config.maxRequests,
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
		const status = checkRateLimit(config.keyPrefix, userId, config)

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
 * For testing: clear all rate limit entries
 */
export function clearRateLimits(): void {
	rateLimitStore.clear()
}

/**
 * For testing: stop the cleanup timer
 */
export function stopCleanupTimer(): void {
	if (cleanupTimer) {
		clearInterval(cleanupTimer)
		cleanupTimer = null
	}
}
