/**
 * AI Provider types and capability declarations
 */

import { AI_PROVIDER_IDS, type AiProviderId } from '@folionote/constants'

/**
 * AI SDK integration modes (docs parity)
 *
 * Most AI SDK providers offer:
 * - a default provider instance (reads API key from env)
 * - a factory (createXxx) for BYOK / proxy / custom baseURL
 */
export type AiSdkIntegration = {
	/**
	 * Option A: use the default provider instance.
	 * Typically reads the API key from an environment variable.
	 */
	defaultInstance?: {
		importFrom: string
		importName: string
		apiKeyEnvVar: string
	}
	/**
	 * Option B: create a customized provider instance (BYOK / proxy / custom baseURL).
	 */
	createInstance: {
		importFrom: string
		factoryName: string
		supportsBaseUrl: boolean
	}
}

export type ProviderBaseUrlOption = {
	id: string
	name: string
	baseUrl: string
}

/**
 * Supported AI providers (BYOK)
 *
 * Re-exported from @folionote/constants for convenience.
 * The canonical source of truth is AI_PROVIDER_IDS in @folionote/constants.
 */
export const AI_PROVIDERS = AI_PROVIDER_IDS

/**
 * Type for AI provider IDs.
 * Alias for AiProviderId from @folionote/constants.
 */
export type AiProvider = AiProviderId

/**
 * Provider capabilities
 */
export type ProviderCapability =
	| 'chat'
	| 'embedding'
	| 'structured_output'
	| 'function_calling'
	| 'vision'
	| 'streaming'

/**
 * Provider configuration with capabilities
 */
export interface ProviderConfig {
	id: AiProvider
	name: string
	/** Base URL for API calls (can be overridden by user) */
	defaultBaseUrl: string
	/**
	 * Known base URLs for this provider.
	 * Useful for UI selection and documentation.
	 */
	baseUrlOptions: ProviderBaseUrlOption[]
	/**
	 * AI SDK integration options for this provider.
	 * This is metadata only; runtime logic lives in `vercel-ai.ts`.
	 */
	aiSdk: AiSdkIntegration
	/** Supported capabilities */
	capabilities: ProviderCapability[]
	/** Default models for different tasks */
	defaultModels: {
		chat?: string
		embedding?: string
	}
}

/**
 * Provider registry with default configurations
 *
 * Note: Users can override baseUrl and model in their BYOK settings
 */
export const PROVIDER_CONFIGS: Record<AiProvider, ProviderConfig> = {
	openai: {
		id: 'openai',
		name: 'OpenAI',
		defaultBaseUrl: 'https://api.openai.com/v1',
		baseUrlOptions: [
			{
				id: 'default',
				name: 'OpenAI (default)',
				baseUrl: 'https://api.openai.com/v1',
			},
		],
		aiSdk: {
			defaultInstance: {
				importFrom: '@ai-sdk/openai',
				importName: 'openai',
				apiKeyEnvVar: 'OPENAI_API_KEY',
			},
			createInstance: {
				importFrom: '@ai-sdk/openai',
				factoryName: 'createOpenAI',
				supportsBaseUrl: true,
			},
		},
		capabilities: [
			'chat',
			'embedding',
			'structured_output',
			'function_calling',
			'vision',
			'streaming',
		],
		defaultModels: {
			chat: 'gpt-4o-mini',
			embedding: 'text-embedding-3-small',
		},
	},
	deepseek: {
		id: 'deepseek',
		name: 'DeepSeek',
		defaultBaseUrl: 'https://api.deepseek.com/v1',
		baseUrlOptions: [
			{
				id: 'default',
				name: 'DeepSeek (OpenAI compatible)',
				baseUrl: 'https://api.deepseek.com/v1',
			},
		],
		aiSdk: {
			createInstance: {
				importFrom: '@ai-sdk/openai',
				factoryName: 'createOpenAI',
				supportsBaseUrl: true,
			},
		},
		capabilities: ['chat', 'structured_output', 'function_calling', 'streaming'],
		defaultModels: {
			chat: 'deepseek-chat',
		},
	},
	gemini: {
		id: 'gemini',
		name: 'Google Gemini',
		defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
		baseUrlOptions: [
			{
				id: 'native',
				name: 'Gemini (Google Generative AI)',
				baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
			},
			{
				id: 'openai-compatible',
				name: 'Gemini (OpenAI compatible)',
				baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
			},
		],
		aiSdk: {
			defaultInstance: {
				importFrom: '@ai-sdk/google',
				importName: 'google',
				apiKeyEnvVar: 'GOOGLE_GENERATIVE_AI_API_KEY',
			},
			createInstance: {
				importFrom: '@ai-sdk/google',
				factoryName: 'createGoogleGenerativeAI',
				supportsBaseUrl: true,
			},
		},
		capabilities: [
			'chat',
			'embedding',
			'structured_output',
			'function_calling',
			'vision',
			'streaming',
		],
		defaultModels: {
			chat: 'gemini-2.5-flash-lite',
			embedding: 'text-embedding-004',
		},
	},
	claude: {
		id: 'claude',
		name: 'Anthropic Claude',
		defaultBaseUrl: 'https://api.anthropic.com/v1',
		baseUrlOptions: [
			{
				id: 'default',
				name: 'Anthropic (default)',
				baseUrl: 'https://api.anthropic.com/v1',
			},
		],
		aiSdk: {
			defaultInstance: {
				importFrom: '@ai-sdk/anthropic',
				importName: 'anthropic',
				apiKeyEnvVar: 'ANTHROPIC_API_KEY',
			},
			createInstance: {
				importFrom: '@ai-sdk/anthropic',
				factoryName: 'createAnthropic',
				supportsBaseUrl: true,
			},
		},
		capabilities: ['chat', 'structured_output', 'vision', 'streaming'],
		defaultModels: {
			chat: 'claude-sonnet-4-20250514',
		},
	},
	qwen: {
		id: 'qwen',
		name: 'Alibaba Qwen',
		defaultBaseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
		baseUrlOptions: [
			{
				id: 'cn',
				name: 'DashScope (CN)',
				baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
			},
			{
				id: 'intl',
				name: 'DashScope (INTL)',
				baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1',
			},
		],
		aiSdk: {
			createInstance: {
				importFrom: '@ai-sdk/openai',
				factoryName: 'createOpenAI',
				supportsBaseUrl: true,
			},
		},
		capabilities: [
			'chat',
			'embedding',
			'structured_output',
			'function_calling',
			'vision',
			'streaming',
		],
		defaultModels: {
			chat: 'qwen-turbo',
			embedding: 'text-embedding-v3',
		},
	},
	moonshot: {
		id: 'moonshot',
		name: 'Moonshot',
		defaultBaseUrl: 'https://api.moonshot.cn/v1',
		baseUrlOptions: [
			{
				id: 'default',
				name: 'Moonshot (default)',
				baseUrl: 'https://api.moonshot.cn/v1',
			},
		],
		aiSdk: {
			createInstance: {
				importFrom: '@ai-sdk/openai',
				factoryName: 'createOpenAI',
				supportsBaseUrl: true,
			},
		},
		capabilities: [
			'chat',
			'embedding',
			'structured_output',
			'function_calling',
			'vision',
			'streaming',
		],
		defaultModels: {
			chat: 'moonshot-chat',
			embedding: 'text-embedding-v3',
		},
	},
}

/**
 * Get provider config by id
 */
export function getProviderConfig(provider: AiProvider): ProviderConfig {
	return PROVIDER_CONFIGS[provider]
}

/**
 * Check if provider supports a capability
 */
export function providerSupports(
	provider: AiProvider,
	capability: ProviderCapability
): boolean {
	return PROVIDER_CONFIGS[provider].capabilities.includes(capability)
}
