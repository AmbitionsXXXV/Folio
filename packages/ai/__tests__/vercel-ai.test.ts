/**
 * Tests for Vercel AI SDK model factories
 *
 * These tests verify that createVercelAiChatModel and createVercelAiEmbeddingModel
 * correctly instantiate models for all supported providers.
 *
 * Note: These tests verify model creation only - they don't call actual APIs.
 * For testing actual generation, see generate-text.test.ts and stream-text.test.ts.
 */

import { describe, expect, it } from "vite-plus/test"

import {
  createVercelAiChatModel,
  createVercelAiEmbeddingModel
} from "../src/vercel-ai"
import {
  createMockClaudeCredential,
  createMockDeepSeekCredential,
  createMockGeminiCredential,
  createMockMoonshotCredential,
  createMockOpenAICredential,
  createMockQwenCredential
} from "./mock-helpers"

// Top-level regex for Biome compliance (performance)
const GEMINI_EMBEDDING_OPENAI_COMPAT_REGEX =
  /Gemini embedding is not supported via OpenAI compatible baseUrl/
const CLAUDE_NO_EMBEDDING_REGEX =
  /No default embedding model configured for provider: claude/

describe("createVercelAiChatModel", () => {
  describe("OpenAI provider", () => {
    it("creates chat model with default model", () => {
      const credential = createMockOpenAICredential()
      const model = createVercelAiChatModel(credential)

      expect(model).toBeDefined()
      expect(model.modelId).toBe("gpt-4o-mini")
    })

    it("creates chat model with explicit model override", () => {
      const credential = createMockOpenAICredential()
      const model = createVercelAiChatModel(credential, { model: "gpt-4o" })

      expect(model).toBeDefined()
      expect(model.modelId).toBe("gpt-4o")
    })
  })

  describe("Claude (Anthropic) provider", () => {
    it("creates chat model with default model", () => {
      const credential = createMockClaudeCredential()
      const model = createVercelAiChatModel(credential)

      expect(model).toBeDefined()
      expect(model.modelId).toBe("claude-3-5-sonnet-20241022")
    })

    it("creates chat model with explicit model override", () => {
      const credential = createMockClaudeCredential()
      const model = createVercelAiChatModel(credential, {
        model: "claude-3-opus-20240229"
      })

      expect(model).toBeDefined()
      expect(model.modelId).toBe("claude-3-opus-20240229")
    })
  })

  describe("Gemini provider", () => {
    it("creates chat model with native baseUrl", () => {
      const credential = createMockGeminiCredential()
      const model = createVercelAiChatModel(credential)

      expect(model).toBeDefined()
      expect(model.modelId).toBe("gemini-2.0-flash")
    })

    it("creates chat model with OpenAI-compatible baseUrl", () => {
      const credential = createMockGeminiCredential({
        baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai"
      })
      const model = createVercelAiChatModel(credential)

      expect(model).toBeDefined()
    })

    it("strips models/ prefix from model ID", () => {
      const credential = createMockGeminiCredential({
        model: "models/gemini-2.0-flash"
      })
      const model = createVercelAiChatModel(credential)

      expect(model).toBeDefined()
      expect(model.modelId).toBe("gemini-2.0-flash")
    })
  })

  describe("DeepSeek provider (OpenAI-compatible)", () => {
    it("creates chat model", () => {
      const credential = createMockDeepSeekCredential()
      const model = createVercelAiChatModel(credential)

      expect(model).toBeDefined()
      expect(model.modelId).toBe("deepseek-chat")
    })
  })

  describe("Qwen provider (OpenAI-compatible)", () => {
    it("creates chat model", () => {
      const credential = createMockQwenCredential()
      const model = createVercelAiChatModel(credential)

      expect(model).toBeDefined()
      expect(model.modelId).toBe("qwen-plus")
    })
  })

  describe("Moonshot provider (OpenAI-compatible)", () => {
    it("creates chat model", () => {
      const credential = createMockMoonshotCredential()
      const model = createVercelAiChatModel(credential)

      expect(model).toBeDefined()
      expect(model.modelId).toBe("moonshot-v1-8k")
    })
  })
})

describe("createVercelAiEmbeddingModel", () => {
  describe("OpenAI provider", () => {
    it("creates embedding model with explicit model", () => {
      const credential = createMockOpenAICredential()
      const model = createVercelAiEmbeddingModel(credential, {
        model: "text-embedding-3-small"
      })

      expect(model).toBeDefined()
      expect(model.modelId).toBe("text-embedding-3-small")
    })

    it("creates embedding model with default model", () => {
      const credential = createMockOpenAICredential()
      const model = createVercelAiEmbeddingModel(credential)

      expect(model).toBeDefined()
    })
  })

  describe("Gemini provider", () => {
    it("creates embedding model with native baseUrl", () => {
      const credential = createMockGeminiCredential()
      const model = createVercelAiEmbeddingModel(credential, {
        model: "text-embedding-004"
      })

      expect(model).toBeDefined()
      expect(model.modelId).toBe("text-embedding-004")
    })

    it("throws for OpenAI-compatible baseUrl", () => {
      const credential = createMockGeminiCredential({
        baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai"
      })

      expect(() => createVercelAiEmbeddingModel(credential)).toThrow(
        GEMINI_EMBEDDING_OPENAI_COMPAT_REGEX
      )
    })
  })

  describe("Claude provider", () => {
    it("throws error (no embedding model configured)", () => {
      const credential = createMockClaudeCredential()

      // Claude doesn't have a default embedding model configured,
      // so it throws before reaching the "not implemented" check
      expect(() => createVercelAiEmbeddingModel(credential)).toThrow(
        CLAUDE_NO_EMBEDDING_REGEX
      )
    })
  })

  describe("DeepSeek provider (OpenAI-compatible)", () => {
    it("creates embedding model", () => {
      const credential = createMockDeepSeekCredential()
      const model = createVercelAiEmbeddingModel(credential, {
        model: "deepseek-embed"
      })

      expect(model).toBeDefined()
    })
  })
})
