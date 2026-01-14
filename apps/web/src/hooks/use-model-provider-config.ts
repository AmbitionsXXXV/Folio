import { useCallback, useEffect, useMemo, useState } from 'react'

const MODEL_PROVIDERS_CONFIG_KEY = 'folionote-model-providers-config'

export type ModelProviderConfig = {
	apiKey: string
	baseUrl?: string
}

export type ModelProvidersConfig = {
	providers: Record<string, ModelProviderConfig>
	defaultProvider: string
	defaultModel?: string
}

const DEFAULT_MODEL_PROVIDERS_CONFIG: ModelProvidersConfig = {
	providers: {},
	defaultProvider: 'openai',
	defaultModel: undefined,
}

/**
 * Load config from localStorage.
 */
function loadConfig(): ModelProvidersConfig {
	try {
		const raw = localStorage.getItem(MODEL_PROVIDERS_CONFIG_KEY)
		if (raw) {
			const parsed = JSON.parse(raw) as Partial<ModelProvidersConfig>
			return {
				...DEFAULT_MODEL_PROVIDERS_CONFIG,
				...parsed,
				providers: {
					...DEFAULT_MODEL_PROVIDERS_CONFIG.providers,
					...parsed.providers,
				},
			}
		}
	} catch {
		// Ignore parse errors
	}
	return DEFAULT_MODEL_PROVIDERS_CONFIG
}

/**
 * Save config to localStorage.
 */
function saveConfig(config: ModelProvidersConfig): void {
	localStorage.setItem(MODEL_PROVIDERS_CONFIG_KEY, JSON.stringify(config))
}

/**
 * Hook to manage model provider configurations for BYOK (Bring Your Own Key).
 */
export function useModelProviderConfig() {
	const [config, setConfig] = useState<ModelProvidersConfig>(
		DEFAULT_MODEL_PROVIDERS_CONFIG
	)
	const [isLoaded, setIsLoaded] = useState(false)

	// Load config on mount
	useEffect(() => {
		setConfig(loadConfig())
		setIsLoaded(true)
	}, [])

	// Get provider config
	const getProviderConfig = useCallback(
		(providerId: string): ModelProviderConfig | undefined => {
			return config.providers[providerId]
		},
		[config.providers]
	)

	// Check if provider is configured (has API key)
	const isProviderConfigured = useCallback(
		(providerId: string): boolean => {
			const providerConfig = config.providers[providerId]
			return Boolean(providerConfig?.apiKey?.trim())
		},
		[config.providers]
	)

	// Get configured providers list
	const configuredProviders = useMemo(() => {
		return Object.keys(config.providers).filter((id) =>
			config.providers[id]?.apiKey?.trim()
		)
	}, [config.providers])

	// Update provider config
	const updateProviderConfig = useCallback(
		(providerId: string, providerConfig: ModelProviderConfig) => {
			setConfig((prev) => {
				const next: ModelProvidersConfig = {
					...prev,
					providers: {
						...prev.providers,
						[providerId]: providerConfig,
					},
				}
				saveConfig(next)
				return next
			})
		},
		[]
	)

	// Remove provider config
	const removeProviderConfig = useCallback((providerId: string) => {
		setConfig((prev) => {
			const { [providerId]: _, ...rest } = prev.providers
			// If removing the default provider, reset to first configured or 'openai'
			let newDefault = prev.defaultProvider
			if (prev.defaultProvider === providerId) {
				const remaining = Object.keys(rest).filter((id) => rest[id]?.apiKey?.trim())
				newDefault = remaining[0] || 'openai'
			}
			const next: ModelProvidersConfig = {
				...prev,
				providers: rest,
				defaultProvider: newDefault,
			}
			saveConfig(next)
			return next
		})
	}, [])

	// Set default provider
	const setDefaultProvider = useCallback((providerId: string, modelId?: string) => {
		setConfig((prev) => {
			const next: ModelProvidersConfig = {
				...prev,
				defaultProvider: providerId,
				defaultModel: modelId,
			}
			saveConfig(next)
			return next
		})
	}, [])

	// Get active config for AI calls
	const getActiveConfig = useCallback(() => {
		const providerConfig = config.providers[config.defaultProvider]
		return {
			provider: config.defaultProvider,
			apiKey: providerConfig?.apiKey ?? '',
			baseUrl: providerConfig?.baseUrl,
			model: config.defaultModel,
		}
	}, [config])

	return {
		config,
		isLoaded,
		getProviderConfig,
		isProviderConfigured,
		configuredProviders,
		updateProviderConfig,
		removeProviderConfig,
		setDefaultProvider,
		getActiveConfig,
	}
}
