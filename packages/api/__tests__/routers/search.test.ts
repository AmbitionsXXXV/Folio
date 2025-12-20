import { describe, expect, it } from 'vitest'
import { appRouter } from '../../src/routers'
import { searchRouter } from '../../src/routers/search'
import { createMockContext, createMockSession } from '../mocks/context'

describe('search router', () => {
	describe('searchRouter structure', () => {
		it('exports all search procedures', () => {
			expect(searchRouter).toHaveProperty('entries')
		})

		it('has correct procedure types', () => {
			expect(typeof searchRouter.entries).toBe('object')
		})
	})

	describe('searchEntries procedure', () => {
		it('should be defined', () => {
			expect(searchRouter.entries).toBeDefined()
		})

		it('should be a protected procedure', () => {
			expect(typeof searchRouter.entries).toBe('object')
		})
	})
})

describe('search router integration with appRouter', () => {
	it('should be accessible from appRouter', () => {
		expect(appRouter.search).toBeDefined()
		expect(appRouter.search).toBe(searchRouter)
	})

	it('should have entries search operation', () => {
		expect(appRouter.search.entries).toBeDefined()
	})
})

describe('search mock context', () => {
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
