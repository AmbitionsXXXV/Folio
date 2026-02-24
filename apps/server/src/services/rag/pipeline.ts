import type { NoteContext } from '@folionote/ai'
import { createLogger } from '@folionote/log'
import type { LanguageModel } from 'ai'
import { searchNotesForRag } from '../notes'
import { multiRetrieve } from './multi-retriever'
import { rewriteQuery } from './query-rewriter'
import { rerankNotes } from './reranker'

const log = createLogger({ prefix: 'rag:pipeline' })

const DEFAULT_LIMIT_PER_ROUTE = 10

export type RagPipelineConfig = {
	enableQueryRewrite?: boolean
	enableRerank?: boolean
}

type RagPipelineInput = {
	userId: string
	query: string
	excludeIds: string[]
	topK: number
	model: LanguageModel
	config?: RagPipelineConfig
}

/**
 * Full RAG pipeline: query rewrite -> multi-retrieve -> rerank -> top-k.
 * Falls back to the legacy FTS-only path if any LLM step fails.
 */
export async function ragRetrieve(input: RagPipelineInput): Promise<NoteContext[]> {
	const { userId, query, excludeIds, topK, model, config } = input

	const enableRewrite = config?.enableQueryRewrite !== false
	const enableRerank = config?.enableRerank !== false

	try {
		// Step 1: Query rewriting
		let rewrittenQueries: string[] = []
		if (enableRewrite) {
			rewrittenQueries = await rewriteQuery(query, model)
		}

		// Step 2: Multi-retrieval
		const candidates = await multiRetrieve(
			userId,
			query,
			rewrittenQueries,
			excludeIds,
			DEFAULT_LIMIT_PER_ROUTE
		)

		if (candidates.length === 0) {
			log.debug('Multi-retrieve returned 0 candidates, falling back to legacy FTS')
			return searchNotesForRag(userId, query, excludeIds, topK)
		}

		// Step 3: Rerank
		const notes: NoteContext[] = candidates.map(
			({ sources: _sources, ...note }) => note
		)
		let ranked = notes
		if (enableRerank && notes.length > 1) {
			ranked = await rerankNotes(query, notes, model)
		}

		// Step 4: Top-K selection
		const topResults = ranked.slice(0, topK)

		log.debug(
			`RAG pipeline: ${rewrittenQueries.length} rewrites, ${candidates.length} candidates, returning top-${topResults.length}`
		)

		return topResults
	} catch (error) {
		log.warn('RAG pipeline failed, falling back to legacy FTS:', error)
		return searchNotesForRag(userId, query, excludeIds, topK)
	}
}
