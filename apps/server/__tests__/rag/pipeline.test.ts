import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../../src/services/rag/query-rewriter', () => ({
	rewriteQuery: vi
		.fn()
		.mockResolvedValue(['rewritten query 1', 'rewritten query 2']),
}))

vi.mock('../../src/services/rag/multi-retriever', () => ({
	multiRetrieve: vi.fn().mockResolvedValue([
		{
			id: 'note-a',
			title: 'Note A',
			contentText: 'Content A',
			sources: new Set(['fts', 'title']),
		},
		{
			id: 'note-b',
			title: 'Note B',
			contentText: 'Content B',
			sources: new Set(['fts']),
		},
	]),
}))

vi.mock('../../src/services/rag/reranker', () => ({
	rerankNotes: vi
		.fn()
		.mockImplementation(async (_query, candidates, _options) => candidates),
}))

vi.mock('../../src/services/notes', () => ({
	searchNotesForRag: vi
		.fn()
		.mockResolvedValue([
			{ id: 'fallback-1', title: 'Fallback', contentText: 'Legacy FTS result' },
		]),
}))

import { searchNotesForRag } from '../../src/services/notes'
import { multiRetrieve } from '../../src/services/rag/multi-retriever'
import { ragRetrieve } from '../../src/services/rag/pipeline'
import { rewriteQuery } from '../../src/services/rag/query-rewriter'
import { rerankNotes } from '../../src/services/rag/reranker'

const mockModel = {} as never

describe('ragRetrieve', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})
	it('should run full pipeline: rewrite -> retrieve -> rerank -> top-k', async () => {
		const result = await ragRetrieve({
			userId: 'user-1',
			query: 'how does React work',
			excludeIds: [],
			topK: 5,
			model: mockModel,
		})

		expect(rewriteQuery).toHaveBeenCalledWith('how does React work', mockModel)
		expect(multiRetrieve).toHaveBeenCalled()
		expect(rerankNotes).toHaveBeenCalled()
		expect(result).toHaveLength(2)
		expect(result[0].id).toBe('note-a')
	})

	it('should respect topK limit', async () => {
		const result = await ragRetrieve({
			userId: 'user-1',
			query: 'test',
			excludeIds: [],
			topK: 1,
			model: mockModel,
		})

		expect(result).toHaveLength(1)
	})

	it('should skip rewrite when disabled', async () => {
		await ragRetrieve({
			userId: 'user-1',
			query: 'test',
			excludeIds: [],
			topK: 5,
			model: mockModel,
			config: { enableQueryRewrite: false },
		})

		expect(rewriteQuery).not.toHaveBeenCalled()
	})

	it('should skip rerank when disabled', async () => {
		await ragRetrieve({
			userId: 'user-1',
			query: 'test',
			excludeIds: [],
			topK: 5,
			model: mockModel,
			config: { enableRerank: false },
		})

		expect(rerankNotes).not.toHaveBeenCalled()
	})

	it('should fallback to legacy FTS when pipeline fails', async () => {
		vi.mocked(multiRetrieve).mockRejectedValueOnce(new Error('DB error'))

		const result = await ragRetrieve({
			userId: 'user-1',
			query: 'test',
			excludeIds: [],
			topK: 5,
			model: mockModel,
		})

		expect(searchNotesForRag).toHaveBeenCalled()
		expect(result[0].id).toBe('fallback-1')
	})

	it('should fallback to legacy FTS when multi-retrieve returns empty', async () => {
		vi.mocked(multiRetrieve).mockResolvedValueOnce([])

		const result = await ragRetrieve({
			userId: 'user-1',
			query: 'test',
			excludeIds: [],
			topK: 5,
			model: mockModel,
		})

		expect(searchNotesForRag).toHaveBeenCalled()
		expect(result[0].id).toBe('fallback-1')
	})
})
