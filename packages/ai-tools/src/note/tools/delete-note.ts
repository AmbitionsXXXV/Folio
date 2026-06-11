import { db, entries } from "@folionote/db"
import { createTool } from "@mastra/core/tools"
import { and, eq, isNull } from "drizzle-orm"
import type { z } from "zod"

import { DeleteNoteInputSchema } from "../schemas"
import { getNoteToolContext } from "../types"
import type { NoteDeleteData, NoteToolResult } from "../types"

const TOOL_ABORTED_ERROR = "Tool execution aborted."
const NOTE_NOT_FOUND_ERROR = "Note not found or access denied."

export const deleteNote = createTool({
  id: "deleteNote",
  description: "Soft delete a note by ID",
  strict: true,
  inputSchema: DeleteNoteInputSchema,
  requireApproval: true,
  execute: async (
    { id }: z.infer<typeof DeleteNoteInputSchema>,
    context
  ): Promise<NoteToolResult<NoteDeleteData>> => {
    if (context?.abortSignal?.aborted) {
      throw new Error(TOOL_ABORTED_ERROR)
    }

    const { userId } = getNoteToolContext(context?.requestContext)
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
        deletedAt: deletedAt.toISOString()
      }
    }
  }
})
