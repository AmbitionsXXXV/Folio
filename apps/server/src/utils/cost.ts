import { getTokenCosts } from "tokenlens"

/**
 * Calculate cost using tokenlens from usage data
 */
export function calculateCostFromUsage(
  provider: string,
  modelId: string,
  usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number }
): number | undefined {
  try {
    const tokenlensModelId = `${provider}/${modelId}`
    const costs = getTokenCosts({
      modelId: tokenlensModelId,
      usage: {
        input: usage.inputTokens ?? 0,
        output: usage.outputTokens ?? 0
      }
    })
    return costs.totalUSD
  } catch {
    return undefined
  }
}
