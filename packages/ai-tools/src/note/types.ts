import type { RequestContext } from "@mastra/core/request-context"

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

/**
 * Extract the authenticated userId from a Mastra tool's RequestContext.
 *
 * The chat route seeds `userId` into the agent's RequestContext per request,
 * which Mastra forwards to every tool's `execute` context.
 */
export function getNoteToolContext(
  requestContext: RequestContext | undefined
): NoteToolContext {
  if (!requestContext) {
    throw new Error(EMPTY_CONTEXT_ERROR)
  }

  const userId = requestContext.get("userId")
  if (typeof userId !== "string" || userId.length === 0) {
    throw new Error(MISSING_USER_ID_ERROR)
  }

  return { userId }
}
