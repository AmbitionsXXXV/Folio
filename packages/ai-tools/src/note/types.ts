export interface NoteToolContext {
  userId: string
}

export interface NoteToolResult<TData> {
  success: true
  message: string
  data: TData
}

export interface NoteCreateData {
  id: string
  title: string
  isInbox: boolean
}

export interface NoteUpdateData {
  id: string
  title: string
  isInbox: boolean
  isStarred: boolean
  isPinned: boolean
  updatedAt: string
}

export interface NoteGetData {
  id: string
  title: string
  contentText: string
  isInbox: boolean
  isStarred: boolean
  isPinned: boolean
  updatedAt: string
}

export interface NoteDeleteData {
  id: string
  deletedAt: string
}

export interface NoteSearchResult {
  id: string
  title: string
  contentText: string
  updatedAt: string
}

export interface NoteSearchData {
  items: NoteSearchResult[]
  count: number
}

const EMPTY_CONTEXT_ERROR = "Missing tool context."
const MISSING_USER_ID_ERROR = "Missing userId in tool context."

export function getNoteToolContext(
  experimentalContext: unknown
): NoteToolContext {
  if (!experimentalContext || typeof experimentalContext !== "object") {
    throw new Error(EMPTY_CONTEXT_ERROR)
  }

  const context = experimentalContext as { userId?: unknown }
  if (typeof context.userId !== "string" || context.userId.length === 0) {
    throw new Error(MISSING_USER_ID_ERROR)
  }

  return { userId: context.userId }
}
