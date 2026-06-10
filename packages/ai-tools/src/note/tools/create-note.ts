import { db, entries } from "@folionote/db"
import { tool } from "ai"
import { nanoid } from "nanoid"

import { CreateNoteInputSchema } from "../schemas"
import { getNoteToolContext } from "../types"
import type { NoteCreateData, NoteToolResult } from "../types"

const TOOL_ABORTED_ERROR = "Tool execution aborted."
const CREATE_NOTE_FAILED_ERROR = "Failed to create note."

const EMPTY_PROSEMIRROR_DOC = {
  type: "doc",
  content: [{ type: "paragraph" }]
} as const

function normalizePlainText(content: string): string {
  return content.replaceAll("\r\n", "\n").replaceAll("\r", "\n")
}

function buildContentPayload(content: string): {
  contentJson: string
  contentText: string | null
} {
  const normalizedText = normalizePlainText(content)
  const hasText = normalizedText.trim().length > 0

  if (!hasText) {
    return {
      contentJson: JSON.stringify(EMPTY_PROSEMIRROR_DOC),
      contentText: null
    }
  }

  const paragraphs = normalizedText.split("\n").map((line) => {
    if (line.length === 0) {
      return { type: "paragraph" } as const
    }
    return {
      type: "paragraph",
      content: [{ type: "text", text: line }]
    }
  })

  return {
    contentJson: JSON.stringify({ type: "doc", content: paragraphs }),
    contentText: normalizedText
  }
}

export const createNote = tool({
  description: "Create a new note in the user library or inbox",
  strict: true,
  inputSchema: CreateNoteInputSchema,
  needsApproval: true,
  execute: async (
    { title, content, isInbox },
    { experimental_context, abortSignal }
  ): Promise<NoteToolResult<NoteCreateData>> => {
    if (abortSignal?.aborted) {
      throw new Error(TOOL_ABORTED_ERROR)
    }

    const { userId } = getNoteToolContext(experimental_context)
    const id = nanoid()

    let contentJson: string | null = null
    let contentText: string | null = null

    if (content !== undefined) {
      const payload = buildContentPayload(content)
      contentJson = payload.contentJson
      contentText = payload.contentText
    }

    const [entry] = await db
      .insert(entries)
      .values({
        id,
        userId,
        title,
        contentJson,
        contentText,
        isInbox
      })
      .returning()

    if (!entry) {
      throw new Error(CREATE_NOTE_FAILED_ERROR)
    }

    return {
      success: true,
      message: `Note "${entry.title}" created successfully`,
      data: {
        id: entry.id,
        title: entry.title,
        isInbox: entry.isInbox
      }
    }
  }
})
