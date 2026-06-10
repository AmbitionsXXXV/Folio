import { describe, expect, it } from "vite-plus/test"

import { splitEntryContent } from "../../src/rag/chunker"

describe("splitEntryContent", () => {
  it("returns empty array for blank input", async () => {
    const result = await splitEntryContent("Title", "")
    expect(result).toEqual([])

    const whitespaceResult = await splitEntryContent("Title", "   ")
    expect(whitespaceResult).toEqual([])
  })

  it("returns single chunk for short content", async () => {
    const result = await splitEntryContent("My Note", "Short content here.")
    expect(result).toHaveLength(1)
    expect(result.at(0)?.chunkIndex).toBe(0)
    expect(result.at(0)?.content).toBe("# My Note\n\nShort content here.")
    expect(result.at(0)?.metadata).toEqual({ isFullContent: true })
  })

  it("prefixes each chunk with title", async () => {
    const longContent = "A".repeat(1000)
    const result = await splitEntryContent("Test Title", longContent)
    for (const chunk of result) {
      expect(chunk.content.startsWith("# Test Title\n\n")).toBe(true)
    }
  })

  it("handles empty title gracefully", async () => {
    const result = await splitEntryContent("", "Short text")
    expect(result.at(0)?.content).toBe("Short text")
  })

  it("splits long content into multiple chunks", async () => {
    const paragraphs = Array.from(
      { length: 20 },
      (_, i) =>
        `Paragraph ${i + 1}: ${"Lorem ipsum dolor sit amet. ".repeat(5)}`
    ).join("\n\n")

    const result = await splitEntryContent("Long Note", paragraphs)
    expect(result.length).toBeGreaterThan(1)

    for (let i = 0; i < result.length; i++) {
      expect(result.at(i)?.chunkIndex).toBe(i)
    }
  })

  it("respects custom chunk size", async () => {
    const content = "Word ".repeat(200)
    const small = await splitEntryContent("T", content, { chunkSize: 100 })
    const large = await splitEntryContent("T", content, { chunkSize: 2000 })
    expect(small.length).toBeGreaterThan(large.length)
  })

  it("handles Chinese text with proper separators", async () => {
    const zhContent = Array.from(
      { length: 30 },
      (_, i) =>
        `第${i + 1}段：这是一段中文文本，用于测试分块功能。每段文本都有一定长度，确保能够触发分块逻辑。`
    ).join("\n\n")

    const result = await splitEntryContent("中文笔记", zhContent)
    expect(result.length).toBeGreaterThan(1)
    expect(result.at(0)?.content).toContain("# 中文笔记")
  })
})
