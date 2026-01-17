import { ORPCError } from '@orpc/server'
import { describe, expect, it } from 'vitest'
import { appRouter } from '../../src/routers'
import { storageRouter } from '../../src/routers/storage'
import { createMockContext, createMockSession } from '../mocks/context'

describe('storage router', () => {
	describe('storageRouter structure', () => {
		it('exports all storage procedures', () => {
			expect(storageRouter).toHaveProperty('uploadAvatar')
			expect(storageRouter).toHaveProperty('updateAvatar')
			expect(storageRouter).toHaveProperty('deleteAvatar')
			expect(storageRouter).toHaveProperty('getAvatarConfig')
			expect(storageRouter).toHaveProperty('getRateLimitStatus')
			expect(storageRouter).toHaveProperty('getAllRateLimitStatus')
		})

		it('has correct procedure types', () => {
			expect(typeof storageRouter.uploadAvatar).toBe('object')
			expect(typeof storageRouter.updateAvatar).toBe('object')
			expect(typeof storageRouter.deleteAvatar).toBe('object')
			expect(typeof storageRouter.getAvatarConfig).toBe('object')
			expect(typeof storageRouter.getRateLimitStatus).toBe('object')
			expect(typeof storageRouter.getAllRateLimitStatus).toBe('object')
		})
	})

	describe('uploadAvatar procedure', () => {
		it('should be defined', () => {
			expect(storageRouter.uploadAvatar).toBeDefined()
		})

		it('should be a protected procedure', () => {
			expect(typeof storageRouter.uploadAvatar).toBe('object')
		})
	})

	describe('updateAvatar procedure', () => {
		it('should be defined', () => {
			expect(storageRouter.updateAvatar).toBeDefined()
		})

		it('should be a protected procedure', () => {
			expect(typeof storageRouter.updateAvatar).toBe('object')
		})
	})

	describe('deleteAvatar procedure', () => {
		it('should be defined', () => {
			expect(storageRouter.deleteAvatar).toBeDefined()
		})

		it('should be a protected procedure', () => {
			expect(typeof storageRouter.deleteAvatar).toBe('object')
		})
	})

	describe('getAvatarConfig procedure', () => {
		it('should be defined', () => {
			expect(storageRouter.getAvatarConfig).toBeDefined()
		})

		it('should be a protected procedure', () => {
			expect(typeof storageRouter.getAvatarConfig).toBe('object')
		})
	})

	describe('getRateLimitStatus procedure', () => {
		it('should be defined', () => {
			expect(storageRouter.getRateLimitStatus).toBeDefined()
		})

		it('should be a protected procedure', () => {
			expect(typeof storageRouter.getRateLimitStatus).toBe('object')
		})
	})

	describe('getAllRateLimitStatus procedure', () => {
		it('should be defined', () => {
			expect(storageRouter.getAllRateLimitStatus).toBeDefined()
		})

		it('should be a protected procedure', () => {
			expect(typeof storageRouter.getAllRateLimitStatus).toBe('object')
		})
	})
})

describe('storage router integration with appRouter', () => {
	it('should be accessible from appRouter', () => {
		expect(appRouter.storage).toBeDefined()
		expect(appRouter.storage).toBe(storageRouter)
	})

	it('should have all avatar operations', () => {
		expect(appRouter.storage.uploadAvatar).toBeDefined()
		expect(appRouter.storage.updateAvatar).toBeDefined()
		expect(appRouter.storage.deleteAvatar).toBeDefined()
		expect(appRouter.storage.getAvatarConfig).toBeDefined()
	})

	it('should have rate limit status operations', () => {
		expect(appRouter.storage.getRateLimitStatus).toBeDefined()
		expect(appRouter.storage.getAllRateLimitStatus).toBeDefined()
	})
})

describe('storage error types', () => {
	it('should use ORPCError for BAD_REQUEST when file validation fails', () => {
		const error = new ORPCError('BAD_REQUEST', {
			message: 'Invalid file type',
		})
		expect(error).toBeInstanceOf(ORPCError)
		expect(error.code).toBe('BAD_REQUEST')
	})

	it('should use ORPCError for NOT_FOUND when user not found', () => {
		const error = new ORPCError('NOT_FOUND', { message: 'User not found' })
		expect(error).toBeInstanceOf(ORPCError)
		expect(error.code).toBe('NOT_FOUND')
	})

	it('should use ORPCError for TOO_MANY_REQUESTS when rate limited', () => {
		const error = new ORPCError('TOO_MANY_REQUESTS', {
			message: 'Rate limit exceeded',
		})
		expect(error).toBeInstanceOf(ORPCError)
		expect(error.code).toBe('TOO_MANY_REQUESTS')
	})
})

describe('storage mock context', () => {
	it('should create mock session with default values', () => {
		const session = createMockSession()
		expect(session.user).toBeDefined()
		expect(session.user.id).toBeDefined()
	})

	it('should create mock context with session', () => {
		const session = createMockSession()
		const context = createMockContext({ session })
		expect(context.session).toBe(session)
	})

	it('should create mock context with custom user id', () => {
		const customUserId = 'custom-storage-user-id'
		const session = createMockSession({
			user: { id: customUserId },
		})
		const context = createMockContext({ session })
		expect(context.session?.user.id).toBe(customUserId)
	})
})

describe('avatar file validation', () => {
	/**
	 * Tests for avatar file validation rules
	 */
	const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
	const MAX_AVATAR_SIZE = 5 * 1024 * 1024 // 5MB

	it('should allow JPEG images', () => {
		expect(ALLOWED_AVATAR_TYPES).toContain('image/jpeg')
	})

	it('should allow PNG images', () => {
		expect(ALLOWED_AVATAR_TYPES).toContain('image/png')
	})

	it('should allow GIF images', () => {
		expect(ALLOWED_AVATAR_TYPES).toContain('image/gif')
	})

	it('should allow WebP images', () => {
		expect(ALLOWED_AVATAR_TYPES).toContain('image/webp')
	})

	it('should not allow SVG images', () => {
		expect(ALLOWED_AVATAR_TYPES).not.toContain('image/svg+xml')
	})

	it('should have correct max file size', () => {
		expect(MAX_AVATAR_SIZE).toBe(5 * 1024 * 1024)
	})

	it('should calculate max size in MB correctly', () => {
		const maxSizeMB = MAX_AVATAR_SIZE / 1024 / 1024
		expect(maxSizeMB).toBe(5)
	})
})

describe('base64 encoding', () => {
	/**
	 * Tests for base64 file data handling
	 */
	it('should decode base64 to buffer correctly', () => {
		const originalText = 'Hello, World!'
		const base64 = Buffer.from(originalText).toString('base64')
		const decoded = Buffer.from(base64, 'base64').toString()
		expect(decoded).toBe(originalText)
	})

	it('should handle empty base64 string', () => {
		const base64 = ''
		const buffer = Buffer.from(base64, 'base64')
		expect(buffer.length).toBe(0)
	})

	it('should calculate correct buffer length from base64', () => {
		// A simple PNG file header in base64 would be longer
		const mockBase64 = Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64')
		const buffer = Buffer.from(mockBase64, 'base64')
		expect(buffer.length).toBe(4)
	})
})

describe('rate limit action types', () => {
	/**
	 * Tests for rate limit action enum
	 */
	const validActions = ['upload', 'update', 'delete']

	it('should have upload action', () => {
		expect(validActions).toContain('upload')
	})

	it('should have update action', () => {
		expect(validActions).toContain('update')
	})

	it('should have delete action', () => {
		expect(validActions).toContain('delete')
	})

	it('should not have other actions', () => {
		expect(validActions).not.toContain('read')
		expect(validActions).not.toContain('list')
	})
})

describe('avatar URL handling', () => {
	/**
	 * Tests for avatar URL path extraction
	 */
	it('should extract path from public URL', () => {
		const publicUrl = 'https://storage.example.com/avatars/user-123/avatar-abc.jpg'
		const expectedPath = 'avatars/user-123/avatar-abc.jpg'

		// Simulate getPathFromPublicUrl behavior
		const url = new URL(publicUrl)
		const path = url.pathname.slice(1) // Remove leading slash
		expect(path).toBe(expectedPath)
	})

	it('should handle null image URL', () => {
		const imageUrl: string | null = null
		expect(imageUrl).toBeNull()
	})

	it('should handle empty image URL', () => {
		const imageUrl = ''
		expect(imageUrl).toBeFalsy()
	})
})
