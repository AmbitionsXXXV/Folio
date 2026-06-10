import type { NoteContext } from "@folionote/ai"
import { attachments, db, entries } from "@folionote/db"
import { createLogger } from "@folionote/log"
import { getS3Config, STORAGE_BUCKETS } from "@folionote/storage"
import { and, desc, eq, inArray, isNull, notInArray, sql } from "drizzle-orm"

const log = createLogger({ prefix: "notes-service" })

/** Maximum number of attached notes allowed */
export const MAX_ATTACHED_NOTES = 10

/** Regex for splitting query into search terms */
const WHITESPACE_REGEX = /\s+/

function getAttachmentPublicUrl(storageKey: string): string {
  const s3Config = getS3Config()
  return `${s3Config.publicUrl}/${STORAGE_BUCKETS.ATTACHMENTS}/${storageKey}`
}

export async function fetchNoteImageMap(
  userId: string,
  noteIds: string[]
): Promise<Map<string, NonNullable<NoteContext["images"]>>> {
  const uniqueNoteIds = [
    ...new Set(noteIds.filter((noteId) => noteId.length > 0))
  ]
  if (uniqueNoteIds.length === 0) {
    return new Map()
  }

  const rows = await db
    .select({
      entryId: attachments.entryId,
      storageKey: attachments.storageKey,
      mimeType: attachments.mimeType,
      description: attachments.description
    })
    .from(attachments)
    .where(
      and(
        eq(attachments.userId, userId),
        isNull(attachments.deletedAt),
        inArray(attachments.entryId, uniqueNoteIds)
      )
    )
    .orderBy(desc(attachments.createdAt))

  const imageMap = new Map<string, NonNullable<NoteContext["images"]>>()
  for (const row of rows) {
    if (!row.entryId) {
      continue
    }
    if (!row.mimeType.startsWith("image/")) {
      continue
    }

    const images = imageMap.get(row.entryId) ?? []
    images.push({
      url: getAttachmentPublicUrl(row.storageKey),
      mimeType: row.mimeType,
      description: row.description ?? undefined
    })
    imageMap.set(row.entryId, images)
  }

  return imageMap
}

async function attachImagesToNotes(
  userId: string,
  notes: NoteContext[]
): Promise<NoteContext[]> {
  if (notes.length === 0) {
    return notes
  }

  const imageMap = await fetchNoteImageMap(
    userId,
    notes.map((note) => note.id)
  )

  return notes.map((note) => {
    const images = imageMap.get(note.id)
    if (!images || images.length === 0) {
      return note
    }
    return {
      ...note,
      images
    }
  })
}

/**
 * Fetch notes by IDs for the given user (Library only, not deleted)
 */
export async function fetchNotesByIds(
  userId: string,
  noteIds: string[]
): Promise<NoteContext[]> {
  if (noteIds.length === 0) {
    return []
  }

  const notes = await db
    .select({
      id: entries.id,
      title: entries.title,
      contentText: entries.contentText
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

  const mappedNotes = notes.map((n) => ({
    id: n.id,
    title: n.title,
    contentText: n.contentText ?? ""
  }))

  return attachImagesToNotes(userId, mappedNotes)
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
    .join(" & ")

  if (!searchTerms) {
    return []
  }

  const baseConditions = [
    eq(entries.userId, userId),
    isNull(entries.deletedAt),
    eq(entries.isInbox, false) // Library only
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
        contentText: entries.contentText
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
      const mappedNotes = ftsResults.map((n) => ({
        id: n.id,
        title: n.title,
        contentText: n.contentText ?? ""
      }))
      return attachImagesToNotes(userId, mappedNotes)
    }
  } catch (error) {
    log.warn("FTS search failed, falling back to ILIKE:", error)
  }

  // Fallback to ILIKE
  const searchPattern = `%${query}%`
  const ilikeResults = await db
    .select({
      id: entries.id,
      title: entries.title,
      contentText: entries.contentText
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

  const mappedNotes = ilikeResults.map((n) => ({
    id: n.id,
    title: n.title,
    contentText: n.contentText ?? ""
  }))

  return attachImagesToNotes(userId, mappedNotes)
}
