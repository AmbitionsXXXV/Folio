import type { NoteContext } from "@folionote/ai"
import { createLogger } from "@folionote/log"
import { generateText, Output, rerank } from "ai"
import type { LanguageModel, RerankingModel } from "ai"
import { z } from "zod"

const log = createLogger({ prefix: "rag:reranker" })

const MAX_SNIPPET_CHARS = 200
const MAX_CANDIDATES_FOR_RERANK = 20
const MAX_IMAGE_DESCRIPTIONS_FOR_RERANK = 2

interface RerankOptions {
  rerankingModel?: RerankingModel
  languageModel?: LanguageModel
}

function buildCandidateSnippet(note: NoteContext): string {
  const snippet =
    note.contentText.length > MAX_SNIPPET_CHARS
      ? `${note.contentText.slice(0, MAX_SNIPPET_CHARS)}…`
      : note.contentText
  const imageDescriptions = (note.images ?? [])
    .map((image) => image.description?.trim())
    .filter((description): description is string => Boolean(description))
    .slice(0, MAX_IMAGE_DESCRIPTIONS_FOR_RERANK)
  const imageSection =
    imageDescriptions.length > 0
      ? `\nImage descriptions: ${imageDescriptions.join(" | ")}`
      : ""
  return `${note.title}\n${snippet}${imageSection}`
}

/**
 * Rerank candidate notes.
 *
 * Strategy 1 (preferred): Model-level reranking via AI SDK `rerank()` -- fast, accurate, cheap.
 * Strategy 2 (fallback):  LLM structured-output scoring via `generateText()`.
 * Strategy 3:             Return original order when neither model is available.
 */
export async function rerankNotes(
  query: string,
  candidates: NoteContext[],
  options: RerankOptions
): Promise<NoteContext[]> {
  if (candidates.length <= 1) {
    return candidates
  }

  const toRerank = candidates.slice(0, MAX_CANDIDATES_FOR_RERANK)
  const overflow = candidates.slice(MAX_CANDIDATES_FOR_RERANK)

  if (options.rerankingModel) {
    try {
      return [
        ...(await rerankWithModel(query, toRerank, options.rerankingModel)),
        ...overflow
      ]
    } catch (error) {
      log.warn("Model-level rerank failed, trying LLM fallback:", error)
    }
  }

  if (options.languageModel) {
    try {
      return [
        ...(await rerankWithLLM(query, toRerank, options.languageModel)),
        ...overflow
      ]
    } catch (error) {
      log.warn("LLM rerank failed, using original order:", error)
    }
  }

  return candidates
}

async function rerankWithModel(
  query: string,
  candidates: NoteContext[],
  model: RerankingModel
): Promise<NoteContext[]> {
  const documents = candidates.map((note) => buildCandidateSnippet(note))

  const result = await rerank({
    model,
    query,
    documents,
    topN: candidates.length
  })

  const reranked = result.ranking
    .map((r) => candidates.at(r.originalIndex))
    .filter((note): note is NoteContext => note !== undefined)

  log.debug(
    `Model rerank: ${reranked.length} notes, top score: ${result.ranking[0]?.score.toFixed(3) ?? "N/A"}`
  )

  return reranked
}

const RerankResultSchema = z.object({
  rankings: z.array(
    z.object({
      id: z.string().describe("Note ID"),
      score: z
        .number()
        .min(0)
        .max(10)
        .describe("Relevance score 0-10, where 10 is most relevant")
    })
  )
})

const RERANK_SYSTEM_PROMPT = `You are a relevance judge for a personal knowledge base retrieval system.
Given a user query and a list of candidate notes (id, title, snippet), rate each note's relevance to the query on a scale of 0-10.

Scoring guide:
- 10: Directly answers the query
- 7-9: Highly relevant, contains key information
- 4-6: Somewhat relevant, tangentially related
- 1-3: Weakly related
- 0: Completely irrelevant

Return all note IDs with their scores.`

function buildCandidateList(notes: NoteContext[]): string {
  return notes
    .map(
      (note) => `[${note.id}] "${note.title}"\n${buildCandidateSnippet(note)}`
    )
    .join("\n\n")
}

async function rerankWithLLM(
  query: string,
  candidates: NoteContext[],
  model: LanguageModel
): Promise<NoteContext[]> {
  const candidateList = buildCandidateList(candidates)

  const result = await generateText({
    model,
    output: Output.object({ schema: RerankResultSchema }),
    system: RERANK_SYSTEM_PROMPT,
    prompt: `Query: ${query}\n\nCandidate notes:\n${candidateList}`
  })

  const scoreMap = new Map(
    (result.output?.rankings ?? []).map((r) => [r.id, r.score])
  )

  const reranked = [...candidates].toSorted((a, b) => {
    const scoreA = scoreMap.get(a.id) ?? 0
    const scoreB = scoreMap.get(b.id) ?? 0
    return scoreB - scoreA
  })

  log.debug(
    `LLM rerank: ${reranked.length} notes, top score: ${scoreMap.get(reranked[0]?.id ?? "") ?? "N/A"}`
  )

  return reranked
}
