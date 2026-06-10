import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

const mockDb = vi.hoisted(() => ({
  select: vi.fn(),
  selectDistinct: vi.fn()
}))

const mockEntries = vi.hoisted(() => ({
  id: "entries.id",
  userId: "entries.user_id",
  title: "entries.title",
  contentText: "entries.content_text",
  updatedAt: "entries.updated_at",
  deletedAt: "entries.deleted_at",
  isInbox: "entries.is_inbox"
}))

const mockAttachments = vi.hoisted(() => ({
  entryId: "attachments.entry_id",
  description: "attachments.description",
  deletedAt: "attachments.deleted_at"
}))

const mockEntryTags = vi.hoisted(() => ({
  entryId: "entry_tags.entry_id",
  tagId: "entry_tags.tag_id"
}))

const mockTags = vi.hoisted(() => ({
  id: "tags.id",
  userId: "tags.user_id",
  name: "tags.name"
}))

const mockFetchNoteImageMap = vi.hoisted(() => vi.fn())

vi.mock("@folionote/db", () => ({
  db: mockDb,
  entries: mockEntries,
  attachments: mockAttachments,
  entryTags: mockEntryTags,
  tags: mockTags
}))

vi.mock("../../src/services/notes", () => ({
  fetchNoteImageMap: mockFetchNoteImageMap
}))

vi.mock("drizzle-orm", () => ({
  and: vi.fn((...args: unknown[]) => ({ type: "and", args })),
  desc: vi.fn((arg: unknown) => ({ type: "desc", arg })),
  eq: vi.fn((...args: unknown[]) => ({ type: "eq", args })),
  inArray: vi.fn((...args: unknown[]) => ({ type: "inArray", args })),
  isNull: vi.fn((...args: unknown[]) => ({ type: "isNull", args })),
  notInArray: vi.fn((...args: unknown[]) => ({ type: "notInArray", args })),
  or: vi.fn((...args: unknown[]) => ({ type: "or", args })),
  sql: vi.fn((strings: TemplateStringsArray, ...values: unknown[]) => ({
    strings,
    values
  }))
}))

import { multiRetrieve } from "../../src/services/rag/multi-retriever"

function createQueryChain(result: unknown[]) {
  const limit = vi.fn().mockResolvedValue(result)
  const orderBy = vi.fn().mockReturnValue({ limit })
  const where = vi.fn().mockReturnValue({ orderBy, limit })
  const innerJoin = vi.fn().mockReturnValue({ where, orderBy, limit })
  const from = vi.fn().mockReturnValue({ where, orderBy, limit, innerJoin })
  return { from, where, orderBy, limit, innerJoin }
}

describe("multiRetrieve", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFetchNoteImageMap.mockResolvedValue(new Map())
  })

  it("returns notes from image description route with image source label", async () => {
    mockDb.select
      .mockReturnValueOnce(createQueryChain([]))
      .mockReturnValueOnce(createQueryChain([]))
      .mockReturnValueOnce(createQueryChain([]))
      .mockReturnValueOnce(createQueryChain([]))

    mockDb.selectDistinct.mockReturnValueOnce(
      createQueryChain([
        {
          id: "note-1",
          title: "Ops Dashboard",
          contentText: "Observability metrics and alerts."
        }
      ])
    )

    mockFetchNoteImageMap.mockResolvedValueOnce(
      new Map([
        [
          "note-1",
          [
            {
              url: "https://example.com/image-1.png",
              mimeType: "image/png",
              description: "Dashboard screenshot with SLO and error chart."
            }
          ]
        ]
      ])
    )

    const result = await multiRetrieve(
      "user-1",
      "dashboard screenshot",
      [],
      [],
      10
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.id).toBe("note-1")
    expect(result[0]?.sources.has("image")).toBe(true)
    expect(result[0]?.images?.[0]?.description).toContain("SLO")
  })

  it("merges duplicate notes from fts and image routes", async () => {
    mockDb.select
      .mockReturnValueOnce(
        createQueryChain([
          {
            id: "note-1",
            title: "Ops Dashboard",
            contentText: "Observability metrics and alerts."
          }
        ])
      )
      .mockReturnValueOnce(createQueryChain([]))
      .mockReturnValueOnce(createQueryChain([]))
      .mockReturnValueOnce(createQueryChain([]))

    mockDb.selectDistinct.mockReturnValueOnce(
      createQueryChain([
        {
          id: "note-1",
          title: "Ops Dashboard",
          contentText: "Observability metrics and alerts."
        }
      ])
    )

    const result = await multiRetrieve(
      "user-1",
      "dashboard screenshot",
      [],
      [],
      10
    )

    expect(result).toHaveLength(1)
    expect(result[0]?.sources.has("fts")).toBe(true)
    expect(result[0]?.sources.has("image")).toBe(true)
    expect(result[0]?.sources.size).toBe(2)
  })
})
