import type { AiFullModelCard, LobeDefaultAiModelListItem } from '../types/ai-model'

import anthropic from './anthropic'
import deepseek from './deepseek'
import google from './google'
import openai from './openai'
import qwen from './qwen'
import xai from './xai'

// Re-export individual provider models
export { default as anthropicModels } from './anthropic'
export { default as deepseekModels } from './deepseek'
export { default as googleModels } from './google'
export { default as openaiModels } from './openai'
export { default as qwenModels } from './qwen'
export { default as xaiModels } from './xai'

type ModelsMap = Record<string, AiFullModelCard[]>

const buildDefaultModelList = (map: ModelsMap): LobeDefaultAiModelListItem[] => {
	let models: LobeDefaultAiModelListItem[] = []

	for (const [provider, providerModels] of Object.entries(map)) {
		const newModels = providerModels.map((model) => ({
			...model,
			abilities: model.abilities ?? {},
			enabled: model.enabled,
			providerId: provider,
		}))
		models = models.concat(newModels)
	}

	return models
}

/**
 * Default model list containing all models from all providers
 */
export const FOLIO_DEFAULT_MODEL_LIST = buildDefaultModelList({
	anthropic,
	deepseek,
	google,
	openai,
	qwen,
	xai,
})

export default FOLIO_DEFAULT_MODEL_LIST
