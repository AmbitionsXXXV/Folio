import type { ModelProviderCard } from "../types/llm"
import AnthropicProvider from "./anthropic"
import DeepSeekProvider from "./deepseek"
import GoogleProvider from "./google"
import MoonshotProvider from "./moonshot"
import OpenAIProvider from "./openai"
import QwenProvider from "./qwen"
import XAIProvider from "./xai"

// Re-export individual providers
export { default as AnthropicProvider } from "./anthropic"
export { default as DeepSeekProvider } from "./deepseek"
export { default as GoogleProvider } from "./google"
export { default as MoonshotProvider } from "./moonshot"
export { default as OpenAIProvider } from "./openai"
export { default as QwenProvider } from "./qwen"
export { default as XAIProvider } from "./xai"

/**
 * Default provider list with all supported providers
 * Order determines the default display order in UI
 */
export const DEFAULT_MODEL_PROVIDER_LIST: ModelProviderCard[] = [
  OpenAIProvider,
  AnthropicProvider,
  GoogleProvider,
  DeepSeekProvider,
  QwenProvider,
  XAIProvider,
  MoonshotProvider
]

/**
 * Get a provider by its ID
 */
export function getProviderById(id: string): ModelProviderCard | undefined {
  return DEFAULT_MODEL_PROVIDER_LIST.find((provider) => provider.id === id)
}

/**
 * Get all enabled providers
 */
export function getEnabledProviders(): ModelProviderCard[] {
  return DEFAULT_MODEL_PROVIDER_LIST.filter((provider) => provider.enabled)
}

export default DEFAULT_MODEL_PROVIDER_LIST
