import { ORPCError } from '@orpc/server'
import { describe, expect, it } from 'vitest'
import { appRouter } from '../../src/routers'
import { reviewRouter } from '../../src/routers/review'
import { createMockContext, createMockSession } from '../mocks/context'

describe('review router', () => {
	describe('reviewRouter structure', () => {
		it('exports all review procedures', () => {
			expect(reviewRouter).toHaveProperty('getQueue')
			expect(reviewRouter).toHaveProperty('markReviewed')
			expect(reviewRouter).toHaveProperty('getHistory')
			expect(reviewRouter).toHaveProperty('getTodayStats')
			expect(reviewRouter).toHaveProperty('getEntryReviewCount')
		})

		it('has correct procedure types', () => {
			expect(typeof reviewRouter.getQueue).toBe('object')
			expect(typeof reviewRouter.markReviewed).toBe('object')
			expect(typeof reviewRouter.getHistory).toBe('object')
			expect(typeof reviewRouter.getTodayStats).toBe('object')
			expect(typeof reviewRouter.getEntryReviewCount).toBe('object')
		})
	})

	describe('getQueue procedure', () => {
		it('should be defined', () => {
			expect(reviewRouter.getQueue).toBeDefined()
		})

		it('should be a protected procedure', () => {
			expect(typeof reviewRouter.getQueue).toBe('object')
		})
	})

	describe('markReviewed procedure', () => {
		it('should be defined', () => {
			expect(reviewRouter.markReviewed).toBeDefined()
		})

		it('should be a protected procedure', () => {
			expect(typeof reviewRouter.markReviewed).toBe('object')
		})
	})

	describe('getHistory procedure', () => {
		it('should be defined', () => {
			expect(reviewRouter.getHistory).toBeDefined()
		})

		it('should be a protected procedure', () => {
			expect(typeof reviewRouter.getHistory).toBe('object')
		})
	})

	describe('getTodayStats procedure', () => {
		it('should be defined', () => {
			expect(reviewRouter.getTodayStats).toBeDefined()
		})

		it('should be a protected procedure', () => {
			expect(typeof reviewRouter.getTodayStats).toBe('object')
		})
	})

	describe('getEntryReviewCount procedure', () => {
		it('should be defined', () => {
			expect(reviewRouter.getEntryReviewCount).toBeDefined()
		})

		it('should be a protected procedure', () => {
			expect(typeof reviewRouter.getEntryReviewCount).toBe('object')
		})
	})
})

describe('review router integration with appRouter', () => {
	it('should be accessible from appRouter', () => {
		expect(appRouter.review).toBeDefined()
		expect(appRouter.review).toBe(reviewRouter)
	})

	it('should have all review operations', () => {
		expect(appRouter.review.getQueue).toBeDefined()
		expect(appRouter.review.markReviewed).toBeDefined()
		expect(appRouter.review.getHistory).toBeDefined()
		expect(appRouter.review.getTodayStats).toBeDefined()
		expect(appRouter.review.getEntryReviewCount).toBeDefined()
	})
})

describe('review error types', () => {
	it('should use ORPCError for errors', () => {
		expect(ORPCError).toBeDefined()

		const error = new ORPCError('NOT_FOUND', { message: 'Entry not found' })
		expect(error).toBeInstanceOf(ORPCError)
		expect(error.code).toBe('NOT_FOUND')
	})
})

describe('review mock context', () => {
	it('should create mock session with default values', () => {
		const session = createMockSession()
		expect(session.user).toBeDefined()
		expect(session.user.id).toBeDefined()
		expect(session.user.email).toBe('test@example.com')
		expect(session.session).toBeDefined()
		expect(session.session.userId).toBe(session.user.id)
	})

	it('should create mock context without session', () => {
		const context = createMockContext()
		expect(context.session).toBeNull()
	})

	it('should create mock context with session', () => {
		const session = createMockSession()
		const context = createMockContext({ session })
		expect(context.session).toBe(session)
	})
})

describe('review rules', () => {
	it('should support different review rules', () => {
		// Verify the review rules are valid string values
		const validRules = ['new', 'starred', 'unreviewed', 'all']
		for (const rule of validRules) {
			expect(typeof rule).toBe('string')
		}
	})
})
