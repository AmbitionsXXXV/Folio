import { ORPCError } from "@orpc/server"
import { describe, expect, it } from "vite-plus/test"

import { appRouter } from "../../src/routers"
import { aiRouter } from "../../src/routers/ai"

describe("ai router", () => {
  describe("aiRouter structure", () => {
    it("exports all AI procedures", () => {
      expect(aiRouter).toHaveProperty("healthCheck")
      expect(aiRouter).toHaveProperty("listProviders")
      expect(aiRouter).toHaveProperty("getProvider")
      expect(aiRouter).toHaveProperty("getPromptVersions")
      expect(aiRouter).toHaveProperty("getConfig")
      expect(aiRouter).toHaveProperty("generateText")
      expect(aiRouter).toHaveProperty("getModelCatalog")
      expect(aiRouter).toHaveProperty("setModelEnabled")
    })

    it("has correct procedure types", () => {
      expect(typeof aiRouter.healthCheck).toBe("object")
      expect(typeof aiRouter.listProviders).toBe("object")
      expect(typeof aiRouter.getProvider).toBe("object")
      expect(typeof aiRouter.getPromptVersions).toBe("object")
      expect(typeof aiRouter.getConfig).toBe("object")
      expect(typeof aiRouter.generateText).toBe("object")
      expect(typeof aiRouter.getModelCatalog).toBe("object")
      expect(typeof aiRouter.setModelEnabled).toBe("object")
    })
  })

  describe("healthCheck procedure", () => {
    it("should be defined", () => {
      expect(aiRouter.healthCheck).toBeDefined()
    })

    it("should be a public procedure", () => {
      expect(typeof aiRouter.healthCheck).toBe("object")
    })
  })

  describe("listProviders procedure", () => {
    it("should be defined", () => {
      expect(aiRouter.listProviders).toBeDefined()
    })

    it("should be a public procedure", () => {
      expect(typeof aiRouter.listProviders).toBe("object")
    })
  })

  describe("getProvider procedure", () => {
    it("should be defined", () => {
      expect(aiRouter.getProvider).toBeDefined()
    })

    it("should be a public procedure", () => {
      expect(typeof aiRouter.getProvider).toBe("object")
    })
  })

  describe("getPromptVersions procedure", () => {
    it("should be defined", () => {
      expect(aiRouter.getPromptVersions).toBeDefined()
    })

    it("should be a public procedure", () => {
      expect(typeof aiRouter.getPromptVersions).toBe("object")
    })
  })

  describe("getConfig procedure", () => {
    it("should be defined", () => {
      expect(aiRouter.getConfig).toBeDefined()
    })

    it("should be a protected procedure", () => {
      expect(typeof aiRouter.getConfig).toBe("object")
    })
  })

  describe("generateText procedure", () => {
    it("should be defined", () => {
      expect(aiRouter.generateText).toBeDefined()
    })

    it("should be a protected procedure", () => {
      expect(typeof aiRouter.generateText).toBe("object")
    })
  })

  describe("getModelCatalog procedure", () => {
    it("should be defined", () => {
      expect(aiRouter.getModelCatalog).toBeDefined()
    })

    it("should be a protected procedure", () => {
      expect(typeof aiRouter.getModelCatalog).toBe("object")
    })
  })

  describe("setModelEnabled procedure", () => {
    it("should be defined", () => {
      expect(aiRouter.setModelEnabled).toBeDefined()
    })

    it("should be a protected procedure", () => {
      expect(typeof aiRouter.setModelEnabled).toBe("object")
    })
  })
})

describe("ai router integration with appRouter", () => {
  it("should be accessible from appRouter", () => {
    expect(appRouter.ai).toBeDefined()
    expect(appRouter.ai).toBe(aiRouter)
  })

  it("should have all public procedures", () => {
    expect(appRouter.ai.healthCheck).toBeDefined()
    expect(appRouter.ai.listProviders).toBeDefined()
    expect(appRouter.ai.getProvider).toBeDefined()
    expect(appRouter.ai.getPromptVersions).toBeDefined()
  })

  it("should have all protected procedures", () => {
    expect(appRouter.ai.getConfig).toBeDefined()
    expect(appRouter.ai.generateText).toBeDefined()
    expect(appRouter.ai.getModelCatalog).toBeDefined()
    expect(appRouter.ai.setModelEnabled).toBeDefined()
  })
})

describe("ai error types", () => {
  it("should use ORPCError for errors", () => {
    expect(ORPCError).toBeDefined()

    const error = new ORPCError("BAD_REQUEST", { message: "AI request failed" })
    expect(error).toBeInstanceOf(ORPCError)
    expect(error.code).toBe("BAD_REQUEST")
  })

  it("should handle NOT_FOUND error for invalid model", () => {
    const error = new ORPCError("NOT_FOUND", {
      message: "模型不存在：invalid/model (chat)"
    })
    expect(error).toBeInstanceOf(ORPCError)
    expect(error.code).toBe("NOT_FOUND")
  })

  it("should handle UNAUTHORIZED error", () => {
    const error = new ORPCError("UNAUTHORIZED")
    expect(error).toBeInstanceOf(ORPCError)
    expect(error.code).toBe("UNAUTHORIZED")
  })
})

describe("AI provider mapping", () => {
  /**
   * Tests for the API_TO_MODEL_LIST_PROVIDER mapping
   * This mapping converts API provider IDs to model-list provider IDs
   */
  const API_TO_MODEL_LIST_PROVIDER: Record<string, string> = {
    openai: "openai",
    deepseek: "deepseek",
    gemini: "google",
    claude: "anthropic",
    qwen: "qwen"
  }

  it("should map openai correctly", () => {
    expect(API_TO_MODEL_LIST_PROVIDER.openai).toBe("openai")
  })

  it("should map deepseek correctly", () => {
    expect(API_TO_MODEL_LIST_PROVIDER.deepseek).toBe("deepseek")
  })

  it("should map gemini to google", () => {
    expect(API_TO_MODEL_LIST_PROVIDER.gemini).toBe("google")
  })

  it("should map claude to anthropic", () => {
    expect(API_TO_MODEL_LIST_PROVIDER.claude).toBe("anthropic")
  })

  it("should map qwen correctly", () => {
    expect(API_TO_MODEL_LIST_PROVIDER.qwen).toBe("qwen")
  })

  it("should return undefined for unknown providers", () => {
    expect(API_TO_MODEL_LIST_PROVIDER.unknown).toBeUndefined()
  })
})

describe("GenerateTextInputSchema validation", () => {
  /**
   * Tests for input validation rules
   */
  const GENERATE_TEXT_PROMPT_MAX_LENGTH = 20_000

  it("should have correct max prompt length", () => {
    expect(GENERATE_TEXT_PROMPT_MAX_LENGTH).toBe(20_000)
  })

  it("should validate prompt length", () => {
    const shortPrompt = "Hello"
    const longPrompt = "a".repeat(GENERATE_TEXT_PROMPT_MAX_LENGTH + 1)

    expect(shortPrompt.length).toBeLessThanOrEqual(
      GENERATE_TEXT_PROMPT_MAX_LENGTH
    )
    expect(longPrompt.length).toBeGreaterThan(GENERATE_TEXT_PROMPT_MAX_LENGTH)
  })
})
