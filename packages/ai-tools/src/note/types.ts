export type NoteToolContext = {
	userId: string
}

export type NoteToolResult<TData> = {
	success: true
	message: string
	data: TData
}

export type NoteCreateData = {
	id: string
	title: string
	isInbox: boolean
}

export type NoteUpdateData = {
	id: string
	title: string
	isInbox: boolean
	isStarred: boolean
	isPinned: boolean
	updatedAt: string
}

export type NoteGetData = {
	id: string
	title: string
	contentText: string
	isInbox: boolean
	isStarred: boolean
	isPinned: boolean
	updatedAt: string
}

export type NoteDeleteData = {
	id: string
	deletedAt: string
}

export type NoteSearchResult = {
	id: string
	title: string
	contentText: string
	updatedAt: string
}

export type NoteSearchData = {
	items: NoteSearchResult[]
	count: number
}

const EMPTY_CONTEXT_ERROR = 'Missing tool context.'
const MISSING_USER_ID_ERROR = 'Missing userId in tool context.'

export function getNoteToolContext(experimentalContext: unknown): NoteToolContext {
	if (!experimentalContext || typeof experimentalContext !== 'object') {
		throw new Error(EMPTY_CONTEXT_ERROR)
	}

	const context = experimentalContext as { userId?: unknown }
	if (typeof context.userId !== 'string' || context.userId.length === 0) {
		throw new Error(MISSING_USER_ID_ERROR)
	}

	return { userId: context.userId }
}
