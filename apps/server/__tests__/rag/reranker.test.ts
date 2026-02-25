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
	Output: { object: vi.fn().mockReturnValue({}) },
}))

const mockModel = {} as never

const testNotes = [
	{ id: 'note-1', title: 'Introduction to React', contentText: 'React basics' },
	{ id: 'note-2', title: 'React Hooks Guide', contentText: 'useState, useEffect' },
	{ id: 'note-3', title: 'CSS Grid Layout', contentText: 'Grid template areas' },
]

describe('rerankNotes', () => {
	it('should reorder notes by relevance score', async () => {
		const result = await rerankNotes('React hooks', testNotes, mockModel)
		expect(result[0].id).toBe('note-2')
		expect(result[1].id).toBe('note-1')
		expect(result[2].id).toBe('note-3')
	})

	it('should return single note unchanged', async () => {
		const single = [testNotes[0]]
		const result = await rerankNotes('React', single, mockModel)
		expect(result).toEqual(single)
	})

	it('should return original order when LLM fails', async () => {
		const { generateText } = await import('ai')
		vi.mocked(generateText).mockRejectedValueOnce(new Error('LLM timeout'))

		const result = await rerankNotes('test', testNotes, mockModel)
		expect(result.map((n) => n.id)).toEqual(['note-1', 'note-2', 'note-3'])
	})
})
