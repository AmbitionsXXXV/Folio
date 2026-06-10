import { db, entries } from "@folionote/db"
import { tool } from "ai"
import { and, desc, eq, isNull, sql } from "drizzle-orm"

import { SearchNotesInputSchema } from "../schemas"
import { getNoteToolContext } from "../types"
import type { NoteSearchData, NoteToolResult } from "../types"

const TOOL_ABORTED_ERROR = "Tool execution aborted."
const EMPTY_QUERY_MESSAGE = "No search keywords provided."
const SEARCH_SUCCESS_MESSAGE = "Search completed successfully."
const SEARCH_FALLBACK_MESSAGE = "Search completed using fallback matching."

const WHITESPACE_REGEX = /\s+/

export const searchNotes = tool({
  description: "Search notes in the user library",
  strict: true,
  inputSchema: SearchNotesInputSchema,
  execute: async (
    { query, limit },
    { experimental_context, abortSignal }
  ): Promise<NoteToolResult<NoteSearchData>> => {
    if (abortSignal?.aborted) {
      throw new Error(TOOL_ABORTED_ERROR)
    }

    const { userId } = getNoteToolContext(experimental_context)
    const trimmedQuery = query.trim()

    if (!trimmedQuery) {
      return {
        success: true,
        message: EMPTY_QUERY_MESSAGE,
        data: {
          items: [],
          count: 0
        }
      }
    }

    const searchTerms = trimmedQuery
      .split(WHITESPACE_REGEX)
      .filter((term) => term.length > 0)
      .map((term) => `${term}:*`)
      .join(" & ")

    const baseConditions = [
      eq(entries.userId, userId),
      isNull(entries.deletedAt),
      eq(entries.isInbox, false)
    ]

    let usedFallback = false

    try {
      const ftsResults = await db
        .select({
          id: entries.id,
          title: entries.title,
          contentText: entries.contentText,
          updatedAt: entries.updatedAt
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
        return {
          success: true,
          message: SEARCH_SUCCESS_MESSAGE,
          data: {
            items: ftsResults.map((entry) => ({
              id: entry.id,
              title: entry.title,
              contentText: entry.contentText ?? "",
              updatedAt: entry.updatedAt.toISOString()
            })),
            count: ftsResults.length
          }
        }
      }
    } catch {
      usedFallback = true
    }

    usedFallback = true
    const searchPattern = `%${trimmedQuery}%`
    const ilikeResults = await db
      .select({
        id: entries.id,
        title: entries.title,
        contentText: entries.contentText,
        updatedAt: entries.updatedAt
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

    return {
      success: true,
      message: usedFallback ? SEARCH_FALLBACK_MESSAGE : SEARCH_SUCCESS_MESSAGE,
      data: {
        items: ilikeResults.map((entry) => ({
          id: entry.id,
          title: entry.title,
          contentText: entry.contentText ?? "",
          updatedAt: entry.updatedAt.toISOString()
        })),
        count: ilikeResults.length
      }
    }
  }
})
