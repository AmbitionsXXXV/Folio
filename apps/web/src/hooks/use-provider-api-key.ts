import { useMemo } from 'react'
import { mapProviderIdToApi } from '@/features/knowledge'
import { useAiProviderConfig } from '@/hooks/use-ai-provider-config'
import { useModelProviderConfig } from '@/hooks/use-model-provider-config'

export function useProviderApiKey(selectedProvider: string) {
	const {
		isLoaded: isModelConfigLoaded,
		getProviderConfig: getModelProviderConfig,
	} = useModelProviderConfig()
	const {
		isLoaded: isAiProviderConfigLoaded,
		getProviderConfig: getAiProviderConfig,
	} = useAiProviderConfig()

	const apiProviderId = useMemo(
		() => mapProviderIdToApi(selectedProvider),
		[selectedProvider]
	)
	const providerConfig = useMemo(
		() => getModelProviderConfig(selectedProvider),
		[getModelProviderConfig, selectedProvider]
	)
	const apiProviderConfig = useMemo(
		() => getAiProviderConfig(apiProviderId),
		[getAiProviderConfig, apiProviderId]
	)
	const activeApiKey =
		providerConfig?.apiKey?.trim() || apiProviderConfig?.apiKey?.trim() || ''
	const activeBaseUrl =
		providerConfig?.baseUrl?.trim() ||
		apiProviderConfig?.baseUrl?.trim() ||
		undefined
	const hasApiKey =
		(isModelConfigLoaded || isAiProviderConfigLoaded) && Boolean(activeApiKey)

	return {
		apiProviderId,
		activeApiKey,
		activeBaseUrl,
		hasApiKey,
		isModelConfigLoaded,
	}
}
