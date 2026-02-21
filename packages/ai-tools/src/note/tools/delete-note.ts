import { db, entries } from '@folionote/db'
import { tool } from 'ai'
import { and, eq, isNull } from 'drizzle-orm'
import { DeleteNoteInputSchema } from '../schemas'
import {
	getNoteToolContext,
	type NoteDeleteData,
	type NoteToolResult,
} from '../types'

const TOOL_ABORTED_ERROR = 'Tool execution aborted.'
const NOTE_NOT_FOUND_ERROR = 'Note not found or access denied.'

export const deleteNote = tool({
	description: 'Soft delete a note by ID',
	strict: true,
	inputSchema: DeleteNoteInputSchema,
	needsApproval: true,
	execute: async (
		{ id },
		{ experimental_context, abortSignal }
	): Promise<NoteToolResult<NoteDeleteData>> => {
		if (abortSignal?.aborted) {
			throw new Error(TOOL_ABORTED_ERROR)
		}

		const { userId } = getNoteToolContext(experimental_context)
		const deletedAt = new Date()

		const [entry] = await db
			.update(entries)
			.set({ deletedAt })
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
			message: `Note "${entry.title}" deleted successfully`,
			data: {
				id: entry.id,
				deletedAt: deletedAt.toISOString(),
			},
		}
	},
})
