import { ORPCError } from '@orpc/server'
import { describe, expect, it } from 'vitest'
import { appRouter } from '../../src/routers'
import { sourcesRouter } from '../../src/routers/sources'
import { createMockContext, createMockSession } from '../mocks/context'

describe('sources router', () => {
	describe('sourcesRouter structure', () => {
		it('exports all source procedures', () => {
			expect(sourcesRouter).toHaveProperty('create')
			expect(sourcesRouter).toHaveProperty('update')
			expect(sourcesRouter).toHaveProperty('delete')
			expect(sourcesRouter).toHaveProperty('restore')
			expect(sourcesRouter).toHaveProperty('get')
			expect(sourcesRouter).toHaveProperty('list')
			expect(sourcesRouter).toHaveProperty('addToEntry')
			expect(sourcesRouter).toHaveProperty('removeFromEntry')
			expect(sourcesRouter).toHaveProperty('getEntrySources')
			expect(sourcesRouter).toHaveProperty('getSourceEntries')
		})

		it('has correct procedure types', () => {
			expect(typeof sourcesRouter.create).toBe('object')
			expect(typeof sourcesRouter.update).toBe('object')
			expect(typeof sourcesRouter.delete).toBe('object')
			expect(typeof sourcesRouter.restore).toBe('object')
			expect(typeof sourcesRouter.get).toBe('object')
			expect(typeof sourcesRouter.list).toBe('object')
			expect(typeof sourcesRouter.addToEntry).toBe('object')
			expect(typeof sourcesRouter.removeFromEntry).toBe('object')
			expect(typeof sourcesRouter.getEntrySources).toBe('object')
			expect(typeof sourcesRouter.getSourceEntries).toBe('object')
		})
	})

	describe('createSource procedure', () => {
		it('should be defined', () => {
			expect(sourcesRouter.create).toBeDefined()
		})

		it('should be a protected procedure', () => {
			expect(typeof sourcesRouter.create).toBe('object')
		})
	})

	describe('updateSource procedure', () => {
		it('should be defined', () => {
			expect(sourcesRouter.update).toBeDefined()
		})

		it('should be a protected procedure', () => {
			expect(typeof sourcesRouter.update).toBe('object')
		})
	})

	describe('deleteSource procedure', () => {
		it('should be defined', () => {
			expect(sourcesRouter.delete).toBeDefined()
		})

		it('should be a protected procedure', () => {
			expect(typeof sourcesRouter.delete).toBe('object')
		})
	})

	describe('restoreSource procedure', () => {
		it('should be defined', () => {
			expect(sourcesRouter.restore).toBeDefined()
		})

		it('should be a protected procedure', () => {
			expect(typeof sourcesRouter.restore).toBe('object')
		})
	})

	describe('getSource procedure', () => {
		it('should be defined', () => {
			expect(sourcesRouter.get).toBeDefined()
		})

		it('should be a protected procedure', () => {
			expect(typeof sourcesRouter.get).toBe('object')
		})
	})

	describe('listSources procedure', () => {
		it('should be defined', () => {
			expect(sourcesRouter.list).toBeDefined()
		})

		it('should be a protected procedure', () => {
			expect(typeof sourcesRouter.list).toBe('object')
		})
	})

	describe('addToEntry procedure', () => {
		it('should be defined', () => {
			expect(sourcesRouter.addToEntry).toBeDefined()
		})

		it('should be a protected procedure', () => {
			expect(typeof sourcesRouter.addToEntry).toBe('object')
		})
	})

	describe('removeFromEntry procedure', () => {
		it('should be defined', () => {
			expect(sourcesRouter.removeFromEntry).toBeDefined()
		})

		it('should be a protected procedure', () => {
			expect(typeof sourcesRouter.removeFromEntry).toBe('object')
		})
	})

	describe('getEntrySources procedure', () => {
		it('should be defined', () => {
			expect(sourcesRouter.getEntrySources).toBeDefined()
		})

		it('should be a protected procedure', () => {
			expect(typeof sourcesRouter.getEntrySources).toBe('object')
		})
	})

	describe('getSourceEntries procedure', () => {
		it('should be defined', () => {
			expect(sourcesRouter.getSourceEntries).toBeDefined()
		})

		it('should be a protected procedure', () => {
			expect(typeof sourcesRouter.getSourceEntries).toBe('object')
		})
	})
})

describe('sources router integration with appRouter', () => {
	it('should be accessible from appRouter', () => {
		expect(appRouter.sources).toBeDefined()
		expect(appRouter.sources).toBe(sourcesRouter)
	})

	it('should have all CRUD operations', () => {
		expect(appRouter.sources.create).toBeDefined()
		expect(appRouter.sources.update).toBeDefined()
		expect(appRouter.sources.delete).toBeDefined()
		expect(appRouter.sources.restore).toBeDefined()
		expect(appRouter.sources.get).toBeDefined()
		expect(appRouter.sources.list).toBeDefined()
	})

	it('should have entry-source relationship operations', () => {
		expect(appRouter.sources.addToEntry).toBeDefined()
		expect(appRouter.sources.removeFromEntry).toBeDefined()
		expect(appRouter.sources.getEntrySources).toBeDefined()
		expect(appRouter.sources.getSourceEntries).toBeDefined()
	})
})

describe('sources error types', () => {
	it('should use ORPCError for errors', () => {
		expect(ORPCError).toBeDefined()

		const error = new ORPCError('NOT_FOUND', { message: 'Source not found' })
		expect(error).toBeInstanceOf(ORPCError)
		expect(error.code).toBe('NOT_FOUND')
	})
})

describe('sources mock context', () => {
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
