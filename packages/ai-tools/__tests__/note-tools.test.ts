import { RequestContext } from "@mastra/core/request-context"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import {
  createNote,
  deleteNote,
  getNote,
  searchNotes,
  updateNote
} from "../src/note/tools"
import type { NoteToolResult } from "../src/note/types"

const SAMPLE_USER_ID = "user-123"
const SAMPLE_NOTE_ID = "note-123"
const SAMPLE_TITLE = "Sample Note"
const SAMPLE_CONTENT = "Line 1\nLine 2"
const SAMPLE_UPDATED_AT = new Date("2026-01-29T10:00:00.000Z")
const SAMPLE_DELETED_AT = new Date("2026-01-29T11:00:00.000Z")
const SAMPLE_SEARCH_QUERY = "TypeScript"

const mockDb = vi.hoisted(() => ({
  insert: vi.fn(),
  update: vi.fn(),
  select: vi.fn()
}))

const mockEntries = vi.hoisted(() => ({
  id: "entries.id",
  userId: "entries.user_id",
  title: "entries.title",
  contentJson: "entries.content_json",
  contentText: "entries.content_text",
  isInbox: "entries.is_inbox",
  isStarred: "entries.is_starred",
  isPinned: "entries.is_pinned",
  updatedAt: "entries.updated_at",
  deletedAt: "entries.deleted_at"
}))

vi.mock("@folionote/db", () => ({
  db: mockDb,
  entries: mockEntries
}))

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  eq: vi.fn((...args: unknown[]) => ({ type: "eq", args })),
  isNull: vi.fn((...args: unknown[]) => ({ type: "isNull", args })),
  desc: vi.fn((arg: unknown) => ({ type: "desc", arg })),
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings,
    values
  }))
}))

const requestContext = new RequestContext()
requestContext.set("userId", SAMPLE_USER_ID)

const toolExecutionOptions = {
  requestContext
}

interface QueryChain {
  from: ReturnType<typeof vi.fn>
  where: ReturnType<typeof vi.fn>
  orderBy: ReturnType<typeof vi.fn>
  limit: ReturnType<typeof vi.fn>
}

function createSelectChain(result: Promise<unknown[]>): QueryChain {
  const limit = vi.fn().mockImplementation(() => result)
  const orderBy = vi.fn().mockReturnValue({ limit })
  const where = vi.fn().mockReturnValue({ orderBy, limit })
  const from = vi.fn().mockReturnValue({ where, orderBy, limit })

  return { from, where, orderBy, limit }
}

function mockInsertReturning(entriesResult: Record<string, unknown>[]) {
  const returning = vi.fn().mockResolvedValue(entriesResult)
  const values = vi.fn().mockReturnValue({ returning })
  mockDb.insert.mockReturnValue({ values })
  return { values }
}

function mockUpdateReturning(entriesResult: Record<string, unknown>[]) {
  const returning = vi.fn().mockResolvedValue(entriesResult)
  const where = vi.fn().mockReturnValue({ returning })
  const set = vi.fn().mockReturnValue({ where })
  mockDb.update.mockReturnValue({ set })
  return { set }
}

function isAsyncIterable<T>(
  value: NoteToolResult<T> | AsyncIterable<NoteToolResult<T>>
): value is AsyncIterable<NoteToolResult<T>> {
  return (
    typeof value === "object" && value !== null && Symbol.asyncIterator in value
  )
}

function assertToolResult<T>(
  result: NoteToolResult<T> | AsyncIterable<NoteToolResult<T>>
): NoteToolResult<T> {
  if (isAsyncIterable(result)) {
    throw new Error("Unexpected async iterable result.")
  }
  return result
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe("note tools", () => {
  it("requires approval for all mutating note tools", () => {
    expect(createNote.requireApproval).toBe(true)
    expect(updateNote.requireApproval).toBe(true)
    expect(deleteNote.requireApproval).toBe(true)
  })

  it("createNote stores contentJson and contentText from plain text", async () => {
    const { values } = mockInsertReturning([
      { id: SAMPLE_NOTE_ID, title: SAMPLE_TITLE, isInbox: true }
    ])
    const { execute } = createNote
    if (!execute) {
      throw new Error("Missing execute implementation.")
    }

    const result = assertToolResult(
      await execute(
        {
          title: SAMPLE_TITLE,
          content: SAMPLE_CONTENT,
          isInbox: true
        },
        toolExecutionOptions
      )
    )

    expect(result.data.id).toBe(SAMPLE_NOTE_ID)
    expect(values).toHaveBeenCalledTimes(1)

    const inserted = values.mock.calls[0]?.[0] as Record<string, unknown>
    expect(inserted.userId).toBe(SAMPLE_USER_ID)
    expect(inserted.contentText).toBe(SAMPLE_CONTENT)

    const { contentJson } = inserted
    expect(typeof contentJson).toBe("string")

    const parsed = JSON.parse(String(contentJson)) as {
      type: string
      content?: { type: string; content?: Array<{ text: string }> }[]
    }
    expect(parsed.type).toBe("doc")
    expect(parsed.content).toHaveLength(2)
    expect(parsed.content?.[0]?.content?.[0]?.text).toBe("Line 1")
  })

  it("updateNote throws when no update fields are provided", async () => {
    const { execute } = updateNote
    if (!execute) {
      throw new Error("Missing execute implementation.")
    }

    await expect(
      execute({ id: SAMPLE_NOTE_ID }, toolExecutionOptions)
    ).rejects.toThrow("No fields provided for update.")
  })

  it("updateNote stores contentJson and contentText for new content", async () => {
    const { set } = mockUpdateReturning([
      {
        id: SAMPLE_NOTE_ID,
        title: SAMPLE_TITLE,
        isInbox: false,
        isStarred: false,
        isPinned: true,
        updatedAt: SAMPLE_UPDATED_AT
      }
    ])
    const { execute } = updateNote
    if (!execute) {
      throw new Error("Missing execute implementation.")
    }

    const updatedContent = "Line A\n\nLine B"
    const result = assertToolResult(
      await execute(
        { id: SAMPLE_NOTE_ID, content: updatedContent, isPinned: true },
        toolExecutionOptions
      )
    )

    const updatePayload = set.mock.calls[0]?.[0] as Record<string, unknown>
    expect(updatePayload.contentText).toBe(updatedContent)
    expect(updatePayload.isPinned).toBe(true)
    expect(result.data.updatedAt).toBe(SAMPLE_UPDATED_AT.toISOString())
  })

  it("getNote throws when note is missing", async () => {
    const selectChain = createSelectChain(Promise.resolve([]))
    mockDb.select.mockReturnValue(selectChain)

    const { execute } = getNote
    if (!execute) {
      throw new Error("Missing execute implementation.")
    }

    await expect(
      execute({ id: SAMPLE_NOTE_ID }, toolExecutionOptions)
    ).rejects.toThrow("Note not found or access denied.")
  })

  it("getNote returns empty contentText when null", async () => {
    const selectChain = createSelectChain(
      Promise.resolve([
        {
          id: SAMPLE_NOTE_ID,
          title: SAMPLE_TITLE,
          contentText: null,
          isInbox: false,
          isStarred: false,
          isPinned: false,
          updatedAt: SAMPLE_UPDATED_AT
        }
      ])
    )
    mockDb.select.mockReturnValue(selectChain)

    const { execute } = getNote
    if (!execute) {
      throw new Error("Missing execute implementation.")
    }

    const result = assertToolResult(
      await execute({ id: SAMPLE_NOTE_ID }, toolExecutionOptions)
    )

    expect(result.data.contentText).toBe("")
  })

  it("deleteNote sets deletedAt timestamp", async () => {
    const { set } = mockUpdateReturning([
      {
        id: SAMPLE_NOTE_ID,
        title: SAMPLE_TITLE,
        deletedAt: SAMPLE_DELETED_AT
      }
    ])
    const { execute } = deleteNote
    if (!execute) {
      throw new Error("Missing execute implementation.")
    }

    const result = assertToolResult(
      await execute({ id: SAMPLE_NOTE_ID }, toolExecutionOptions)
    )

    const updatePayload = set.mock.calls[0]?.[0] as Record<string, unknown>
    expect(updatePayload.deletedAt).toBeInstanceOf(Date)
    expect(result.data.deletedAt).toBeDefined()
  })

  it("searchNotes returns empty result for blank query", async () => {
    const { execute } = searchNotes
    if (!execute) {
      throw new Error("Missing execute implementation.")
    }

    const result = assertToolResult(
      await execute({ query: "   ", limit: 10 }, toolExecutionOptions)
    )

    expect(result.data.count).toBe(0)
    expect(result.data.items).toHaveLength(0)
  })

  it("searchNotes returns FTS results when available", async () => {
    const selectChain = createSelectChain(
      Promise.resolve([
        {
          id: SAMPLE_NOTE_ID,
          title: SAMPLE_TITLE,
          contentText: "Note content",
          updatedAt: SAMPLE_UPDATED_AT
        }
      ])
    )
    mockDb.select.mockReturnValue(selectChain)

    const { execute } = searchNotes
    if (!execute) {
      throw new Error("Missing execute implementation.")
    }

    const result = assertToolResult(
      await execute(
        { query: SAMPLE_SEARCH_QUERY, limit: 10 },
        toolExecutionOptions
      )
    )

    expect(result.data.count).toBe(1)
    expect(result.data.items[0]?.id).toBe(SAMPLE_NOTE_ID)
    expect(mockDb.select).toHaveBeenCalledTimes(1)
  })

  it("searchNotes falls back to ILIKE when FTS fails", async () => {
    const ftsChain = createSelectChain(Promise.reject(new Error("FTS failed")))
    const fallbackChain = createSelectChain(
      Promise.resolve([
        {
          id: SAMPLE_NOTE_ID,
          title: SAMPLE_TITLE,
          contentText: "Fallback content",
          updatedAt: SAMPLE_UPDATED_AT
        }
      ])
    )
    mockDb.select
      .mockReturnValueOnce(ftsChain)
      .mockReturnValueOnce(fallbackChain)

    const { execute } = searchNotes
    if (!execute) {
      throw new Error("Missing execute implementation.")
    }

    const result = assertToolResult(
      await execute(
        { query: SAMPLE_SEARCH_QUERY, limit: 10 },
        toolExecutionOptions
      )
    )

    expect(result.data.count).toBe(1)
    expect(result.data.items[0]?.title).toBe(SAMPLE_TITLE)
    expect(mockDb.select).toHaveBeenCalledTimes(2)
  })
})
