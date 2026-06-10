import { describe, expect, it, vi } from "vite-plus/test"

import { rewriteQuery } from "../../src/services/rag/query-rewriter"

vi.mock("ai", () => ({
  generateText: vi.fn().mockImplementation(async () => ({
    output: {
      queries: ["search term 1", "keyword query 2", "alternative phrasing 3"]
    }
  })),
  Output: { object: vi.fn().mockReturnValue({}) }
}))

const mockModel = {} as never

describe("rewriteQuery", () => {
  it("should return rewritten queries from the LLM", async () => {
    const result = await rewriteQuery("How does React work?", mockModel)
    expect(result).toEqual([
      "search term 1",
      "keyword query 2",
      "alternative phrasing 3"
    ])
  })

  it("should return empty array when input is empty", async () => {
    const { generateText } = await import("ai")
    vi.mocked(generateText).mockRejectedValueOnce(new Error("empty"))

    const result = await rewriteQuery("", mockModel)
    expect(result).toEqual([])
  })

  it("should return empty array when LLM call fails", async () => {
    const { generateText } = await import("ai")
    vi.mocked(generateText).mockRejectedValueOnce(new Error("LLM failed"))

    const result = await rewriteQuery("test query", mockModel)
    expect(result).toEqual([])
  })
})
