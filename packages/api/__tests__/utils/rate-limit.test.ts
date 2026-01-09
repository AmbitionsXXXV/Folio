import { afterAll, beforeEach, describe, expect, it } from 'vitest'
import {
	checkRateLimit,
	clearRateLimits,
	RATE_LIMIT_CONFIGS,
	stopCleanupTimer,
} from '../../src/utils/rate-limit'

const ONE_SECOND_MS = 1000
const ONE_MINUTE_MS = 60 * ONE_SECOND_MS
const ONE_HOUR_MS = 60 * ONE_MINUTE_MS
const ONE_DAY_MS = 24 * ONE_HOUR_MS
const ONE_WEEK_MS = 7 * ONE_DAY_MS

describe('rate-limit', () => {
	beforeEach(() => {
		clearRateLimits()
	})

	afterAll(() => {
		stopCleanupTimer()
	})

	it('should allow only one avatar update per week window', () => {
		const config = RATE_LIMIT_CONFIGS.AVATAR_UPDATE
		const userId = 'user-id'

		expect(config.maxRequests).toBe(1)
		expect(config.windowMs).toBe(ONE_WEEK_MS)

		const first = checkRateLimit(config.keyPrefix, userId, config)
		expect(first.allowed).toBe(true)
		expect(first.isLimited).toBe(false)
		expect(first.remaining).toBe(0)

		const second = checkRateLimit(config.keyPrefix, userId, config)
		expect(second.allowed).toBe(false)
		expect(second.isLimited).toBe(true)
		expect(second.remaining).toBe(0)
	})
})
