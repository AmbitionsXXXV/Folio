import { createNote } from './create-note'
import { deleteNote } from './delete-note'
import { getNote } from './get-note'
import { searchNotes } from './search-notes'
import { updateNote } from './update-note'

export const noteTools = {
	createNote,
	updateNote,
	getNote,
	deleteNote,
	searchNotes,
}

export { createNote, deleteNote, getNote, searchNotes, updateNote }
