import { useCallback, useEffect, useMemo, useState } from 'react'
import {
	AI_PROVIDERS_CONFIG_KEY,
	type AiProviderConfig,
	type AiProviderId,
	type AiProvidersConfig,
	DEFAULT_AI_CONFIG,
} from '@/lib/ai-provider-config'

/**
 * Load config from localStorage.
 */
function loadConfig(): AiProvidersConfig {
	try {
		const raw = localStorage.getItem(AI_PROVIDERS_CONFIG_KEY)
		if (raw) {
			const parsed = JSON.parse(raw) as Partial<AiProvidersConfig>
			return {
				...DEFAULT_AI_CONFIG,
				...parsed,
				providers: {
					...DEFAULT_AI_CONFIG.providers,
					...parsed.providers,
				},
			}
		}
	} catch {
		// Ignore parse errors
	}
	return DEFAULT_AI_CONFIG
}

/**
 * Save config to localStorage.
 */
function saveConfig(config: AiProvidersConfig): void {
	localStorage.setItem(AI_PROVIDERS_CONFIG_KEY, JSON.stringify(config))
}

/**
 * Hook to manage AI provider configurations.
 */
export function useAiProviderConfig() {
	const [config, setConfig] = useState<AiProvidersConfig>(DEFAULT_AI_CONFIG)
	const [isLoaded, setIsLoaded] = useState(false)

	// Load config on mount
	useEffect(() => {
		setConfig(loadConfig())
		setIsLoaded(true)
	}, [])

	// Get provider config
	const getProviderConfig = useCallback(
		(providerId: AiProviderId): AiProviderConfig | undefined => {
			return config.providers[providerId]
		},
		[config.providers]
	)

	// Check if provider is configured (has API key)
	const isProviderConfigured = useCallback(
		(providerId: AiProviderId): boolean => {
			const providerConfig = config.providers[providerId]
			return Boolean(providerConfig?.apiKey?.trim())
		},
		[config.providers]
	)

	// Get configured providers list
	const configuredProviders = useMemo(() => {
		return (Object.keys(config.providers) as AiProviderId[]).filter((id) =>
			config.providers[id]?.apiKey?.trim()
		)
	}, [config.providers])

	// Update provider config
	const updateProviderConfig = useCallback(
		(providerId: AiProviderId, providerConfig: AiProviderConfig) => {
			setConfig((prev) => {
				const next: AiProvidersConfig = {
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
	const removeProviderConfig = useCallback((providerId: AiProviderId) => {
		setConfig((prev) => {
			const { [providerId]: _, ...rest } = prev.providers
			const next: AiProvidersConfig = {
				...prev,
				providers: rest,
			}
			saveConfig(next)
			return next
		})
	}, [])

	// Set default provider
	const setDefaultProvider = useCallback(
		(providerId: AiProviderId, modelId?: string) => {
			setConfig((prev) => {
				const next: AiProvidersConfig = {
					...prev,
					defaultProvider: providerId,
					defaultModel: modelId,
				}
				saveConfig(next)
				return next
			})
		},
		[]
	)

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
