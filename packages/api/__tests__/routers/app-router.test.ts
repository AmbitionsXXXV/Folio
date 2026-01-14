import { describe, expect, it } from 'vitest'
import { appRouter } from '../../src/routers'

describe('appRouter structure', () => {
	it('exports healthCheck procedure', () => {
		expect(appRouter.healthCheck).toBeDefined()
		expect(typeof appRouter.healthCheck).toBe('object')
	})

	it('exports privateData procedure', () => {
		expect(appRouter.privateData).toBeDefined()
		expect(typeof appRouter.privateData).toBe('object')
	})

	it('exports entries router', () => {
		expect(appRouter.entries).toBeDefined()
		expect(typeof appRouter.entries).toBe('object')
	})

	it('exports ai router', () => {
		expect(appRouter.ai).toBeDefined()
		expect(typeof appRouter.ai).toBe('object')
	})

	it('has correct procedure types', () => {
		// Verify the router structure is correct
		expect(appRouter).toHaveProperty('healthCheck')
		expect(appRouter).toHaveProperty('privateData')
		expect(appRouter).toHaveProperty('entries')
		expect(appRouter).toHaveProperty('ai')
	})

	it('entries router has all required procedures', () => {
		expect(appRouter.entries).toHaveProperty('create')
		expect(appRouter.entries).toHaveProperty('update')
		expect(appRouter.entries).toHaveProperty('delete')
		expect(appRouter.entries).toHaveProperty('restore')
		expect(appRouter.entries).toHaveProperty('get')
		expect(appRouter.entries).toHaveProperty('list')
	})

	it('ai router has required procedures', () => {
		expect(appRouter.ai).toHaveProperty('healthCheck')
		expect(appRouter.ai).toHaveProperty('listProviders')
		expect(appRouter.ai).toHaveProperty('getProvider')
		expect(appRouter.ai).toHaveProperty('getPromptVersions')
		expect(appRouter.ai).toHaveProperty('getConfig')
		expect(appRouter.ai).toHaveProperty('generateText')
	})
})
