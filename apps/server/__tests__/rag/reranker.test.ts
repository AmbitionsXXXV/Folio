import { describe, expect, it, vi } from 'vitest'
import { rerankNotes } from '../../src/services/rag/reranker'

vi.mock('ai', () => ({
	generateText: vi.fn().mockImplementation(async () => ({
		output: {
			rankings: [
				{ id: 'note-2', score: 9 },
				{ id: 'note-1', score: 5 },
				{ id: 'note-3', score: 2 },
			],
		},
	})),
	rerank: vi
		.fn()
		.mockImplementation(async ({ documents }: { documents: string[] }) => ({
			ranking: documents.map((_d: string, i: number) => ({
				originalIndex: i,
				score: 1 - i * 0.3,
				document: _d,
			})),
			rerankedDocuments: documents,
			originalDocuments: documents,
			response: { timestamp: new Date(), modelId: 'test' },
		})),
	Output: { object: vi.fn().mockReturnValue({}) },
}))

const mockLanguageModel = {} as never
const mockRerankingModel = {} as never

const testNotes = [
	{ id: 'note-1', title: 'Introduction to React', contentText: 'React basics' },
	{ id: 'note-2', title: 'React Hooks Guide', contentText: 'useState, useEffect' },
	{ id: 'note-3', title: 'CSS Grid Layout', contentText: 'Grid template areas' },
]

describe('rerankNotes', () => {
	it('should reorder notes by LLM relevance score', async () => {
		const result = await rerankNotes('React hooks', testNotes, {
			languageModel: mockLanguageModel,
		})
		expect(result[0].id).toBe('note-2')
		expect(result[1].id).toBe('note-1')
		expect(result[2].id).toBe('note-3')
	})

	it('should use model-level rerank when rerankingModel is provided', async () => {
		const { rerank } = await import('ai')
		const result = await rerankNotes('React hooks', testNotes, {
			rerankingModel: mockRerankingModel,
		})
		expect(rerank).toHaveBeenCalled()
		expect(result).toHaveLength(3)
	})

	it('should return single note unchanged', async () => {
		const single = [testNotes[0]]
		const result = await rerankNotes('React', single, {
			languageModel: mockLanguageModel,
		})
		expect(result).toEqual(single)
	})

	it('should return original order when both models fail', async () => {
		const result = await rerankNotes('test', testNotes, {})
		expect(result.map((n) => n.id)).toEqual(['note-1', 'note-2', 'note-3'])
	})

	it('should fall back to LLM when model-level rerank fails', async () => {
		const { rerank } = await import('ai')
		vi.mocked(rerank).mockRejectedValueOnce(new Error('Model rerank timeout'))

		const result = await rerankNotes('React hooks', testNotes, {
			rerankingModel: mockRerankingModel,
			languageModel: mockLanguageModel,
		})
		expect(result[0].id).toBe('note-2')
	})
})
