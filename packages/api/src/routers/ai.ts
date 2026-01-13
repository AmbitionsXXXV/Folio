/**
 * AI Router
 *
 * API gateway for AI capabilities provided by @folionote/ai
 *
 * This router handles:
 * - BYOK credential management
 * - AI operations (summarize, review suggest, etc.)
 * - Usage tracking
 */

import {
	AI_PROVIDERS,
	type AiProvider,
	type DecryptedCredential,
	PROMPT_VERSIONS,
	PROVIDER_CONFIGS,
} from '@folionote/ai'
import { generateTextWithCredential } from '@folionote/ai/generate-text'
import { ORPCError } from '@orpc/server'
import { z } from 'zod'
import { protectedProcedure, publicProcedure } from '../index'

const GENERATE_TEXT_PROMPT_MAX_LENGTH = 20_000

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
	.handler(async ({ input }) => {
		const provider = input.provider as AiProvider
		const providerConfig = PROVIDER_CONFIGS[provider]

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

export const aiRouter = {
	healthCheck,
	listProviders,
	getProvider,
	getPromptVersions,
	getConfig,
	generateText,
}
