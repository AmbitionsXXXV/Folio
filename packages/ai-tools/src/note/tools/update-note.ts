import { db, entries } from '@folionote/db'
import { tool } from 'ai'
import { and, eq, isNull } from 'drizzle-orm'
import { UpdateNoteInputSchema } from '../schemas'
import {
	getNoteToolContext,
	type NoteToolResult,
	type NoteUpdateData,
} from '../types'

const TOOL_ABORTED_ERROR = 'Tool execution aborted.'
const NOTE_NOT_FOUND_ERROR = 'Note not found or access denied.'
const NO_UPDATES_ERROR = 'No fields provided for update.'

const EMPTY_PROSEMIRROR_DOC = {
	type: 'doc',
	content: [{ type: 'paragraph' }],
} as const

function normalizePlainText(content: string): string {
	return content.replaceAll('\r\n', '\n').replaceAll('\r', '\n')
}

function buildContentPayload(content: string): {
	contentJson: string
	contentText: string | null
} {
	const normalizedText = normalizePlainText(content)
	const hasText = normalizedText.trim().length > 0

	if (!hasText) {
		return {
			contentJson: JSON.stringify(EMPTY_PROSEMIRROR_DOC),
			contentText: null,
		}
	}

	const paragraphs = normalizedText.split('\n').map((line) => {
		if (line.length === 0) {
			return { type: 'paragraph' } as const
		}
		return {
			type: 'paragraph',
			content: [{ type: 'text', text: line }],
		}
	})

	return {
		contentJson: JSON.stringify({ type: 'doc', content: paragraphs }),
		contentText: normalizedText,
	}
}

export const updateNote = tool({
	description: 'Update an existing note by ID',
	strict: true,
	inputSchema: UpdateNoteInputSchema,
	needsApproval: true,
	execute: async (
		{ id, title, content, isInbox, isStarred, isPinned },
		{ experimental_context, abortSignal }
	): Promise<NoteToolResult<NoteUpdateData>> => {
		if (abortSignal?.aborted) {
			throw new Error(TOOL_ABORTED_ERROR)
		}

		const { userId } = getNoteToolContext(experimental_context)
		const fieldsToUpdate: Partial<typeof entries.$inferInsert> = {}
		let hasUpdates = false

		if (title !== undefined) {
			fieldsToUpdate.title = title
			hasUpdates = true
		}

		if (content !== undefined) {
			const payload = buildContentPayload(content)
			fieldsToUpdate.contentJson = payload.contentJson
			fieldsToUpdate.contentText = payload.contentText
			hasUpdates = true
		}

		if (isInbox !== undefined) {
			fieldsToUpdate.isInbox = isInbox
			hasUpdates = true
		}

		if (isStarred !== undefined) {
			fieldsToUpdate.isStarred = isStarred
			hasUpdates = true
		}

		if (isPinned !== undefined) {
			fieldsToUpdate.isPinned = isPinned
			hasUpdates = true
		}

		if (!hasUpdates) {
			throw new Error(NO_UPDATES_ERROR)
		}

		const [entry] = await db
			.update(entries)
			.set(fieldsToUpdate)
			.where(
				and(
					eq(entries.id, id),
					eq(entries.userId, userId),
					isNull(entries.deletedAt)
				)
			)
			.returning()

		if (!entry) {
			throw new Error(NOTE_NOT_FOUND_ERROR)
		}

		return {
			success: true,
			message: `Note "${entry.title}" updated successfully`,
			data: {
				id: entry.id,
				title: entry.title,
				isInbox: entry.isInbox,
				isStarred: entry.isStarred,
				isPinned: entry.isPinned,
				updatedAt: entry.updatedAt.toISOString(),
			},
		}
	},
})
