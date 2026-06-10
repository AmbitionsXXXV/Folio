import type { UIMessage } from "ai"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createMockOpenAICredential } from "../../../packages/ai/__tests__/mock-helpers"
import {
  generateChatTitle,
  shouldAutoGenerateChatTitle
} from "../src/services/chat-title-generator"

vi.mock("@folionote/ai/generate-text", () => ({
  generateTextWithCredential: vi.fn()
}))

import { generateTextWithCredential } from "@folionote/ai/generate-text"

const mockedGenerateTextWithCredential = vi.mocked(generateTextWithCredential)

function createMessage(
  id: string,
  role: "user" | "assistant",
  text: string
): UIMessage {
  return {
    id,
    role,
    parts: [{ type: "text", text }]
  }
}

describe("chat-title-generator", () => {
  const messages: UIMessage[] = [
    createMessage(
      "user-1",
      "user",
      "帮我总结一下 React hooks 和状态管理的关系"
    ),
    createMessage(
      "assistant-1",
      "assistant",
      "React hooks 负责在函数组件中组合状态与副作用逻辑。"
    )
  ]

  beforeEach(() => {
    mockedGenerateTextWithCredential.mockReset()
  })

  describe("shouldAutoGenerateChatTitle", () => {
    it("returns true for blank titles", () => {
      expect(shouldAutoGenerateChatTitle("", messages)).toBe(true)
    })

    it("returns true for heuristic fallback titles", () => {
      expect(
        shouldAutoGenerateChatTitle(
          "帮我总结一下 React hooks 和状态管理的关系",
          messages
        )
      ).toBe(true)
    })

    it("returns false for custom titles", () => {
      expect(shouldAutoGenerateChatTitle("React 架构讨论", messages)).toBe(
        false
      )
    })
  })

  describe("generateChatTitle", () => {
    it("normalizes the generated title", async () => {
      mockedGenerateTextWithCredential.mockResolvedValue({
        provider: "openai",
        modelId: "gpt-4o-mini",
        text: '"React Hooks 状态管理总结。" ',
        usage: undefined,
        finishReason: "stop"
      })

      const title = await generateChatTitle({
        credential: createMockOpenAICredential(),
        currentTitle: "",
        messages
      })

      expect(title).toBe("React Hooks 状态管理总结")
    })

    it("falls back to the heuristic title when the AI output is blank", async () => {
      mockedGenerateTextWithCredential.mockResolvedValue({
        provider: "openai",
        modelId: "gpt-4o-mini",
        text: "  ",
        usage: undefined,
        finishReason: "stop"
      })

      const title = await generateChatTitle({
        credential: createMockOpenAICredential(),
        currentTitle: "",
        messages
      })

      expect(title).toBe("帮我总结一下 React hooks 和状态管理的关系")
    })
  })
})
