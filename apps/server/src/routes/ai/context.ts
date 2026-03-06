import {
	type AiProvider,
	DEFAULT_KNOWLEDGE_CHAT_RAG_TOP_K,
	type DecryptedCredential,
	type NoteContext,
	providerSupports,
} from '@folionote/ai'
import { createVercelAiEmbeddingModel } from '@folionote/ai/vercel-ai'
import type { ModelMessage, UIMessage } from 'ai'
import { loadChatMessages } from '../../services/ai-chat-store'
import { ensureEntryImageCaptions } from '../../services/image-captioning'
import {
	fetchNotesByIds,
	MAX_ATTACHED_NOTES,
	searchNotesForRag,
} from '../../services/notes'
import { ragRetrieve } from '../../services/rag'
import { buildTopologyContext } from '../../services/topology-context'
import { log, truncateText } from './helpers'

export const MAX_NOTE_IMAGES_FOR_VISION = 5
export const MAX_IMAGE_DESCRIPTION_CHARS = 280

export function buildVisionContextMessage(
	notes: Array<{ title: string; images?: NoteContext['images'] }>
): ModelMessage | undefined {
	const content: Array<
		| { type: 'text'; text: string }
		| { type: 'image'; image: URL; mediaType?: string }
	> = [
		{
			type: 'text',
			text: [
				'Reference images from the user notes are attached below.',
				'Use them as supporting context when answering the user question.',
				'If an image is irrelevant, ignore it.',
			].join('\n'),
		},
	]

	let imageCount = 0
	for (const note of notes) {
		if (!note.images || note.images.length === 0) continue
		for (const image of note.images) {
			if (imageCount >= MAX_NOTE_IMAGES_FOR_VISION) break
			try {
				const imageUrl = new URL(image.url)
				const description =
					image.description?.trim() ?? 'No generated description available.'
				content.push({
					type: 'text',
					text: `Note: ${note.title}\nImage summary: ${truncateText(description, MAX_IMAGE_DESCRIPTION_CHARS)}`,
				})
				content.push({
					type: 'image',
					image: imageUrl,
					mediaType: image.mimeType,
				})
				imageCount += 1
			} catch (error) {
				log.warn(`Invalid image URL skipped: ${image.url}`, error)
			}
		}
		if (imageCount >= MAX_NOTE_IMAGES_FOR_VISION) break
	}

	if (imageCount === 0) {
		return undefined
	}

	return {
		role: 'user',
		content,
	}
}

export async function resolveStreamMessages(input: {
	userId: string
	chatId: string
	prompt?: string
	requestMessages?: UIMessage[]
}): Promise<UIMessage[]> {
	if (input.requestMessages && input.requestMessages.length > 0) {
		return input.requestMessages
	}

	const storedMessages = await loadChatMessages(input.userId, input.chatId)
	const userMessage: UIMessage = {
		id: `user-${Date.now()}`,
		role: 'user',
		parts: [{ type: 'text', text: input.prompt ?? '' }],
	}

	return [...storedMessages, userMessage]
}

/**
 * Prepare note context for AI streaming (RAG).
 * When a LanguageModel is provided, the enhanced RAG pipeline (query rewrite + multi-retrieve + rerank)
 * is used. Falls back to the legacy FTS-only path on failure or when no model is given.
 */
export async function prepareNoteContext(
	userId: string,
	prompt: string,
	noteEntryIds: string[] | undefined,
	ragTopK: number | undefined,
	model?: import('ai').LanguageModel,
	captionOptions?: {
		credential: DecryptedCredential
		model?: string
	}
) {
	const sanitizedNoteIds = (noteEntryIds ?? [])
		.filter((id) => typeof id === 'string' && id.length > 0)
		.slice(0, MAX_ATTACHED_NOTES)

	const uniqueNoteIds = [...new Set(sanitizedNoteIds)]
	let attachedNotes = await fetchNotesByIds(userId, uniqueNoteIds)

	const effectiveRagTopK = ragTopK ?? DEFAULT_KNOWLEDGE_CHAT_RAG_TOP_K

	let embeddingModel: import('ai').EmbeddingModel | undefined
	if (captionOptions?.credential) {
		try {
			if (providerSupports(captionOptions.credential.provider, 'embedding')) {
				embeddingModel = createVercelAiEmbeddingModel(captionOptions.credential)
			}
		} catch {
			/* embedding not available for this provider */
		}
	}

	let retrievedNotes = model
		? await ragRetrieve({
				userId,
				query: prompt,
				excludeIds: uniqueNoteIds,
				topK: effectiveRagTopK,
				model,
				embeddingModel,
			})
		: await searchNotesForRag(userId, prompt, uniqueNoteIds, effectiveRagTopK)

	const allNoteIds = [
		...new Set([...uniqueNoteIds, ...retrievedNotes.map((note) => note.id)]),
	]
	if (allNoteIds.length > 0) {
		const generatedCount = await ensureEntryImageCaptions({
			userId,
			entryIds: allNoteIds,
			credential: captionOptions?.credential,
			model: captionOptions?.model,
			allowEnvFallback: true,
		})

		if (generatedCount > 0) {
			const refreshedNotes = await fetchNotesByIds(userId, allNoteIds)
			const refreshedNoteMap = new Map(
				refreshedNotes.map((note) => [note.id, note] as const)
			)

			attachedNotes = uniqueNoteIds
				.map((noteId) => refreshedNoteMap.get(noteId))
				.filter((note): note is NoteContext => Boolean(note))

			retrievedNotes = retrievedNotes.map(
				(note) => refreshedNoteMap.get(note.id) ?? note
			)

			log.debug(`Generated image captions for ${generatedCount} attachment(s)`)
		}
	}

	return { attachedNotes, retrievedNotes }
}

export async function resolveTopologyContextText(
	userId: string,
	noteEntryIds: string[] | undefined,
	attachedNotes: NoteContext[]
): Promise<string> {
	const topologyEntryIds = [
		...(noteEntryIds ?? []),
		...attachedNotes.map((note) => note.id),
	]
	if (topologyEntryIds.length === 0) {
		return ''
	}

	const { contextText } = await buildTopologyContext(userId, topologyEntryIds, 1)
	return contextText
}

export function mergeVisionCandidateNotes(
	attachedNotes: NoteContext[],
	retrievedNotes: NoteContext[]
): NoteContext[] {
	const attachedNoteIds = new Set(attachedNotes.map((note) => note.id))
	const uniqueRetrievedNotes = retrievedNotes.filter(
		(note) => !attachedNoteIds.has(note.id)
	)
	return [...attachedNotes, ...uniqueRetrievedNotes]
}

export function buildModelMessagesWithVisionContext(input: {
	provider: AiProvider
	modelMessages: ModelMessage[]
	attachedNotes: NoteContext[]
	retrievedNotes: NoteContext[]
}): ModelMessage[] {
	if (!providerSupports(input.provider, 'vision')) {
		return input.modelMessages
	}

	const visionContextMessage = buildVisionContextMessage(
		mergeVisionCandidateNotes(input.attachedNotes, input.retrievedNotes)
	)
	if (!visionContextMessage) {
		return input.modelMessages
	}

	return [...input.modelMessages, visionContextMessage]
}

export function combineSystemPrompt(
	baseSystemPrompt: string,
	topologyContextText: string
): string {
	if (topologyContextText.length === 0) {
		return baseSystemPrompt
	}
	return `${baseSystemPrompt}\n\n${topologyContextText}`
}
