import { z } from "zod"

import { SEARCH_DEPTHS } from "./types"

// =============================================================================
// Tool Input Schemas
// =============================================================================

export const WebSearchToolInputSchema = z.object({
  query: z.string().trim().min(1).describe("The search query"),
  maxResults: z
    .number()
    .int()
    .min(1)
    .max(10)
    .optional()
    .describe("Maximum number of results to return (1-10, default 5)"),
  searchDepth: z
    .enum(SEARCH_DEPTHS)
    .optional()
    .describe("Search depth: basic (fast) or advanced (deeper)")
})

// =============================================================================
// Tavily API Response Schemas
// =============================================================================

export const TavilySearchResultSchema = z.object({
  title: z.string(),
  url: z.string(),
  content: z.string(),
  score: z.number().optional().nullish()
})

export const TavilySearchResponseSchema = z.object({
  query: z.string(),
  results: z.array(TavilySearchResultSchema)
})
