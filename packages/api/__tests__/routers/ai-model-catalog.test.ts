import { describe, expect, it } from 'vitest'

/**
 * Tests for model catalog merge logic
 *
 * These are pure function tests that verify the merging behavior
 * of default model settings with user overrides.
 */

/**
 * Represents a model from the default model list
 */
type DefaultModel = {
	id: string
	providerId: string
	type: string
	displayName: string
	enabled?: boolean
}

/**
 * Represents a user's override setting for a model
 */
type UserOverride = {
	providerId: string
	modelId: string
	type: string
	enabled: boolean
}

/**
 * Merge default model list with user overrides
 * This is the core logic used in ai.getModelCatalog
 */
function mergeModelSettings(
	defaultModels: DefaultModel[],
	userOverrides: UserOverride[]
): Array<DefaultModel & { enabled: boolean }> {
	// Create a map for quick lookup of user overrides
	const overrideMap = new Map<string, boolean>()
	for (const override of userOverrides) {
		const key = `${override.providerId}:${override.modelId}:${override.type}`
		overrideMap.set(key, override.enabled)
	}

	// Merge defaults with overrides
	return defaultModels.map((model) => {
		const key = `${model.providerId}:${model.id}:${model.type}`
		const userEnabled = overrideMap.get(key)

		return {
			...model,
			enabled: userEnabled !== undefined ? userEnabled : Boolean(model.enabled),
		}
	})
}

/**
 * Validate that a model exists in the default list
 * This is used in ai.setModelEnabled to prevent invalid data
 */
function validateModelExists(
	defaultModels: DefaultModel[],
	providerId: string,
	modelId: string,
	type: string
): boolean {
	return defaultModels.some(
		(m) => m.providerId === providerId && m.id === modelId && m.type === type
	)
}

describe('Model Catalog Merge Logic', () => {
	const defaultModels: DefaultModel[] = [
		{
			id: 'gpt-4o',
			providerId: 'openai',
			type: 'chat',
			displayName: 'GPT-4o',
			enabled: true,
		},
		{
			id: 'gpt-4o-mini',
			providerId: 'openai',
			type: 'chat',
			displayName: 'GPT-4o Mini',
			enabled: true,
		},
		{
			id: 'claude-sonnet-4-20250514',
			providerId: 'anthropic',
			type: 'chat',
			displayName: 'Claude Sonnet 4',
			enabled: true,
		},
		{
			id: 'text-embedding-3-small',
			providerId: 'openai',
			type: 'embedding',
			displayName: 'Text Embedding 3 Small',
			enabled: false,
		},
		{
			id: 'dall-e-3',
			providerId: 'openai',
			type: 'image',
			displayName: 'DALL-E 3',
			// enabled is undefined, should default to false
		},
	]

	describe('mergeModelSettings', () => {
		it('should use default enabled value when no user override exists', () => {
			const result = mergeModelSettings(defaultModels, [])

			expect(result.find((m) => m.id === 'gpt-4o')?.enabled).toBe(true)
			expect(result.find((m) => m.id === 'text-embedding-3-small')?.enabled).toBe(
				false
			)
		})

		it('should default to false when enabled is undefined', () => {
			const result = mergeModelSettings(defaultModels, [])

			expect(result.find((m) => m.id === 'dall-e-3')?.enabled).toBe(false)
		})

		it('should apply user override to disable a model', () => {
			const userOverrides: UserOverride[] = [
				{
					providerId: 'openai',
					modelId: 'gpt-4o',
					type: 'chat',
					enabled: false,
				},
			]

			const result = mergeModelSettings(defaultModels, userOverrides)

			expect(result.find((m) => m.id === 'gpt-4o')?.enabled).toBe(false)
			// Other models should be unaffected
			expect(result.find((m) => m.id === 'gpt-4o-mini')?.enabled).toBe(true)
		})

		it('should apply user override to enable a model', () => {
			const userOverrides: UserOverride[] = [
				{
					providerId: 'openai',
					modelId: 'text-embedding-3-small',
					type: 'embedding',
					enabled: true,
				},
			]

			const result = mergeModelSettings(defaultModels, userOverrides)

			expect(result.find((m) => m.id === 'text-embedding-3-small')?.enabled).toBe(
				true
			)
		})

		it('should handle multiple user overrides', () => {
			const userOverrides: UserOverride[] = [
				{
					providerId: 'openai',
					modelId: 'gpt-4o',
					type: 'chat',
					enabled: false,
				},
				{
					providerId: 'openai',
					modelId: 'gpt-4o-mini',
					type: 'chat',
					enabled: false,
				},
				{
					providerId: 'openai',
					modelId: 'dall-e-3',
					type: 'image',
					enabled: true,
				},
			]

			const result = mergeModelSettings(defaultModels, userOverrides)

			expect(result.find((m) => m.id === 'gpt-4o')?.enabled).toBe(false)
			expect(result.find((m) => m.id === 'gpt-4o-mini')?.enabled).toBe(false)
			expect(result.find((m) => m.id === 'dall-e-3')?.enabled).toBe(true)
			// Claude should still use default
			expect(result.find((m) => m.id === 'claude-sonnet-4-20250514')?.enabled).toBe(
				true
			)
		})

		it('should distinguish models by type', () => {
			// Hypothetical case: same model ID with different types
			const modelsWithSameId: DefaultModel[] = [
				{
					id: 'model-x',
					providerId: 'test',
					type: 'chat',
					displayName: 'Model X Chat',
					enabled: true,
				},
				{
					id: 'model-x',
					providerId: 'test',
					type: 'embedding',
					displayName: 'Model X Embedding',
					enabled: false,
				},
			]

			const userOverrides: UserOverride[] = [
				{
					providerId: 'test',
					modelId: 'model-x',
					type: 'chat',
					enabled: false,
				},
			]

			const result = mergeModelSettings(modelsWithSameId, userOverrides)

			const chatModel = result.find((m) => m.id === 'model-x' && m.type === 'chat')
			const embeddingModel = result.find(
				(m) => m.id === 'model-x' && m.type === 'embedding'
			)

			expect(chatModel?.enabled).toBe(false)
			expect(embeddingModel?.enabled).toBe(false) // Still uses default
		})
	})

	describe('validateModelExists', () => {
		it('should return true for existing model', () => {
			expect(validateModelExists(defaultModels, 'openai', 'gpt-4o', 'chat')).toBe(
				true
			)
		})

		it('should return false for non-existing model', () => {
			expect(
				validateModelExists(defaultModels, 'openai', 'non-existent', 'chat')
			).toBe(false)
		})

		it('should return false for wrong type', () => {
			expect(
				validateModelExists(defaultModels, 'openai', 'gpt-4o', 'embedding')
			).toBe(false)
		})

		it('should return false for wrong provider', () => {
			expect(validateModelExists(defaultModels, 'anthropic', 'gpt-4o', 'chat')).toBe(
				false
			)
		})
	})
})
