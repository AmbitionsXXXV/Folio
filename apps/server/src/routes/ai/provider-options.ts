import type { AiProvider } from "@folionote/ai"

/** Default reasoning budget tokens */
export const DEFAULT_REASONING_BUDGET_TOKENS = 10_000

/**
 * Build provider options for extended thinking/reasoning
 *
 * Returns typed provider options for AI SDK streamText.
 * Uses `as const` assertions to satisfy SharedV3ProviderOptions type.
 */
export function buildProviderOptions(
  provider: AiProvider,
  enableReasoning: boolean
) {
  if (!enableReasoning) {
    return undefined
  }

  switch (provider) {
    case "claude": {
      return {
        anthropic: {
          thinking: {
            type: "enabled" as const,
            budgetTokens: DEFAULT_REASONING_BUDGET_TOKENS
          }
        }
      }
    }
    case "deepseek":
    case "qwen": {
      return {
        openai: {
          reasoningEffort: "medium" as const
        }
      }
    }
    default: {
      return undefined
    }
  }
}
