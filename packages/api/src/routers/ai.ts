/**
 * AI Router
 *
 * API gateway for AI capabilities provided by @folionote/ai
 *
 * This router handles:
 * - BYOK credential management
 * - AI operations (summarize, review suggest, etc.)
 * - Usage tracking
 * - Model catalog management (user-level enabled/disabled overrides)
 */

import {
	AI_PROVIDERS,
	type AiProvider,
	type DecryptedCredential,
	PROMPT_VERSIONS,
	PROVIDER_CONFIGS,
} from '@folionote/ai'
import { generateTextWithCredential } from '@folionote/ai/generate-text'
import { db, userAiModelSettings, userAiProviderSettings } from '@folionote/db'
import {
	DEFAULT_MODEL_PROVIDER_LIST,
	FOLIO_DEFAULT_MODEL_LIST,
	MODEL_TYPES,
} from '@folionote/model-list'
import { ORPCError } from '@orpc/server'
import { and, eq } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { protectedProcedure, publicProcedure } from '../index'

const GENERATE_TEXT_PROMPT_MAX_LENGTH = 20_000

/**
 * Mapping from API provider IDs to model-list provider IDs
 * API uses: openai, deepseek, gemini, claude, qwen
 * model-list uses: openai, deepseek, google, anthropic, qwen, xai
 */
const API_TO_MODEL_LIST_PROVIDER: Record<string, string> = {
	openai: 'openai',
	deepseek: 'deepseek',
	gemini: 'google',
	claude: 'anthropic',
	qwen: 'qwen',
}

/**
 * List supported AI providers
 */
const listProviders = publicProcedure.handler(() => {
	return AI_PROVIDERS.map((id) => ({
		id,
		name: PROVIDER_CONFIGS[id].name,
		capabilities: PROVIDER_CONFIGS[id].capabilities,
	}))
})

/**
 * Get provider details
 */
const getProvider = publicProcedure
	.input(
		z.object({
			provider: z.enum(AI_PROVIDERS),
		})
	)
	.handler(({ input }) => {
		const config = PROVIDER_CONFIGS[input.provider as AiProvider]
		return {
			id: config.id,
			name: config.name,
			capabilities: config.capabilities,
			defaultModels: config.defaultModels,
		}
	})

/**
 * Get current prompt versions
 */
const getPromptVersions = publicProcedure.handler(() => {
	return PROMPT_VERSIONS
})

/**
 * Health check for AI module
 */
const healthCheck = publicProcedure.handler(() => {
	return {
		status: 'ok',
		providers: AI_PROVIDERS.length,
		timestamp: new Date().toISOString(),
	}
})

/**
 * Placeholder for user's AI configuration
 * Will be implemented in BYOK phase
 */
const getConfig = protectedProcedure.handler(({ context }) => {
	return {
		userId: context.session.user.id,
		// Placeholder - will be populated from user_ai_credentials table
		configuredProviders: [] as AiProvider[],
		defaultProvider: null as AiProvider | null,
	}
})

const GenerateTextInputSchema = z.object({
	provider: z.enum(AI_PROVIDERS),
	apiKey: z.string().trim().min(1),
	baseUrl: z.string().trim().url().optional(),
	model: z.string().trim().min(1).optional(),
	prompt: z.string().trim().min(1).max(GENERATE_TEXT_PROMPT_MAX_LENGTH),
})

/**
 * Demo: Generate text with an ephemeral BYOK key (not stored)
 */
const generateText = protectedProcedure
	.input(GenerateTextInputSchema)
	.handler(async ({ context, input }) => {
		const provider = input.provider as AiProvider
		const providerConfig = PROVIDER_CONFIGS[provider]
		const userId = context.session.user.id

		// Check if the model is enabled for this user (if model is specified)
		if (input.model) {
			const modelListProviderId = API_TO_MODEL_LIST_PROVIDER[provider] || provider
			const isEnabled = await checkModelEnabled(
				userId,
				modelListProviderId,
				input.model,
				'chat'
			)

			if (!isEnabled) {
				throw new ORPCError('BAD_REQUEST', {
					message: `模型 "${input.model}" 已被禁用。请在设置中启用此模型或选择其他模型。`,
				})
			}
		}

		const credential: DecryptedCredential = {
			provider,
			apiKey: input.apiKey,
			baseUrl: input.baseUrl ?? providerConfig.defaultBaseUrl,
			model: input.model,
		}

		try {
			return await generateTextWithCredential(credential, {
				prompt: input.prompt,
				model: input.model,
			})
		} catch (error: unknown) {
			const errorMessage =
				error instanceof Error ? error.message : 'Unknown AI error'

			if (
				provider === 'gemini' &&
				errorMessage.includes('User location is not supported for the API use')
			) {
				throw new ORPCError('BAD_REQUEST', {
					message:
						'Gemini 官方 API 在当前地区不可用。请切换 Provider，或为 Gemini 配置可访问的 baseUrl（例如代理 / 网关）后重试；也可尝试 OpenAI compatible 端点 `https://generativelanguage.googleapis.com/v1beta/openai`（仍可能受地区限制）。',
				})
			}

			throw new ORPCError('BAD_REQUEST', {
				message: `AI 请求失败：${errorMessage}`,
			})
		}
	})

// ==================== Model Catalog APIs ====================

/**
 * Check if a provider is enabled for a user
 * Returns the user's override if exists, otherwise returns the default enabled status
 */
async function checkProviderEnabled(
	userId: string,
	providerId: string
): Promise<boolean> {
	// First check if user has an override
	const [userSetting] = await db
		.select({ enabled: userAiProviderSettings.enabled })
		.from(userAiProviderSettings)
		.where(
			and(
				eq(userAiProviderSettings.userId, userId),
				eq(userAiProviderSettings.providerId, providerId)
			)
		)
		.limit(1)

	if (userSetting !== undefined) {
		return userSetting.enabled
	}

	// Fall back to default from model-list
	const provider = DEFAULT_MODEL_PROVIDER_LIST.find((p) => p.id === providerId)
	return Boolean(provider?.enabled)
}

/**
 * Check if a model is enabled for a user
 * Returns the user's override if exists, otherwise returns the default enabled status
 * Also checks if the provider is enabled first
 */
async function checkModelEnabled(
	userId: string,
	providerId: string,
	modelId: string,
	type: string
): Promise<boolean> {
	// First check if provider is enabled
	const providerEnabled = await checkProviderEnabled(userId, providerId)
	if (!providerEnabled) {
		return false
	}

	// Then check if user has a model override
	const [userSetting] = await db
		.select({ enabled: userAiModelSettings.enabled })
		.from(userAiModelSettings)
		.where(
			and(
				eq(userAiModelSettings.userId, userId),
				eq(userAiModelSettings.providerId, providerId),
				eq(userAiModelSettings.modelId, modelId),
				eq(userAiModelSettings.type, type)
			)
		)
		.limit(1)

	if (userSetting !== undefined) {
		return userSetting.enabled
	}

	// Fall back to default from model-list
	const model = FOLIO_DEFAULT_MODEL_LIST.find(
		(m) => m.providerId === providerId && m.id === modelId && m.type === type
	)

	return Boolean(model?.enabled)
}

/**
 * Get model catalog with user's enabled overrides
 */
const getModelCatalog = protectedProcedure.handler(async ({ context }) => {
	const userId = context.session.user.id

	// Get all user's model settings
	const userModelSettings = await db
		.select()
		.from(userAiModelSettings)
		.where(eq(userAiModelSettings.userId, userId))

	// Get all user's provider settings
	const userProviderSettings = await db
		.select()
		.from(userAiProviderSettings)
		.where(eq(userAiProviderSettings.userId, userId))

	// Create maps for quick lookup
	const userModelSettingsMap = new Map<string, boolean>()
	for (const setting of userModelSettings) {
		const key = `${setting.providerId}:${setting.modelId}:${setting.type}`
		userModelSettingsMap.set(key, setting.enabled)
	}

	const userProviderSettingsMap = new Map<string, boolean>()
	for (const setting of userProviderSettings) {
		userProviderSettingsMap.set(setting.providerId, setting.enabled)
	}

	// Build providers list (with logos) with user overrides applied
	const providers = DEFAULT_MODEL_PROVIDER_LIST.map((p) => {
		const userEnabled = userProviderSettingsMap.get(p.id)
		const enabled = userEnabled !== undefined ? userEnabled : Boolean(p.enabled)

		return {
			id: p.id,
			name: p.name,
			logo: p.logo,
			enabled,
		}
	})

	// Build models list with user overrides applied
	const models = FOLIO_DEFAULT_MODEL_LIST.map((m) => {
		const key = `${m.providerId}:${m.id}:${m.type}`
		const userEnabled = userModelSettingsMap.get(key)
		const enabled = userEnabled !== undefined ? userEnabled : Boolean(m.enabled)

		return {
			id: m.id,
			providerId: m.providerId,
			type: m.type,
			displayName: m.displayName ?? m.id,
			enabled,
			// Include reasoning ability for thinking support
			reasoning: m.abilities?.reasoning,
			// Include settings for extended params like enableReasoning
			settings: m.settings,
			// Include context window for token tracking
			contextWindowTokens: m.contextWindowTokens,
		}
	})

	return { providers, models }
})

const SetModelEnabledInputSchema = z.object({
	providerId: z.string().min(1),
	id: z.string().min(1),
	type: z.enum(MODEL_TYPES),
	enabled: z.boolean(),
})

/**
 * Set model enabled status for current user
 */
const setModelEnabled = protectedProcedure
	.input(SetModelEnabledInputSchema)
	.handler(async ({ context, input }) => {
		const userId = context.session.user.id

		// Validate that the model exists in the default list
		const modelExists = FOLIO_DEFAULT_MODEL_LIST.some(
			(m) =>
				m.providerId === input.providerId &&
				m.id === input.id &&
				m.type === input.type
		)

		if (!modelExists) {
			throw new ORPCError('NOT_FOUND', {
				message: `模型不存在：${input.providerId}/${input.id} (${input.type})`,
			})
		}

		// Upsert the user's model setting
		// First try to find existing record
		const [existing] = await db
			.select({ id: userAiModelSettings.id })
			.from(userAiModelSettings)
			.where(
				and(
					eq(userAiModelSettings.userId, userId),
					eq(userAiModelSettings.providerId, input.providerId),
					eq(userAiModelSettings.modelId, input.id),
					eq(userAiModelSettings.type, input.type)
				)
			)
			.limit(1)

		if (existing) {
			// Update existing record
			await db
				.update(userAiModelSettings)
				.set({
					enabled: input.enabled,
					updatedAt: new Date(),
				})
				.where(eq(userAiModelSettings.id, existing.id))
		} else {
			// Insert new record
			await db.insert(userAiModelSettings).values({
				id: nanoid(),
				userId,
				providerId: input.providerId,
				modelId: input.id,
				type: input.type,
				enabled: input.enabled,
			})
		}

		return { success: true }
	})

const SetProviderEnabledInputSchema = z.object({
	providerId: z.string().min(1),
	enabled: z.boolean(),
})

/**
 * Set provider enabled status for current user
 */
const setProviderEnabled = protectedProcedure
	.input(SetProviderEnabledInputSchema)
	.handler(async ({ context, input }) => {
		const userId = context.session.user.id

		// Validate that the provider exists in the default list
		const providerExists = DEFAULT_MODEL_PROVIDER_LIST.some(
			(p) => p.id === input.providerId
		)

		if (!providerExists) {
			throw new ORPCError('NOT_FOUND', {
				message: `Provider 不存在：${input.providerId}`,
			})
		}

		// Upsert the user's provider setting
		// First try to find existing record
		const [existing] = await db
			.select({ id: userAiProviderSettings.id })
			.from(userAiProviderSettings)
			.where(
				and(
					eq(userAiProviderSettings.userId, userId),
					eq(userAiProviderSettings.providerId, input.providerId)
				)
			)
			.limit(1)

		if (existing) {
			// Update existing record
			await db
				.update(userAiProviderSettings)
				.set({
					enabled: input.enabled,
					updatedAt: new Date(),
				})
				.where(eq(userAiProviderSettings.id, existing.id))
		} else {
			// Insert new record
			await db.insert(userAiProviderSettings).values({
				id: nanoid(),
				userId,
				providerId: input.providerId,
				enabled: input.enabled,
			})
		}

		return { success: true }
	})

export const aiRouter = {
	healthCheck,
	listProviders,
	getProvider,
	getPromptVersions,
	getConfig,
	generateText,
	// Model catalog
	getModelCatalog,
	setModelEnabled,
	setProviderEnabled,
}
