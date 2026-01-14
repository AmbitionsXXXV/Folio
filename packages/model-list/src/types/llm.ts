import type { AiModelSettings, ModelSearchImplementType } from './ai-model'

// ==================== Provider Source Enum ====================
export const AiProviderSourceEnum = {
	Builtin: 'builtin',
	Custom: 'custom',
} as const

export type AiProviderSourceType =
	(typeof AiProviderSourceEnum)[keyof typeof AiProviderSourceEnum]

// ==================== Provider SDK Type ====================
export const AiProviderSDKEnum = {
	Anthropic: 'anthropic',
	Azure: 'azure',
	AzureAI: 'azureai',
	Bedrock: 'bedrock',
	Cloudflare: 'cloudflare',
	ComfyUI: 'comfyui',
	Google: 'google',
	Huggingface: 'huggingface',
	Ollama: 'ollama',
	Openai: 'openai',
	Qwen: 'qwen',
	Replicate: 'replicate',
	Router: 'router',
	Volcengine: 'volcengine',
} as const

export type AiProviderSDKType =
	(typeof AiProviderSDKEnum)[keyof typeof AiProviderSDKEnum]

// ==================== Response Animation ====================
export type ResponseAnimation =
	| 'smooth'
	| 'fast'
	| {
			speed?: number
			text?: 'smooth' | 'fast'
	  }

// ==================== Provider Settings ====================
export interface AiProviderSettings {
	/** Default show browser request option */
	defaultShowBrowserRequest?: boolean
	/** Disable browser request */
	disableBrowserRequest?: boolean
	/** Model can be edited */
	modelEditable?: boolean
	/** Proxy URL configuration */
	proxyUrl?:
		| {
				placeholder: string
				desc?: string
				title?: string
		  }
		| false
	/** Response animation configuration */
	responseAnimation?: ResponseAnimation
	/** SDK type used by this provider */
	sdkType?: AiProviderSDKType
	/** Search mode implementation */
	searchMode?: ModelSearchImplementType
	/** Show add new model button */
	showAddNewModel?: boolean
	/** Show API key input */
	showApiKey?: boolean
	/** Show connection checker */
	showChecker?: boolean
	/** Show deployment name input */
	showDeployName?: boolean
	/** Show model fetcher */
	showModelFetcher?: boolean
	/** Support responses API */
	supportResponsesApi?: boolean
}

// ==================== Provider Config ====================
export interface AiProviderConfig {
	enableResponseApi?: boolean
}

// ==================== Provider List Item ====================
export interface AiProviderListItem {
	id: string
	name?: string
	description?: string
	logo?: string
	enabled: boolean
	source: AiProviderSourceType
	sort?: number
}

// ==================== Provider Detail Item ====================
export interface AiProviderDetailItem {
	id: string
	name: string
	description?: string
	logo?: string
	enabled: boolean
	source: AiProviderSourceType

	settings: AiProviderSettings
	keyVaults?: Record<string, unknown>
	fetchOnClient?: boolean
	checkModel?: string
	homeUrl?: string
	modelsUrl?: string
}

// ==================== Enabled Provider ====================
export interface EnabledProvider {
	id: string
	name?: string
	logo?: string
	source: AiProviderSourceType
}

// ==================== Provider Runtime Config ====================
export interface AiProviderRuntimeConfig {
	config: AiProviderConfig
	settings: AiProviderSettings
	keyVaults: Record<string, string>
	fetchOnClient?: boolean
}

// ==================== Model Provider Card ====================
export interface ModelProviderCard {
	id: string
	name: string
	description?: string
	/** Provider logo/icon path (relative to public folder, e.g., '/svg/models/openai.svg') */
	logo?: string
	url: string
	apiKeyUrl?: string
	modelsUrl?: string

	/** Models list (empty array, models are defined separately) */
	chatModels: never[]
	/** Model to use for connection check */
	checkModel?: string

	/** Whether this provider is enabled by default */
	enabled?: boolean
	/** Whether to show config panel */
	showConfig?: boolean

	/** Provider settings */
	settings: AiProviderSettings

	/** Proxy URL configuration (deprecated, use settings.proxyUrl) */
	proxyUrl?: {
		placeholder: string
	}

	/** Model list configuration */
	modelList?: {
		showModelFetcher?: boolean
	}
}

// ==================== Model List Item for Provider ====================
export interface ChatModelCard {
	id: string
	displayName?: string
	description?: string
	enabled?: boolean
	legacy?: boolean
	contextWindowTokens?: number
	maxOutput?: number
	organization?: string
	releasedAt?: string
	abilities?: AiModelSettings
}
