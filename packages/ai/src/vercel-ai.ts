/**
 * Vercel AI SDK integration
 *
 * This file provides minimal model factories that map BYOK credentials to
 * Vercel AI SDK provider instances.
 *
 * Design notes (aligned with AI SDK docs):
 * - Most providers support two integration styles:
 *   - default provider instance (reads API key from env)
 *   - createXxx factory (BYOK / proxy / custom baseURL)
 * - FolioNote uses BYOK, so we always construct provider instances with `apiKey`.
 *
 * Note:
 * - Keep this file out of `src/index.ts` exports to avoid pulling heavy runtime
 *   dependencies into environments that only need types/constants.
 */

import { createAnthropic } from '@ai-sdk/anthropic'
import { devToolsMiddleware } from '@ai-sdk/devtools'
import { createGoogleGenerativeAI } from '@ai-sdk/google'
import { createOpenAI } from '@ai-sdk/openai'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import type {
	EmbeddingModelV3,
	ImageModelV3,
	LanguageModelV3,
} from '@ai-sdk/provider'
import { wrapLanguageModel } from 'ai'
import type { DecryptedCredential } from './credentials/types'
import { getProviderConfig } from './providers/types'

/**
 * Check if DevTools should be enabled.
 * Only enable in development environment for security.
 */
const isDevToolsEnabled = process.env.NODE_ENV !== 'production'

const TRAILING_SLASHES_REGEX = /\/+$/
const MODELS_PREFIX = 'models/'

type CreateChatModelOptions = {
	/**
	 * Explicit model override.
	 * If omitted, falls back to `credential.model`, then provider defaults.
	 */
	model?: string
}

type CreateEmbeddingModelOptions = {
	/**
	 * Explicit embedding model override.
	 * If omitted, falls back to provider defaults.
	 */
	model?: string
}

type CreateImageModelOptions = {
	/**
	 * Explicit image model override.
	 * If omitted, falls back to provider defaults.
	 */
	model?: string
}

function resolveChatModelId(
	credential: DecryptedCredential,
	overrideModel?: string
): string {
	const providerDefaults = getProviderConfig(credential.provider).defaultModels
	const resolvedModelId = overrideModel ?? credential.model ?? providerDefaults.chat
	if (!resolvedModelId) {
		throw new Error(
			`No default chat model configured for provider: ${credential.provider}`
		)
	}
	return resolvedModelId
}

function resolveEmbeddingModelId(
	credential: DecryptedCredential,
	overrideModel?: string
): string {
	const providerDefaults = getProviderConfig(credential.provider).defaultModels
	const resolvedModelId = overrideModel ?? providerDefaults.embedding
	if (!resolvedModelId) {
		throw new Error(
			`No default embedding model configured for provider: ${credential.provider}`
		)
	}
	return resolvedModelId
}

function resolveImageModelId(
	credential: DecryptedCredential,
	overrideModel?: string
): string {
	const providerDefaults = getProviderConfig(credential.provider).defaultModels
	const resolvedModelId = overrideModel ?? providerDefaults.image
	if (!resolvedModelId) {
		throw new Error(
			`No default image model configured for provider: ${credential.provider}`
		)
	}
	return resolvedModelId
}

function stripModelsPrefix(modelId: string): string {
	return modelId.startsWith(MODELS_PREFIX)
		? modelId.slice(MODELS_PREFIX.length)
		: modelId
}

function isGeminiOpenAiCompatibilityBaseUrl(baseUrl: string): boolean {
	return baseUrl.replace(TRAILING_SLASHES_REGEX, '').endsWith('/openai')
}

/**
 * Wrap a language model with DevTools middleware (development only).
 * In production, returns the model unchanged.
 */
function maybeWrapWithDevTools(model: LanguageModelV3): LanguageModelV3 {
	if (!isDevToolsEnabled) {
		return model
	}
	return wrapLanguageModel({
		model,
		middleware: devToolsMiddleware(),
	})
}

/**
 * Create a Vercel AI SDK chat model from decrypted BYOK credential.
 *
 * In development, the model is automatically wrapped with DevTools middleware
 * for debugging and inspection. Run `npx @ai-sdk/devtools` to view interactions.
 */
export function createVercelAiChatModel(
	credential: DecryptedCredential,
	options: CreateChatModelOptions = {}
): LanguageModelV3 {
	const modelId = resolveChatModelId(credential, options.model)

	let model: LanguageModelV3

	switch (credential.provider) {
		case 'openai': {
			const openai = createOpenAI({
				apiKey: credential.apiKey,
				baseURL: credential.baseUrl,
			})
			model = openai(modelId)
			break
		}
		case 'deepseek':
		case 'qwen': {
			const openaiCompat = createOpenAI({
				apiKey: credential.apiKey,
				baseURL: credential.baseUrl,
			})
			model = openaiCompat.chat(modelId)
			break
		}
		case 'moonshot': {
			const moonshotai = createOpenAICompatible({
				apiKey: credential.apiKey,
				baseURL: credential.baseUrl,
				name: 'moonshotai',
			})
			model = moonshotai(modelId)
			break
		}
		case 'claude': {
			const anthropic = createAnthropic({
				apiKey: credential.apiKey,
				baseURL: credential.baseUrl,
			})
			model = anthropic(modelId)
			break
		}
		case 'gemini': {
			if (isGeminiOpenAiCompatibilityBaseUrl(credential.baseUrl)) {
				const openaiCompatible = createOpenAI({
					apiKey: credential.apiKey,
					baseURL: credential.baseUrl,
				})
				// Gemini OpenAI-compatible baseUrl does not support /v1/responses.
				model = openaiCompatible.chat(stripModelsPrefix(modelId))
				break
			}

			const google = createGoogleGenerativeAI({
				apiKey: credential.apiKey,
				baseURL: credential.baseUrl,
			})
			model = google(stripModelsPrefix(modelId))
			break
		}
		default: {
			const unreachableProvider: never = credential.provider
			throw new Error(`Unsupported provider: ${unreachableProvider}`)
		}
	}

	return maybeWrapWithDevTools(model)
}
/**
 * Create a Vercel AI SDK embedding model from decrypted BYOK credential.
 *
 * Currently supported:
 * - openai-compatible providers via `@ai-sdk/openai`
 */
export function createVercelAiEmbeddingModel(
	credential: DecryptedCredential,
	options: CreateEmbeddingModelOptions = {}
): EmbeddingModelV3 {
	const modelId = resolveEmbeddingModelId(credential, options.model)

	switch (credential.provider) {
		case 'openai':
		case 'deepseek':
		case 'qwen': {
			const openai = createOpenAI({
				apiKey: credential.apiKey,
				baseURL: credential.baseUrl,
			})
			return openai.embedding(modelId)
		}
		case 'moonshot': {
			const moonshotai = createOpenAICompatible({
				apiKey: credential.apiKey,
				baseURL: credential.baseUrl,
				name: 'moonshotai',
			})
			return moonshotai.embeddingModel(modelId)
		}
		case 'gemini': {
			if (isGeminiOpenAiCompatibilityBaseUrl(credential.baseUrl)) {
				throw new Error(
					'Gemini embedding is not supported via OpenAI compatible baseUrl. Use the native Gemini baseUrl instead.'
				)
			}

			const google = createGoogleGenerativeAI({
				apiKey: credential.apiKey,
				baseURL: credential.baseUrl,
			})
			return google.embedding(stripModelsPrefix(modelId))
		}
		case 'claude': {
			throw new Error(
				`Embedding model not implemented for provider: ${credential.provider}`
			)
		}
		default: {
			const unreachableProvider: never = credential.provider
			throw new Error(`Unsupported provider: ${unreachableProvider}`)
		}
	}
}

/**
 * Create a Vercel AI SDK image model from decrypted BYOK credential.
 *
 * Supported providers:
 * - openai: via `@ai-sdk/openai` `.image()` (dall-e-3, gpt-image-1)
 * - gemini: via `@ai-sdk/google` `.image()` (imagen-4.0-generate-001)
 * - moonshot: via `@ai-sdk/openai-compatible` `.imageModel()`
 */
export function createVercelAiImageModel(
	credential: DecryptedCredential,
	options: CreateImageModelOptions = {}
): ImageModelV3 {
	const modelId = resolveImageModelId(credential, options.model)

	switch (credential.provider) {
		case 'openai': {
			const openai = createOpenAI({
				apiKey: credential.apiKey,
				baseURL: credential.baseUrl,
			})
			return openai.image(modelId)
		}
		case 'gemini': {
			const google = createGoogleGenerativeAI({
				apiKey: credential.apiKey,
				baseURL: credential.baseUrl,
			})
			return google.image(stripModelsPrefix(modelId))
		}
		case 'moonshot': {
			const moonshotai = createOpenAICompatible({
				apiKey: credential.apiKey,
				baseURL: credential.baseUrl,
				name: 'moonshotai',
			})
			return moonshotai.imageModel(modelId)
		}
		case 'deepseek':
		case 'qwen':
		case 'claude': {
			throw new Error(
				`Image generation not supported for provider: ${credential.provider}`
			)
		}
		default: {
			const unreachableProvider: never = credential.provider
			throw new Error(`Unsupported provider: ${unreachableProvider}`)
		}
	}
}
