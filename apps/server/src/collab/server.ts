import { createHash } from "node:crypto"

import { processContentUpdate } from "@folionote/api/utils/content"
import { getEntryAccessRole } from "@folionote/api/utils/entry-access"
import {
  extractEntryRefs,
  syncEntryLinks
} from "@folionote/api/utils/link-sync"
import { auth } from "@folionote/auth"
import { db, entries, entrySyncState } from "@folionote/db"
import { COLLAB_SCHEMA_EXTENSIONS } from "@folionote/editor-core/collab"
import { createLogger } from "@folionote/log"
import { Server } from "@hocuspocus/server"
import { TiptapTransformer } from "@hocuspocus/transformer"
import { eq } from "drizzle-orm"
import * as Y from "yjs"

import { isAllowedOrigin } from "../utils/allowed-origin"

const log = createLogger({ prefix: "collab" })

/** Per-connection context, resolved once in onAuthenticate and available in later hooks. */
interface CollabContext {
  userId: string
  role: "owner" | "editor" | "viewer"
}

type ContentChangeListener = (entryId: string, userId: string) => void
let onContentChange: ContentChangeListener | undefined

/**
 * Register a callback invoked after a collaborative flush changes an
 * entry's content — mirrors `entries.ts`'s `setContentChangeListener`, used
 * by the server entrypoint to enqueue embedding indexing the same way a
 * solo save does.
 */
export function setCollabContentChangeListener(
  listener: ContentChangeListener
): void {
  onContentChange = listener
}

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex")
}

const EMPTY_DOC = { type: "doc", content: [{ type: "paragraph" }] }

export const collabServer = new Server<CollabContext>({
  name: "folio-collab",
  port: Number(process.env.COLLAB_PORT) || 3002,

  // Room name === entryId (see documentName usage below), one Y.Doc per
  // collaboratively-open entry, kept in memory for the room's lifetime.
  extensions: [
    // @hocuspocus/extension-redis goes here the day this runs on more than
    // one instance — see apps/server/ecosystem.config.cjs, which starts it
    // at 1 to begin with.
  ],

  async onAuthenticate({ requestHeaders, documentName, connectionConfig }) {
    // WebSocket upgrades aren't covered by Hono's CORS middleware, and the
    // session cookie is SameSite=None — without this check, any site could
    // open an authenticated socket against a signed-in user's session.
    if (!isAllowedOrigin(requestHeaders.get("origin"))) {
      throw new Error("Origin not allowed")
    }

    const session = await auth.api.getSession({ headers: requestHeaders })
    if (!session?.user) {
      throw new Error("Not authenticated")
    }

    // documentName is the entryId. getEntryAccessRole also denies
    // collaborators (not the owner) on password-locked entries.
    const role = await getEntryAccessRole(session.user.id, documentName)
    if (!role) {
      throw new Error("Not authorized for this entry")
    }

    // Password-locked entries never sync live — for anyone. Without this,
    // the owner (whom getEntryAccessRole never password-gates) would keep
    // an active Y.Doc room open for an entry the UI treats as solo again,
    // and its flushes would race the owner's solo autosave path.
    const [lock] = await db
      .select({ passwordHash: entries.passwordHash })
      .from(entries)
      .where(eq(entries.id, documentName))
      .limit(1)
    if (lock?.passwordHash) {
      throw new Error("Entry is password-locked")
    }

    if (role === "viewer") {
      connectionConfig.readOnly = true
    }

    return { userId: session.user.id, role }
  },

  async onLoadDocument({ documentName }) {
    const entryId = documentName

    const [entry] = await db
      .select({ contentJson: entries.contentJson })
      .from(entries)
      .where(eq(entries.id, entryId))
      .limit(1)

    const currentHash = hashContent(entry?.contentJson ?? "")

    const [syncState] = await db
      .select({
        ydocState: entrySyncState.ydocState,
        contentHash: entrySyncState.contentHash
      })
      .from(entrySyncState)
      .where(eq(entrySyncState.entryId, entryId))
      .limit(1)

    if (syncState && syncState.contentHash === currentHash) {
      return syncState.ydocState
    }

    // No snapshot yet, or it's stale — the entry was edited through the
    // solo autosave path since the last collab flush. Re-seed from
    // entries.contentJson rather than trust the stored Y.Doc, or a
    // collaborator would silently resurrect old content over new (see the
    // entry_sync_state doc comment in packages/db/src/schema/entries.ts).
    if (syncState) {
      log.warn(`Stale collab snapshot for entry ${entryId}, re-seeding`)
    }

    const parsedJson = entry?.contentJson
      ? JSON.parse(entry.contentJson)
      : EMPTY_DOC

    return TiptapTransformer.extensions(COLLAB_SCHEMA_EXTENSIONS).toYdoc(
      parsedJson,
      "content"
    )
  },

  async onStoreDocument({ documentName, document }) {
    const entryId = documentName

    const [entry] = await db
      .select({ userId: entries.userId })
      .from(entries)
      .where(eq(entries.id, entryId))
      .limit(1)

    if (!entry) {
      // Entry was deleted while collaboratively open — nothing to flush to.
      return
    }

    const json = TiptapTransformer.fromYdoc(document, "content")
    const processed = processContentUpdate(JSON.stringify(json))
    const contentJson = processed.contentJson ?? ""
    const newHash = hashContent(contentJson)
    const binaryState = Buffer.from(Y.encodeStateAsUpdate(document))

    await db.transaction(async (tx) => {
      await tx
        .insert(entrySyncState)
        .values({ entryId, ydocState: binaryState, contentHash: newHash })
        .onConflictDoUpdate({
          target: entrySyncState.entryId,
          set: { ydocState: binaryState, contentHash: newHash }
        })

      // Deliberately not touching entries.version here: version is the
      // optimistic-concurrency token for metadata edits (title/star/pin),
      // and this background flush must never invalidate a client's
      // in-flight expectedVersion for those fields.
      await tx
        .update(entries)
        .set({
          contentJson: processed.contentJson,
          contentText: processed.contentText
        })
        .where(eq(entries.id, entryId))
    })

    // Mirror entries.update's side effects on content change, so a
    // collaboratively-edited entry doesn't silently fall out of the
    // knowledge graph or RAG index.
    const refIds = extractEntryRefs(contentJson)
    await syncEntryLinks(entry.userId, entryId, refIds)
    onContentChange?.(entryId, entry.userId)
  }
})
