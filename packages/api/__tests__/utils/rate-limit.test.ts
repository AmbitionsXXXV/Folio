import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
	checkRateLimit,
	clearRateLimits,
	getRateLimitStatus,
	RATE_LIMIT_CONFIGS,
} from '../../src/utils/rate-limit'

const ONE_SECOND_MS = 1000
const ONE_MINUTE_MS = 60 * ONE_SECOND_MS
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS
const ONE_DAY_MS = 24 * ONE_HOUR_MS
const ONE_WEEK_MS = 7 * ONE_DAY_MS

/**
 * Mock Redis store with TTL support
 * Stores { value: unknown, expiresAt: number | null }
 */
interface MockRedisEntry {
	value: unknown
	expiresAt: number | null
}

const mockRedisStore = new Map<string, MockRedisEntry>()

/**
 * Helper to check if a key is expired
 */
function isExpired(entry: MockRedisEntry | undefined): boolean {
	if (!entry) return true
	if (entry.expiresAt === null) return false
	return Date.now() >= entry.expiresAt
}

/**
 * Helper to get value if not expired
 */
function getValidValue(key: string): unknown {
	const entry = mockRedisStore.get(key)
	if (isExpired(entry)) {
		mockRedisStore.delete(key)
		return null
	}
	return entry?.value ?? null
}

/**
 * Helper to get PTTL (remaining TTL in ms)
 * Returns -2 if key doesn't exist, -1 if no TTL, otherwise remaining ms
 */
function getPttl(key: string): number {
	const entry = mockRedisStore.get(key)
	if (!entry || isExpired(entry)) {
		mockRedisStore.delete(key)
		return -2
	}
	if (entry.expiresAt === null) {
		return -1
	}
	return Math.max(0, entry.expiresAt - Date.now())
}

/**
 * Mock implementation of Lua rate limit script
 * This simulates the atomic behavior of the actual Lua script
 */
function mockRateLimitScript(
	keys: string[],
	args: (string | number)[]
): [number, number, number] {
	const key = keys[0]
	const maxRequests = Number(args[0])
	const windowMs = Number(args[1])

	// Get current count
	const currentValue = getValidValue(key)
	const count = currentValue !== null ? Number(currentValue) : 0

	// Get TTL
	const pttl = getPttl(key)

	// If key doesn't exist or has no TTL (expired), this is a new window
	if (pttl < 0) {
		// New window: set count to 1 with TTL
		mockRedisStore.set(key, {
			value: 1,
			expiresAt: Date.now() + windowMs,
		})
		// allowed=1, count=1, ttl=windowMs
		return [1, 1, windowMs]
	}

	// Key exists with valid TTL
	if (count >= maxRequests) {
		// Already at limit, reject
		return [0, count, pttl]
	}

	// Under limit, increment
	const newCount = count + 1
	const entry = mockRedisStore.get(key)
	if (entry) {
		entry.value = newCount
	}
	return [1, newCount, pttl]
}

/**
 * Mock implementation of Lua get status script
 */
function mockGetStatusScript(
	keys: string[],
	args: (string | number)[]
): [number, number] {
	const key = keys[0]
	const windowMs = Number(args[1])

	// Get current count
	const currentValue = getValidValue(key)
	const count = currentValue !== null ? Number(currentValue) : 0

	// Get TTL
	const pttl = getPttl(key)

	// If key doesn't exist or expired
	if (pttl < 0) {
		return [0, windowMs]
	}

	return [count, pttl]
}

vi.mock('../../src/utils/redis', () => ({
	getRedisClient: () => ({
		get: vi.fn((key: string) => Promise.resolve(getValidValue(key))),
		set: vi.fn(
			(key: string, value: unknown, options?: { ex?: number; px?: number }) => {
				let expiresAt: number | null = null
				if (options?.ex) {
					expiresAt = Date.now() + options.ex * 1000
				} else if (options?.px) {
					expiresAt = Date.now() + options.px
				}
				mockRedisStore.set(key, { value, expiresAt })
				return Promise.resolve('OK')
			}
		),
		del: vi.fn((...keys: string[]) => {
			let deletedCount = 0
			for (const key of keys) {
				if (mockRedisStore.delete(key)) {
					deletedCount++
				}
			}
			return Promise.resolve(deletedCount)
		}),
		incr: vi.fn((key: string) => {
			const entry = mockRedisStore.get(key)
			if (!entry || isExpired(entry)) {
				mockRedisStore.set(key, { value: 1, expiresAt: null })
				return Promise.resolve(1)
			}
			const newValue = Number(entry.value) + 1
			entry.value = newValue
			return Promise.resolve(newValue)
		}),
		decr: vi.fn((key: string) => {
			const entry = mockRedisStore.get(key)
			if (!entry || isExpired(entry)) {
				mockRedisStore.set(key, { value: -1, expiresAt: null })
				return Promise.resolve(-1)
			}
			const newValue = Number(entry.value) - 1
			entry.value = newValue
			return Promise.resolve(newValue)
		}),
		pttl: vi.fn((key: string) => Promise.resolve(getPttl(key))),
		eval: vi.fn(
			<T>(script: string, keys: string[], args: (string | number)[]): Promise<T> => {
				// Detect which script is being called based on return structure
				// Rate limit script returns 3 values, status script returns 2
				if (script.includes('INCR')) {
					return Promise.resolve(mockRateLimitScript(keys, args) as T)
				}
				return Promise.resolve(mockGetStatusScript(keys, args) as T)
			}
		),
		scan: vi.fn((cursor: string, { match }: { match: string; count?: number }) => {
			if (cursor !== '0') {
				return Promise.resolve(['0', []] as [string, string[]])
			}
			const regex = new RegExp(`^${match.replace(/\*/g, '.*')}$`)
			const keys = Array.from(mockRedisStore.keys()).filter((k) => regex.test(k))
			return Promise.resolve(['0', keys] as [string, string[]])
		}),
	}),
}))

describe('rate-limit', () => {
	beforeEach(async () => {
		mockRedisStore.clear()
		await clearRateLimits()
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	describe('checkRateLimit', () => {
		it('should allow first request and set correct remaining count', async () => {
			const config = {
				maxRequests: 5,
				windowMs: ONE_MINUTE_MS,
				keyPrefix: 'test',
			}
			const userId = 'user-1'

			const result = await checkRateLimit(config.keyPrefix, userId, config)

			expect(result.allowed).toBe(true)
			expect(result.isLimited).toBe(false)
			expect(result.remaining).toBe(4) // 5 - 1 = 4
			expect(result.limit).toBe(5)
			expect(result.resetInMs).toBeGreaterThan(0)
			expect(result.resetInMs).toBeLessThanOrEqual(ONE_MINUTE_MS)
		})

		it('should allow only one avatar update per week window', async () => {
			const config = RATE_LIMIT_CONFIGS.AVATAR_UPDATE
			const userId = 'user-id'

			expect(config.maxRequests).toBe(1)
			expect(config.windowMs).toBe(ONE_WEEK_MS)

			const first = await checkRateLimit(config.keyPrefix, userId, config)
			expect(first.allowed).toBe(true)
			expect(first.isLimited).toBe(false)
			expect(first.remaining).toBe(0) // 1 - 1 = 0

			const second = await checkRateLimit(config.keyPrefix, userId, config)
			expect(second.allowed).toBe(false)
			expect(second.isLimited).toBe(true)
			expect(second.remaining).toBe(0)
		})

		it('should allow multiple requests up to the limit', async () => {
			const config = {
				maxRequests: 3,
				windowMs: ONE_MINUTE_MS,
				keyPrefix: 'multi-test',
			}
			const userId = 'user-multi'

			// First request
			const r1 = await checkRateLimit(config.keyPrefix, userId, config)
			expect(r1.allowed).toBe(true)
			expect(r1.remaining).toBe(2)

			// Second request
			const r2 = await checkRateLimit(config.keyPrefix, userId, config)
			expect(r2.allowed).toBe(true)
			expect(r2.remaining).toBe(1)

			// Third request (at limit)
			const r3 = await checkRateLimit(config.keyPrefix, userId, config)
			expect(r3.allowed).toBe(true)
			expect(r3.remaining).toBe(0)

			// Fourth request (over limit)
			const r4 = await checkRateLimit(config.keyPrefix, userId, config)
			expect(r4.allowed).toBe(false)
			expect(r4.isLimited).toBe(true)
			expect(r4.remaining).toBe(0)
		})

		it('should track different users independently', async () => {
			const config = {
				maxRequests: 1,
				windowMs: ONE_MINUTE_MS,
				keyPrefix: 'independent',
			}

			// User A hits limit
			const userA1 = await checkRateLimit(config.keyPrefix, 'user-a', config)
			expect(userA1.allowed).toBe(true)

			const userA2 = await checkRateLimit(config.keyPrefix, 'user-a', config)
			expect(userA2.allowed).toBe(false)

			// User B should still be allowed
			const userB1 = await checkRateLimit(config.keyPrefix, 'user-b', config)
			expect(userB1.allowed).toBe(true)
		})

		it('should reset after window expires', async () => {
			vi.useFakeTimers()
			const now = Date.now()
			vi.setSystemTime(now)

			const config = {
				maxRequests: 1,
				windowMs: ONE_MINUTE_MS,
				keyPrefix: 'expiry-test',
			}
			const userId = 'user-expiry'

			// First request
			const first = await checkRateLimit(config.keyPrefix, userId, config)
			expect(first.allowed).toBe(true)

			// Second request (should be blocked)
			const second = await checkRateLimit(config.keyPrefix, userId, config)
			expect(second.allowed).toBe(false)

			// Advance time past the window
			vi.setSystemTime(now + ONE_MINUTE_MS + 1)

			// Third request (new window, should be allowed)
			const third = await checkRateLimit(config.keyPrefix, userId, config)
			expect(third.allowed).toBe(true)
		})
	})

	describe('getRateLimitStatus', () => {
		it('should return full capacity for new user', async () => {
			const config = {
				maxRequests: 10,
				windowMs: ONE_MINUTE_MS,
				keyPrefix: 'status-test',
			}
			const userId = 'new-user'

			const status = await getRateLimitStatus(config.keyPrefix, userId, config)

			expect(status.remaining).toBe(10)
			expect(status.limit).toBe(10)
			expect(status.isLimited).toBe(false)
		})

		it('should reflect current usage without incrementing', async () => {
			const config = {
				maxRequests: 5,
				windowMs: ONE_MINUTE_MS,
				keyPrefix: 'status-no-incr',
			}
			const userId = 'user-status'

			// Make 2 requests
			await checkRateLimit(config.keyPrefix, userId, config)
			await checkRateLimit(config.keyPrefix, userId, config)

			// Check status multiple times - should not change
			const status1 = await getRateLimitStatus(config.keyPrefix, userId, config)
			expect(status1.remaining).toBe(3) // 5 - 2 = 3
			expect(status1.isLimited).toBe(false)

			const status2 = await getRateLimitStatus(config.keyPrefix, userId, config)
			expect(status2.remaining).toBe(3) // Still 3, no increment
		})

		it('should show limited status when at capacity', async () => {
			const config = {
				maxRequests: 2,
				windowMs: ONE_MINUTE_MS,
				keyPrefix: 'status-limited',
			}
			const userId = 'user-at-limit'

			// Exhaust the limit
			await checkRateLimit(config.keyPrefix, userId, config)
			await checkRateLimit(config.keyPrefix, userId, config)

			const status = await getRateLimitStatus(config.keyPrefix, userId, config)
			expect(status.remaining).toBe(0)
			expect(status.isLimited).toBe(true)
		})
	})

	describe('clearRateLimits', () => {
		it('should clear all rate limit keys', async () => {
			const config = {
				maxRequests: 5,
				windowMs: ONE_MINUTE_MS,
				keyPrefix: 'clear-test',
			}

			// Create some rate limit entries
			await checkRateLimit(config.keyPrefix, 'user-1', config)
			await checkRateLimit(config.keyPrefix, 'user-2', config)

			// Clear all
			await clearRateLimits()

			// Verify users can make requests again
			const result1 = await checkRateLimit(config.keyPrefix, 'user-1', config)
			expect(result1.allowed).toBe(true)
			expect(result1.remaining).toBe(4) // Fresh start
		})
	})

	describe('predefined configs', () => {
		it('should have correct AVATAR_UPLOAD config', () => {
			expect(RATE_LIMIT_CONFIGS.AVATAR_UPLOAD).toEqual({
				maxRequests: 5,
				windowMs: ONE_MINUTE_MS,
				keyPrefix: 'avatar:upload',
			})
		})

		it('should have correct AVATAR_UPDATE config', () => {
			expect(RATE_LIMIT_CONFIGS.AVATAR_UPDATE).toEqual({
				maxRequests: 1,
				windowMs: ONE_WEEK_MS,
				keyPrefix: 'avatar:update',
			})
		})

		it('should have correct AVATAR_DELETE config', () => {
			expect(RATE_LIMIT_CONFIGS.AVATAR_DELETE).toEqual({
				maxRequests: 10,
				windowMs: ONE_MINUTE_MS,
				keyPrefix: 'avatar:delete',
			})
		})
	})

	describe('atomic behavior (simulated concurrency)', () => {
		it('should not allow more than maxRequests even with simulated concurrent calls', async () => {
			const config = {
				maxRequests: 1,
				windowMs: ONE_MINUTE_MS,
				keyPrefix: 'concurrent-test',
			}
			const userId = 'concurrent-user'

			// Simulate 5 "concurrent" requests
			// In real scenario with the Lua script, only 1 should succeed
			const results = await Promise.all([
				checkRateLimit(config.keyPrefix, userId, config),
				checkRateLimit(config.keyPrefix, userId, config),
				checkRateLimit(config.keyPrefix, userId, config),
				checkRateLimit(config.keyPrefix, userId, config),
				checkRateLimit(config.keyPrefix, userId, config),
			])

			const allowedCount = results.filter((r) => r.allowed).length
			const blockedCount = results.filter((r) => !r.allowed).length

			// With atomic Lua script, exactly 1 should be allowed
			expect(allowedCount).toBe(1)
			expect(blockedCount).toBe(4)
		})

		it('should correctly handle concurrent requests up to limit', async () => {
			const config = {
				maxRequests: 3,
				windowMs: ONE_MINUTE_MS,
				keyPrefix: 'concurrent-multi',
			}
			const userId = 'concurrent-multi-user'

			// Simulate 10 "concurrent" requests with limit of 3
			const results = await Promise.all(
				Array.from({ length: 10 }, () =>
					checkRateLimit(config.keyPrefix, userId, config)
				)
			)

			const allowedCount = results.filter((r) => r.allowed).length
			const blockedCount = results.filter((r) => !r.allowed).length

			// Exactly 3 should be allowed
			expect(allowedCount).toBe(3)
			expect(blockedCount).toBe(7)
		})
	})
})
