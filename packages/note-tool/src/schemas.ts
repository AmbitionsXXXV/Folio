import { z } from 'zod'

const DEFAULT_IS_INBOX = false
const MIN_SEARCH_LIMIT = 1
const MAX_SEARCH_LIMIT = 20
const DEFAULT_SEARCH_LIMIT = 10

export const CreateNoteInputSchema = z.object({
	title: z.string().describe('The title of the note'),
	content: z.string().optional().describe('The content of the note in plain text'),
	isInbox: z
		.boolean()
		.optional()
		.default(DEFAULT_IS_INBOX)
		.describe('Whether to put the note in Inbox (true) or Library (false)'),
})

export const UpdateNoteInputSchema = z.object({
	id: z.string().describe('The ID of the note to update'),
	title: z.string().optional().describe('New title'),
	content: z.string().optional().describe('New content in plain text'),
	isInbox: z.boolean().optional().describe('Move to Inbox or Library'),
	isStarred: z.boolean().optional().describe('Star or unstar the note'),
	isPinned: z.boolean().optional().describe('Pin or unpin the note'),
})

export const GetNoteInputSchema = z.object({
	id: z.string().describe('The ID of the note to retrieve'),
})

export const DeleteNoteInputSchema = z.object({
	id: z.string().describe('The ID of the note to delete'),
})

export const SearchNotesInputSchema = z.object({
	query: z.string().describe('Search keywords'),
	limit: z
		.number()
		.int()
		.min(MIN_SEARCH_LIMIT)
		.max(MAX_SEARCH_LIMIT)
		.optional()
		.default(DEFAULT_SEARCH_LIMIT)
		.describe('Maximum number of results to return'),
})
