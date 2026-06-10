import { db, entries } from "@folionote/db"
import { tool } from "ai"
import { and, eq, isNull } from "drizzle-orm"

import { GetNoteInputSchema } from "../schemas"
import { getNoteToolContext } from "../types"
import type { NoteGetData, NoteToolResult } from "../types"

const TOOL_ABORTED_ERROR = "Tool execution aborted."
const NOTE_NOT_FOUND_ERROR = "Note not found or access denied."

export const getNote = tool({
  description: "Get a note by ID",
  strict: true,
  inputSchema: GetNoteInputSchema,
  execute: async (
    { id },
    { experimental_context, abortSignal }
  ): Promise<NoteToolResult<NoteGetData>> => {
    if (abortSignal?.aborted) {
      throw new Error(TOOL_ABORTED_ERROR)
    }

    const { userId } = getNoteToolContext(experimental_context)

    const [entry] = await db
      .select({
        id: entries.id,
        title: entries.title,
        contentText: entries.contentText,
        isInbox: entries.isInbox,
        isStarred: entries.isStarred,
        isPinned: entries.isPinned,
        updatedAt: entries.updatedAt
      })
      .from(entries)
      .where(
        and(
          eq(entries.id, id),
          eq(entries.userId, userId),
          isNull(entries.deletedAt)
        )
      )
      .limit(1)

    if (!entry) {
      throw new Error(NOTE_NOT_FOUND_ERROR)
    }

    return {
      success: true,
      message: `Note "${entry.title}" retrieved successfully`,
      data: {
        id: entry.id,
        title: entry.title,
        contentText: entry.contentText ?? "",
        isInbox: entry.isInbox,
        isStarred: entry.isStarred,
        isPinned: entry.isPinned,
        updatedAt: entry.updatedAt.toISOString()
      }
    }
  }
})
