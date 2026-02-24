import type { NoteContext } from '@folionote/ai'
import { db, entries, entryTags, tags } from '@folionote/db'
import { createLogger } from '@folionote/log'
import { and, desc, eq, inArray, isNull, notInArray, or, sql } from 'drizzle-orm'

const log = createLogger({ prefix: 'rag:multi-retriever' })

const WHITESPACE_REGEX = /\s+/

type RetrievalSource = 'fts' | 'ilike' | 'title' | 'tag'

export type ScoredNoteContext = NoteContext & {
	sources: Set<RetrievalSource>
}

function buildBaseConditions(userId: string, excludeIds: string[]) {
	const conditions = [
		eq(entries.userId, userId),
		isNull(entries.deletedAt),
		eq(entries.isInbox, false),
	]
	if (excludeIds.length > 0) {
		conditions.push(notInArray(entries.id, excludeIds))
	}
	return conditions
}

function toFtsTerms(query: string): string {
	return query
		.trim()
		.split(WHITESPACE_REGEX)
		.filter((t) => t.length > 0)
		.map((t) => `${t}:*`)
		.join(' & ')
}

function mapToNoteContext(
	rows: Array<{ id: string; title: string; contentText: string | null }>
): NoteContext[] {
	return rows.map((n) => ({
		id: n.id,
		title: n.title,
		contentText: n.contentText ?? '',
	}))
}

async function searchByFts(
	userId: string,
	query: string,
	excludeIds: string[],
	limit: number
): Promise<NoteContext[]> {
	const ftsTerms = toFtsTerms(query)
	if (!ftsTerms) return []

	try {
		const rows = await db
			.select({
				id: entries.id,
				title: entries.title,
				contentText: entries.contentText,
			})
			.from(entries)
			.where(
				and(
					...buildBaseConditions(userId, excludeIds),
					sql`to_tsvector('simple', coalesce(${entries.title}, '') || ' ' || coalesce(${entries.contentText}, '')) @@ to_tsquery('simple', ${ftsTerms})`
				)
			)
			.orderBy(desc(entries.updatedAt))
			.limit(limit)
		return mapToNoteContext(rows)
	} catch (error) {
		log.warn('FTS search failed:', error)
		return []
	}
}

async function searchByIlike(
	userId: string,
	query: string,
	excludeIds: string[],
	limit: number
): Promise<NoteContext[]> {
	const pattern = `%${query}%`
	const rows = await db
		.select({
			id: entries.id,
			title: entries.title,
			contentText: entries.contentText,
		})
		.from(entries)
		.where(
			and(
				...buildBaseConditions(userId, excludeIds),
				sql`(${entries.title} ILIKE ${pattern} OR ${entries.contentText} ILIKE ${pattern})`
			)
		)
		.orderBy(desc(entries.updatedAt))
		.limit(limit)
	return mapToNoteContext(rows)
}

async function searchByTitle(
	userId: string,
	query: string,
	excludeIds: string[],
	limit: number
): Promise<NoteContext[]> {
	const pattern = `%${query}%`
	const rows = await db
		.select({
			id: entries.id,
			title: entries.title,
			contentText: entries.contentText,
		})
		.from(entries)
		.where(
			and(
				...buildBaseConditions(userId, excludeIds),
				sql`${entries.title} ILIKE ${pattern}`
			)
		)
		.orderBy(desc(entries.updatedAt))
		.limit(limit)
	return mapToNoteContext(rows)
}

async function searchByTag(
	userId: string,
	query: string,
	excludeIds: string[],
	limit: number
): Promise<NoteContext[]> {
	const terms = query
		.trim()
		.split(WHITESPACE_REGEX)
		.filter((t) => t.length > 0)

	if (terms.length === 0) return []

	const tagPatterns = terms.map((t) => sql`${tags.name} ILIKE ${`%${t}%`}`)

	try {
		const matchingTagRows = await db
			.select({ id: tags.id })
			.from(tags)
			.where(and(eq(tags.userId, userId), or(...tagPatterns)))
			.limit(limit)

		const tagIds = matchingTagRows.map((t) => t.id)
		if (tagIds.length === 0) return []

		const entryRows = await db
			.selectDistinct({
				id: entries.id,
				title: entries.title,
				contentText: entries.contentText,
			})
			.from(entries)
			.innerJoin(entryTags, eq(entries.id, entryTags.entryId))
			.where(
				and(
					...buildBaseConditions(userId, excludeIds),
					inArray(entryTags.tagId, tagIds)
				)
			)
			.orderBy(desc(entries.updatedAt))
			.limit(limit)

		return mapToNoteContext(entryRows)
	} catch (error) {
		log.warn('Tag search failed:', error)
		return []
	}
}

/**
 * Run multiple retrieval strategies in parallel, merge and deduplicate results.
 * Each note is annotated with which sources found it.
 */
export async function multiRetrieve(
	userId: string,
	originalQuery: string,
	rewrittenQueries: string[],
	excludeIds: string[],
	limitPerRoute: number
): Promise<ScoredNoteContext[]> {
	const allQueries = [originalQuery, ...rewrittenQueries]

	const ftsPromises = allQueries.map((q) =>
		searchByFts(userId, q, excludeIds, limitPerRoute)
	)
	const titlePromise = searchByTitle(
		userId,
		originalQuery,
		excludeIds,
		limitPerRoute
	)
	const tagPromise = searchByTag(userId, originalQuery, excludeIds, limitPerRoute)
	const ilikePromise = searchByIlike(
		userId,
		originalQuery,
		excludeIds,
		limitPerRoute
	)

	const results = await Promise.all([
		...ftsPromises,
		titlePromise,
		tagPromise,
		ilikePromise,
	])

	const sourceLabels: RetrievalSource[] = [
		...allQueries.map((): RetrievalSource => 'fts'),
		'title',
		'tag',
		'ilike',
	]

	const mergedMap = new Map<string, ScoredNoteContext>()

	for (let i = 0; i < results.length; i++) {
		const source = sourceLabels[i] ?? 'fts'
		const batch = results[i]
		if (!batch) continue
		for (const note of batch) {
			const existing = mergedMap.get(note.id)
			if (existing) {
				existing.sources.add(source)
			} else {
				mergedMap.set(note.id, { ...note, sources: new Set([source]) })
			}
		}
	}

	const merged = [...mergedMap.values()]

	// Sort by number of sources (more = higher relevance signal)
	merged.sort((a, b) => b.sources.size - a.sources.size)

	log.debug(
		`Multi-retrieve: ${merged.length} unique notes from ${results.flat().length} total hits`
	)

	return merged
}
