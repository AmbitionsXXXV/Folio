import { createTool } from "@mastra/core/tools"
import type { z } from "zod"

import { fetchWebSearchResults } from "../api/tavily-api"
import { WebSearchToolInputSchema } from "../schemas"

const currentYear = new Date().getFullYear()

export const webSearch = createTool({
  id: "webSearch",
  description: [
    "Search the web for current information using Tavily.",
    "Use this when the user asks about recent events, needs up-to-date facts, or wants information beyond your training data.",
    "Supports configurable result counts and search depth (basic for speed, advanced for comprehensiveness).",
    "",
    `The current year is ${currentYear}. You MUST use this year when searching for recent information or current events.`,
    `Example: If the user asks for "latest AI news", search for "AI news ${currentYear}", NOT "AI news ${currentYear - 1}".`
  ].join("\n"),
  strict: true,
  inputSchema: WebSearchToolInputSchema,
  execute: async (
    {
      query,
      maxResults,
      searchDepth
    }: z.infer<typeof WebSearchToolInputSchema>,
    context
  ) =>
    await fetchWebSearchResults(
      query,
      maxResults,
      searchDepth,
      context?.abortSignal
    )
})
