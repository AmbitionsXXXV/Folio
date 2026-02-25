import type { NoteContext } from '@folionote/ai'
import { createLogger } from '@folionote/log'
import { generateText, type LanguageModel, Output } from 'ai'
import { z } from 'zod'

const log = createLogger({ prefix: 'rag:reranker' })

const MAX_SNIPPET_CHARS = 200
const MAX_CANDIDATES_FOR_RERANK = 20

const RerankResultSchema = z.object({
	rankings: z.array(
		z.object({
			id: z.string().describe('Note ID'),
			score: z
				.number()
				.min(0)
				.max(10)
				.describe('Relevance score 0-10, where 10 is most relevant'),
		})
	),
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
		.map((note) => {
			const snippet =
				note.contentText.length > MAX_SNIPPET_CHARS
					? `${note.contentText.slice(0, MAX_SNIPPET_CHARS)}…`
					: note.contentText
			return `[${note.id}] "${note.title}"\n${snippet}`
		})
		.join('\n\n')
}

/**
 * Rerank candidate notes using LLM-based relevance scoring.
 * Falls back to original order if LLM call fails.
 */
export async function rerankNotes(
	query: string,
	candidates: NoteContext[],
	model: LanguageModel
): Promise<NoteContext[]> {
	if (candidates.length <= 1) return candidates

	const toRerank = candidates.slice(0, MAX_CANDIDATES_FOR_RERANK)

	try {
		const candidateList = buildCandidateList(toRerank)

		const result = await generateText({
			model,
			output: Output.object({ schema: RerankResultSchema }),
			system: RERANK_SYSTEM_PROMPT,
			prompt: `Query: ${query}\n\nCandidate notes:\n${candidateList}`,
		})

		const scoreMap = new Map(
			(result.output?.rankings ?? []).map((r) => [r.id, r.score])
		)

		const reranked = [...toRerank].sort((a, b) => {
			const scoreA = scoreMap.get(a.id) ?? 0
			const scoreB = scoreMap.get(b.id) ?? 0
			return scoreB - scoreA
		})

		log.debug(
			`Reranked ${reranked.length} notes. Top score: ${scoreMap.get(reranked[0]?.id ?? '') ?? 'N/A'}`
		)

		const rerankEnd = candidates.slice(MAX_CANDIDATES_FOR_RERANK)
		return [...reranked, ...rerankEnd]
	} catch (error) {
		log.warn('Rerank failed, using original order:', error)
		return candidates
	}
}
