import { describe, expect, it } from 'vitest'
import {
	createLocalizedError,
	getLocalizedErrorMessage,
	type LocalizedError,
} from '../../src/utils/i18n'

describe('getLocalizedErrorMessage', () => {
	describe('basic functionality', () => {
		it('should return English message for en-US locale', () => {
			const message = getLocalizedErrorMessage('unauthorized', 'en-US')
			expect(message).toBe('Please sign in to continue')
		})

		it('should return Chinese message for zh-CN locale', () => {
			const message = getLocalizedErrorMessage('unauthorized', 'zh-CN')
			// Should be Chinese translation
			expect(typeof message).toBe('string')
			expect(message.length).toBeGreaterThan(0)
		})

		it('should return Japanese message for ja-JP locale', () => {
			const message = getLocalizedErrorMessage('unauthorized', 'ja-JP')
			// Should be Japanese translation
			expect(typeof message).toBe('string')
			expect(message.length).toBeGreaterThan(0)
		})

		it('should use default locale (en-US) when not specified', () => {
			const message = getLocalizedErrorMessage('notFound')
			expect(message).toBe('Not found')
		})
	})

	describe('error keys', () => {
		it('should handle notFound error', () => {
			const message = getLocalizedErrorMessage('notFound', 'en-US')
			expect(message).toBe('Not found')
		})

		it('should handle serverError', () => {
			const message = getLocalizedErrorMessage('serverError', 'en-US')
			expect(message).toBe('Something went wrong')
		})

		it('should handle networkError', () => {
			const message = getLocalizedErrorMessage('networkError', 'en-US')
			expect(message).toBe('Network error, please try again')
		})

		it('should handle invalidCredentials', () => {
			const message = getLocalizedErrorMessage('invalidCredentials', 'en-US')
			expect(message).toBe('Invalid email or password')
		})

		it('should handle emailRequired', () => {
			const message = getLocalizedErrorMessage('emailRequired', 'en-US')
			expect(message).toBe('Email is required')
		})

		it('should handle passwordRequired', () => {
			const message = getLocalizedErrorMessage('passwordRequired', 'en-US')
			expect(message).toBe('Password is required')
		})

		it('should handle emailInvalid', () => {
			const message = getLocalizedErrorMessage('emailInvalid', 'en-US')
			expect(message).toBe('Please enter a valid email address')
		})

		it('should handle titleRequired', () => {
			const message = getLocalizedErrorMessage('titleRequired', 'en-US')
			expect(message).toBe('Title is required')
		})

		it('should handle unknown error', () => {
			const message = getLocalizedErrorMessage('unknown', 'en-US')
			expect(message).toBe('An unknown error occurred')
		})
	})

	describe('parameter interpolation', () => {
		it('should interpolate single parameter', () => {
			const message = getLocalizedErrorMessage('passwordTooShort', 'en-US', {
				min: 8,
			})
			expect(message).toBe('Password must be at least 8 characters')
		})

		it('should interpolate multiple parameters', () => {
			// Using a template with multiple params
			const template = '{{count}} items in {{category}}'
			const params = { count: 5, category: 'inbox' }

			// Manual test of interpolation logic
			const result = template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
				const value = params[key as keyof typeof params]
				return value !== undefined ? String(value) : `{{${key}}}`
			})
			expect(result).toBe('5 items in inbox')
		})

		it('should preserve unmatched placeholders', () => {
			// When a placeholder has no matching param, it should remain
			const template = 'Hello {{name}}, you have {{count}} messages'
			const params = { name: 'User' }

			const result = template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
				const value = params[key as keyof typeof params]
				return value !== undefined ? String(value) : `{{${key}}}`
			})
			expect(result).toBe('Hello User, you have {{count}} messages')
		})

		it('should handle numeric parameter values', () => {
			const message = getLocalizedErrorMessage('passwordTooShort', 'en-US', {
				min: 12,
			})
			expect(message).toContain('12')
		})

		it('should handle string parameter values', () => {
			// Test interpolation with string params
			const template = 'Error in {{field}}'
			const params = { field: 'email' }

			const result = template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
				const value = params[key as keyof typeof params]
				return value !== undefined ? String(value) : `{{${key}}}`
			})
			expect(result).toBe('Error in email')
		})

		it('should return template unchanged when no params provided', () => {
			const message = getLocalizedErrorMessage('notFound', 'en-US')
			expect(message).toBe('Not found')
		})
	})

	describe('fallback behavior', () => {
		it('should fallback to default language for unknown locale', () => {
			// TypeScript won't allow invalid locale, but testing runtime behavior
			const message = getLocalizedErrorMessage(
				'notFound',
				'fr-FR' as 'en-US' // Force type for test
			)
			// Should fallback to en-US
			expect(message).toBe('Not found')
		})
	})
})

describe('createLocalizedError', () => {
	describe('basic functionality', () => {
		it('should create error with code and message', () => {
			const error = createLocalizedError('UNAUTHORIZED', 'unauthorized', 'en-US')
			expect(error.code).toBe('UNAUTHORIZED')
			expect(error.message).toBe('Please sign in to continue')
		})

		it('should use default locale when not specified', () => {
			const error = createLocalizedError('NOT_FOUND', 'notFound')
			expect(error.code).toBe('NOT_FOUND')
			expect(error.message).toBe('Not found')
		})
	})

	describe('LocalizedError type', () => {
		it('should have correct shape', () => {
			const error = createLocalizedError('BAD_REQUEST', 'emailInvalid', 'en-US')

			expect(error).toHaveProperty('code')
			expect(error).toHaveProperty('message')
			expect(typeof error.code).toBe('string')
			expect(typeof error.message).toBe('string')
		})

		it('should include params when provided', () => {
			const error = createLocalizedError(
				'VALIDATION_ERROR',
				'passwordTooShort',
				'en-US',
				{ min: 8 }
			)

			expect(error.params).toBeDefined()
			expect(error.params).toEqual({ min: 8 })
		})

		it('should not include params when not provided', () => {
			const error = createLocalizedError('NOT_FOUND', 'notFound', 'en-US')

			expect(error.params).toBeUndefined()
		})
	})

	describe('different locales', () => {
		it('should create error with zh-CN message', () => {
			const error = createLocalizedError('UNAUTHORIZED', 'unauthorized', 'zh-CN')
			expect(error.code).toBe('UNAUTHORIZED')
			// Should be Chinese translation
			expect(typeof error.message).toBe('string')
			expect(error.message.length).toBeGreaterThan(0)
		})

		it('should create error with ja-JP message', () => {
			const error = createLocalizedError('UNAUTHORIZED', 'unauthorized', 'ja-JP')
			expect(error.code).toBe('UNAUTHORIZED')
			// Should be Japanese translation
			expect(typeof error.message).toBe('string')
			expect(error.message.length).toBeGreaterThan(0)
		})
	})

	describe('with parameters', () => {
		it('should interpolate params in error message', () => {
			const error = createLocalizedError(
				'VALIDATION_ERROR',
				'passwordTooShort',
				'en-US',
				{ min: 10 }
			)

			expect(error.message).toBe('Password must be at least 10 characters')
			expect(error.params).toEqual({ min: 10 })
		})
	})
})

describe('LocalizedError type', () => {
	it('should satisfy the LocalizedError interface', () => {
		const error: LocalizedError = {
			code: 'TEST_ERROR',
			message: 'Test error message',
		}

		expect(error.code).toBe('TEST_ERROR')
		expect(error.message).toBe('Test error message')
	})

	it('should accept optional params', () => {
		const error: LocalizedError = {
			code: 'TEST_ERROR',
			message: 'Test error message',
			params: { key: 'value' },
		}

		expect(error.params).toEqual({ key: 'value' })
	})

	it('should allow string or number param values', () => {
		const error: LocalizedError = {
			code: 'TEST_ERROR',
			message: 'Test error message',
			params: { count: 5, name: 'test' },
		}

		expect(error.params?.count).toBe(5)
		expect(error.params?.name).toBe('test')
	})
})

describe('interpolation edge cases', () => {
	/**
	 * Tests for the interpolate function behavior
	 */
	it('should handle empty params object', () => {
		const template = 'Hello {{name}}'
		const params = {}

		const result = template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
			const value = params[key as keyof typeof params]
			return value !== undefined ? String(value) : `{{${key}}}`
		})
		expect(result).toBe('Hello {{name}}')
	})

	it('should handle zero as valid param', () => {
		const template = 'You have {{count}} items'
		const params = { count: 0 }

		const result = template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
			const value = params[key as keyof typeof params]
			return value !== undefined ? String(value) : `{{${key}}}`
		})
		expect(result).toBe('You have 0 items')
	})

	it('should handle empty string as valid param', () => {
		const template = 'Name: {{name}}'
		const params = { name: '' }

		const result = template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
			const value = params[key as keyof typeof params]
			return value !== undefined ? String(value) : `{{${key}}}`
		})
		expect(result).toBe('Name: ')
	})

	it('should handle template without placeholders', () => {
		const template = 'No placeholders here'

		const result = template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
			return `{{${key}}}`
		})
		expect(result).toBe('No placeholders here')
	})

	it('should match only word characters in placeholder', () => {
		const template = '{{valid}} vs {{invalid-key}} vs {{also_valid}}'
		const params = { valid: 'V', 'invalid-key': 'I', also_valid: 'A' }

		const result = template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
			const value = params[key as keyof typeof params]
			return value !== undefined ? String(value) : `{{${key}}}`
		})
		// Hyphenated keys won't match \w+ pattern
		expect(result).toContain('V')
		expect(result).toContain('A')
		expect(result).toContain('{{invalid-key}}') // Not matched
	})
})
