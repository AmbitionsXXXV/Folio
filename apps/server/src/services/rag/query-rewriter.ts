import { createLogger } from "@folionote/log"
import { generateText, Output } from "ai"
import type { LanguageModel } from "ai"
import { z } from "zod"

const log = createLogger({ prefix: "rag:query-rewriter" })

const REWRITE_MAX_QUERIES = 3

const QueryRewriteSchema = z.object({
  queries: z
    .array(z.string())
    .min(1)
    .max(REWRITE_MAX_QUERIES)
    .describe(
      "Rewritten search queries optimized for full-text search. Each should target a different angle of the user intent."
    )
})

const REWRITE_SYSTEM_PROMPT = `You are a search query optimizer for a personal knowledge base.
Given a user's natural language question, generate 2-3 alternative search queries that would help find relevant notes.

Rules:
- Extract key concepts and use synonyms/related terms
- Convert questions into keyword-style queries suitable for full-text search
- Each query should target a different aspect or phrasing of the user's intent
- Keep queries concise (2-6 words each)
- Output in the same language as the input`

/**
 * Rewrite a user query into multiple FTS-friendly search queries using an LLM.
 * Returns the original query plus rewritten variants.
 */
export async function rewriteQuery(
  query: string,
  model: LanguageModel
): Promise<string[]> {
  try {
    const result = await generateText({
      model,
      output: Output.object({ schema: QueryRewriteSchema }),
      system: REWRITE_SYSTEM_PROMPT,
      prompt: query
    })

    const rewritten = (result.output?.queries ?? []).filter(
      (q) => q.trim().length > 0
    )

    log.debug(`Rewrote "${query}" into ${rewritten.length} queries`, rewritten)
    return rewritten
  } catch (error) {
    log.warn("Query rewrite failed, using original query only:", error)
    return []
  }
}
