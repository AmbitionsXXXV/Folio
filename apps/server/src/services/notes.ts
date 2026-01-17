import type { NoteContext } from '@folionote/ai'
import { db, entries } from '@folionote/db'
import { createLogger } from '@folionote/log'
import { and, desc, eq, inArray, isNull, notInArray, sql } from 'drizzle-orm'

const log = createLogger({ prefix: 'notes-service' })

/** Maximum number of attached notes allowed */
export const MAX_ATTACHED_NOTES = 10

/** Regex for splitting query into search terms */
const WHITESPACE_REGEX = /\s+/

/**
 * Fetch notes by IDs for the given user (Library only, not deleted)
 */
export async function fetchNotesByIds(
	userId: string,
	noteIds: string[]
): Promise<NoteContext[]> {
	if (noteIds.length === 0) return []

	const notes = await db
		.select({
			id: entries.id,
			title: entries.title,
			contentText: entries.contentText,
		})
		.from(entries)
		.where(
			and(
				eq(entries.userId, userId),
				inArray(entries.id, noteIds),
				isNull(entries.deletedAt),
				eq(entries.isInbox, false) // Library only
			)
		)

	return notes.map((n) => ({
		id: n.id,
		title: n.title,
		contentText: n.contentText ?? '',
	}))
}

/**
 * Perform FTS search for RAG retrieval
 * Falls back to ILIKE if FTS returns no results
 */
export async function searchNotesForRag(
	userId: string,
	query: string,
	excludeIds: string[],
	limit: number
): Promise<NoteContext[]> {
	const searchTerms = query
		.trim()
		.split(WHITESPACE_REGEX)
		.filter((term) => term.length > 0)
		.map((term) => `${term}:*`)
		.join(' & ')

	if (!searchTerms) return []

	const baseConditions = [
		eq(entries.userId, userId),
		isNull(entries.deletedAt),
		eq(entries.isInbox, false), // Library only
	]

	if (excludeIds.length > 0) {
		baseConditions.push(notInArray(entries.id, excludeIds))
	}

	// Try FTS first
	try {
		const ftsResults = await db
			.select({
				id: entries.id,
				title: entries.title,
				contentText: entries.contentText,
			})
			.from(entries)
			.where(
				and(
					...baseConditions,
					sql`to_tsvector('simple', coalesce(${entries.title}, '') || ' ' || coalesce(${entries.contentText}, '')) @@ to_tsquery('simple', ${searchTerms})`
				)
			)
			.orderBy(desc(entries.updatedAt))
			.limit(limit)

		if (ftsResults.length > 0) {
			return ftsResults.map((n) => ({
				id: n.id,
				title: n.title,
				contentText: n.contentText ?? '',
			}))
		}
	} catch (error) {
		log.warn('FTS search failed, falling back to ILIKE:', error)
	}

	// Fallback to ILIKE
	const searchPattern = `%${query}%`
	const ilikeResults = await db
		.select({
			id: entries.id,
			title: entries.title,
			contentText: entries.contentText,
		})
		.from(entries)
		.where(
			and(
				...baseConditions,
				sql`(${entries.title} ILIKE ${searchPattern} OR ${entries.contentText} ILIKE ${searchPattern})`
			)
		)
		.orderBy(desc(entries.updatedAt))
		.limit(limit)

	return ilikeResults.map((n) => ({
		id: n.id,
		title: n.title,
		contentText: n.contentText ?? '',
	}))
}
