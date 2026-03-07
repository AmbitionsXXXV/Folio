import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockEnsureEntryImageCaptions = vi.hoisted(() => vi.fn())
const mockFetchNotesByIds = vi.hoisted(() => vi.fn())
const mockSearchNotesForRag = vi.hoisted(() => vi.fn())
const mockRagRetrieve = vi.hoisted(() => vi.fn())
const mockProviderSupports = vi.hoisted(() => vi.fn().mockReturnValue(true))
const mockCreateEmbeddingModel = vi.hoisted(() => vi.fn())

vi.mock('../../src/services/image-captioning', () => ({
	ensureEntryImageCaptions: mockEnsureEntryImageCaptions,
}))

vi.mock('../../src/services/notes', () => ({
	MAX_ATTACHED_NOTES: 10,
	fetchNotesByIds: mockFetchNotesByIds,
	searchNotesForRag: mockSearchNotesForRag,
}))

vi.mock('../../src/services/rag', () => ({
	ragRetrieve: mockRagRetrieve,
}))

vi.mock('@folionote/ai', () => ({
	DEFAULT_KNOWLEDGE_CHAT_RAG_TOP_K: 5,
	providerSupports: mockProviderSupports,
}))

vi.mock('@folionote/ai/vercel-ai', () => ({
	createVercelAiEmbeddingModel: mockCreateEmbeddingModel,
}))

import { prepareNoteContext } from '../../src/routes/ai/context'

describe('prepareNoteContext', () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockFetchNotesByIds.mockResolvedValue([
			{ id: 'note-1', title: 'Note 1', contentText: '' },
		])
		mockSearchNotesForRag.mockResolvedValue([
			{ id: 'note-2', title: 'Note 2', contentText: '' },
		])
		mockRagRetrieve.mockResolvedValue([
			{ id: 'note-2', title: 'Note 2', contentText: '' },
		])
		mockEnsureEntryImageCaptions.mockResolvedValue(0)
		mockCreateEmbeddingModel.mockReturnValue({ modelId: 'embed-model' })
	})

	it('does not use platform caption fallback while enriching chat context', async () => {
		await prepareNoteContext(
			'user-1',
			'query',
			['note-1'],
			undefined,
			{} as import('ai').LanguageModel,
			{
				credential: {
					provider: 'openai',
					apiKey: 'user-key',
					baseUrl: 'https://api.openai.com/v1',
				},
			}
		)

		expect(mockEnsureEntryImageCaptions).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 'user-1',
				entryIds: ['note-1', 'note-2'],
				allowEnvFallback: false,
			})
		)
	})
})
