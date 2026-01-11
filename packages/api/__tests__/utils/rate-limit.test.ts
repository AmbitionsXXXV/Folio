import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
	checkRateLimit,
	clearRateLimits,
	RATE_LIMIT_CONFIGS,
} from '../../src/utils/rate-limit'

const ONE_SECOND_MS = 1000
const ONE_MINUTE_MS = 60 * ONE_SECOND_MS
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS
const ONE_DAY_MS = 24 * ONE_HOUR_MS
const ONE_WEEK_MS = 7 * ONE_DAY_MS

// Mock Redis store for testing
const mockRedisStore = new Map<string, unknown>()

vi.mock('../../src/utils/redis', () => ({
	getRedisClient: () => ({
		get: vi.fn(async (key: string) => mockRedisStore.get(key) ?? null),
		set: vi.fn((key: string, value: unknown) => {
			mockRedisStore.set(key, value)
			return 'OK'
		}),
		del: vi.fn((...keys: string[]) => {
			for (const key of keys) {
				mockRedisStore.delete(key)
			}
			return keys.length
		}),
		scan: vi.fn(async () => [0, []]),
	}),
}))

describe('rate-limit', () => {
	beforeEach(async () => {
		mockRedisStore.clear()
		await clearRateLimits()
	})

	it('should allow only one avatar update per week window', async () => {
		const config = RATE_LIMIT_CONFIGS.AVATAR_UPDATE
		const userId = 'user-id'

		expect(config.maxRequests).toBe(1)
		expect(config.windowMs).toBe(ONE_WEEK_MS)

		const first = await checkRateLimit(config.keyPrefix, userId, config)
		expect(first.allowed).toBe(true)
		expect(first.isLimited).toBe(false)
		expect(first.remaining).toBe(0)

		const second = await checkRateLimit(config.keyPrefix, userId, config)
		expect(second.allowed).toBe(false)
		expect(second.isLimited).toBe(true)
		expect(second.remaining).toBe(0)
	})
})
