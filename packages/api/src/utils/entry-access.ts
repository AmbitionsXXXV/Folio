import { db, entries, entryCollaborators } from "@folionote/db"
import { and, eq, isNull } from "drizzle-orm"

export type EntryAccessRole = "owner" | "editor" | "viewer"

/**
 * Resolve a user's effective access role on an entry: `'owner'` if they
 * hold it, otherwise their `entry_collaborators` role if invited, or
 * `null` if neither. Shared by `entries.get`, `storage.uploadAttachment`,
 * and the collab server's `onAuthenticate` hook so "who can touch this
 * entry" is defined in exactly one place.
 *
 * Password-locked entries (`entries.passwordHash` set) deny collaborator
 * access entirely — the owner's own lock never gates the owner, but a
 * collaborator needs the entry unlocked first, same as viewing today.
 *
 * Fails closed on an unrecognized `role` value: anything other than the
 * literal `'editor'` is treated as `'viewer'`.
 */
export async function getEntryAccessRole(
  userId: string,
  entryId: string
): Promise<EntryAccessRole | null> {
  const [entry] = await db
    .select({
      userId: entries.userId,
      passwordHash: entries.passwordHash
    })
    .from(entries)
    .where(and(eq(entries.id, entryId), isNull(entries.deletedAt)))
    .limit(1)

  if (!entry) {
    return null
  }

  if (entry.userId === userId) {
    return "owner"
  }

  if (entry.passwordHash) {
    return null
  }

  const [collaborator] = await db
    .select({ role: entryCollaborators.role })
    .from(entryCollaborators)
    .where(
      and(
        eq(entryCollaborators.entryId, entryId),
        eq(entryCollaborators.userId, userId)
      )
    )
    .limit(1)

  if (!collaborator) {
    return null
  }

  return collaborator.role === "editor" ? "editor" : "viewer"
}
