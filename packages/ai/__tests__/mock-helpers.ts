/**
 * Shared mock helpers for AI SDK testing
 *
 * Based on AI SDK v6 testing documentation:
 * https://ai-sdk.dev/docs/ai-sdk-core/testing
 *
 * These helpers provide deterministic, repeatable test scenarios without
 * calling actual LLM providers.
 */

import type { DecryptedCredential } from "../src/credentials/types"

// ============================================================================
// Mock Credential Factories
// ============================================================================

/**
 * Create a mock OpenAI credential for testing
 */
export function createMockOpenAICredential(
  overrides: Partial<DecryptedCredential> = {}
): DecryptedCredential {
  return {
    provider: "openai",
    apiKey: "test-openai-key",
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-4o-mini",
    ...overrides
  }
}

/**
 * Create a mock Anthropic (Claude) credential for testing
 */
export function createMockClaudeCredential(
  overrides: Partial<DecryptedCredential> = {}
): DecryptedCredential {
  return {
    provider: "claude",
    apiKey: "test-anthropic-key",
    baseUrl: "https://api.anthropic.com",
    model: "claude-3-5-sonnet-20241022",
    ...overrides
  }
}

/**
 * Create a mock Gemini credential for testing
 */
export function createMockGeminiCredential(
  overrides: Partial<DecryptedCredential> = {}
): DecryptedCredential {
  return {
    provider: "gemini",
    apiKey: "test-gemini-key",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    model: "gemini-2.0-flash",
    ...overrides
  }
}

/**
 * Create a mock DeepSeek credential for testing
 */
export function createMockDeepSeekCredential(
  overrides: Partial<DecryptedCredential> = {}
): DecryptedCredential {
  return {
    provider: "deepseek",
    apiKey: "test-deepseek-key",
    baseUrl: "https://api.deepseek.com/v1",
    model: "deepseek-chat",
    ...overrides
  }
}

/**
 * Create a mock Qwen credential for testing
 */
export function createMockQwenCredential(
  overrides: Partial<DecryptedCredential> = {}
): DecryptedCredential {
  return {
    provider: "qwen",
    apiKey: "test-qwen-key",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    model: "qwen-plus",
    ...overrides
  }
}

/**
 * Create a mock Moonshot credential for testing
 */
export function createMockMoonshotCredential(
  overrides: Partial<DecryptedCredential> = {}
): DecryptedCredential {
  return {
    provider: "moonshot",
    apiKey: "test-moonshot-key",
    baseUrl: "https://api.moonshot.cn/v1",
    model: "moonshot-v1-8k",
    ...overrides
  }
}

// ============================================================================
// Mock Response Builders
// ============================================================================

/**
 * Create a standard mock usage object for AI SDK tests
 */
export function createMockUsage(
  inputTokens = 10,
  outputTokens = 20
): {
  inputTokens: {
    total: number
    noCache: number
    cacheRead: undefined
    cacheWrite: undefined
  }
  outputTokens: {
    total: number
    text: number
    reasoning: undefined
  }
} {
  return {
    inputTokens: {
      total: inputTokens,
      noCache: inputTokens,
      cacheRead: undefined,
      cacheWrite: undefined
    },
    outputTokens: {
      total: outputTokens,
      text: outputTokens,
      reasoning: undefined
    }
  }
}

/**
 * Create a standard mock finish reason
 */
export function createMockFinishReason(
  reason: "stop" | "length" | "content-filter" | "tool-calls" | "error" = "stop"
): { unified: typeof reason; raw: undefined } {
  return { unified: reason, raw: undefined }
}

/**
 * Create mock doGenerate response for MockLanguageModelV3
 */
export function createMockDoGenerateResponse(
  text: string,
  options?: {
    inputTokens?: number
    outputTokens?: number
    finishReason?: "stop" | "length" | "content-filter" | "tool-calls" | "error"
  }
) {
  return {
    content: [{ type: "text" as const, text }],
    finishReason: createMockFinishReason(options?.finishReason),
    usage: createMockUsage(options?.inputTokens, options?.outputTokens),
    warnings: []
  }
}

/**
 * Create mock stream chunks for MockLanguageModelV3 doStream
 */
export function createMockStreamChunks(
  text: string,
  options?: {
    inputTokens?: number
    outputTokens?: number
    finishReason?: "stop" | "length" | "content-filter" | "tool-calls" | "error"
    chunkSize?: number
  }
) {
  const chunkSize = options?.chunkSize ?? 5
  const chunks: (
    | { type: "text-start"; id: string }
    | { type: "text-delta"; id: string; delta: string }
    | { type: "text-end"; id: string }
    | {
        type: "finish"
        finishReason: ReturnType<typeof createMockFinishReason>
        logprobs: undefined
        usage: ReturnType<typeof createMockUsage>
      }
  )[] = []

  const textId = "text-1"

  // Start chunk
  chunks.push({ type: "text-start", id: textId })

  // Text delta chunks
  for (let i = 0; i < text.length; i += chunkSize) {
    const delta = text.slice(i, i + chunkSize)
    chunks.push({ type: "text-delta", id: textId, delta })
  }

  // End chunk
  chunks.push({ type: "text-end", id: textId })

  // Finish chunk
  chunks.push({
    type: "finish",
    finishReason: createMockFinishReason(options?.finishReason),
    logprobs: undefined,
    usage: createMockUsage(options?.inputTokens, options?.outputTokens)
  })

  return chunks
}

// ============================================================================
// Test Constants
// ============================================================================

export const TEST_PROMPTS = {
  SIMPLE: "Hello, world!",
  QUESTION: "What is the capital of France?",
  CODING: "Write a function to calculate factorial in TypeScript",
  LONG: "A".repeat(1000)
} as const

export const TEST_RESPONSES = {
  SIMPLE: "Hello! How can I help you today?",
  ANSWER: "The capital of France is Paris.",
  CODE: `function factorial(n: number): number {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}`
} as const
