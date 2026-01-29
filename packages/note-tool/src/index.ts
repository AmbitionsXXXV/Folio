// =============================================================================
// Types
// =============================================================================

export type {
	NoteCreateData,
	NoteDeleteData,
	NoteGetData,
	NoteSearchData,
	NoteSearchResult,
	NoteToolContext,
	NoteToolResult,
	NoteUpdateData,
} from './types'
export { getNoteToolContext } from './types'

// =============================================================================
// Schemas (for validation/parsing in consumers)
// =============================================================================

export {
	CreateNoteInputSchema,
	DeleteNoteInputSchema,
	GetNoteInputSchema,
	SearchNotesInputSchema,
	UpdateNoteInputSchema,
} from './schemas'

// =============================================================================
// Tools (server-side)
// =============================================================================

export {
	createNote,
	deleteNote,
	getNote,
	noteTools,
	searchNotes,
	updateNote,
} from './tools'
