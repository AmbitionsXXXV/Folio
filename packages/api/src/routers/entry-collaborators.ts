import { db, entryCollaborators, user } from "@folionote/db"
import { ORPCError } from "@orpc/server"
import { and, eq } from "drizzle-orm"
import { nanoid } from "nanoid"
import { z } from "zod"

import { protectedProcedure } from "../index"
import { getEntryAccessRole } from "../utils/entry-access"

const RoleSchema = z.enum(["editor", "viewer"])

const EntryIdInputSchema = z.object({ entryId: z.string() })

const InviteCollaboratorInputSchema = z.object({
  entryId: z.string(),
  email: z.string().email(),
  role: RoleSchema.default("editor")
})

const UpdateCollaboratorRoleInputSchema = z.object({
  entryId: z.string(),
  userId: z.string(),
  role: RoleSchema
})

const RemoveCollaboratorInputSchema = z.object({
  entryId: z.string(),
  userId: z.string()
})

/**
 * Throw NOT_FOUND unless `userId` is the entry's owner. Owner-only, not
 * owner-or-collaborator: managing the roster (who's invited, at what role)
 * is stricter than having editor access to the content.
 */
async function assertOwnsEntry(userId: string, entryId: string): Promise<void> {
  const role = await getEntryAccessRole(userId, entryId)
  if (role !== "owner") {
    throw new ORPCError("NOT_FOUND", { message: "Entry not found" })
  }
}

/**
 * `entry_collaborators.role` is a plain `text` column, so Drizzle infers it
 * as `string` — narrow it back to the real union for callers. Fails closed
 * to `'viewer'` on anything other than the literal `'editor'`, matching
 * `getEntryAccessRole`'s same rule.
 */
function normalizeRole(role: string): "editor" | "viewer" {
  return role === "editor" ? "editor" : "viewer"
}

/**
 * collaborators.list - List an entry's invited collaborators (owner-only)
 */
export const listEntryCollaborators = protectedProcedure
  .input(EntryIdInputSchema)
  .handler(async ({ context, input }) => {
    await assertOwnsEntry(context.session.user.id, input.entryId)

    const rows = await db
      .select({
        id: entryCollaborators.id,
        userId: entryCollaborators.userId,
        role: entryCollaborators.role,
        createdAt: entryCollaborators.createdAt,
        name: user.name,
        email: user.email,
        image: user.image
      })
      .from(entryCollaborators)
      .innerJoin(user, eq(entryCollaborators.userId, user.id))
      .where(eq(entryCollaborators.entryId, input.entryId))

    return rows.map((row) => ({
      id: row.id,
      userId: row.userId,
      role: normalizeRole(row.role),
      name: row.name,
      email: row.email,
      image: row.image,
      createdAt: row.createdAt.toISOString()
    }))
  })

/**
 * collaborators.invite - Invite an existing FolioNote account to
 * collaborate on an entry (owner-only)
 *
 * Requires the invitee to already have an account — there is no
 * invite-to-signup flow in v1.
 */
export const inviteCollaborator = protectedProcedure
  .input(InviteCollaboratorInputSchema)
  .handler(async ({ context, input }) => {
    const ownerId = context.session.user.id
    await assertOwnsEntry(ownerId, input.entryId)

    const [invitee] = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image
      })
      .from(user)
      .where(eq(user.email, input.email))
      .limit(1)

    if (!invitee) {
      throw new ORPCError("NOT_FOUND", {
        message: "No FolioNote account found for that email yet"
      })
    }

    if (invitee.id === ownerId) {
      throw new ORPCError("BAD_REQUEST", {
        message: "You already own this entry"
      })
    }

    const [existing] = await db
      .select({ id: entryCollaborators.id })
      .from(entryCollaborators)
      .where(
        and(
          eq(entryCollaborators.entryId, input.entryId),
          eq(entryCollaborators.userId, invitee.id)
        )
      )
      .limit(1)

    if (existing) {
      throw new ORPCError("CONFLICT", {
        message: "This person is already a collaborator"
      })
    }

    const [collaborator] = await db
      .insert(entryCollaborators)
      .values({
        id: nanoid(),
        entryId: input.entryId,
        userId: invitee.id,
        role: input.role,
        invitedBy: ownerId
      })
      .returning()

    if (!collaborator) {
      throw new ORPCError("INTERNAL_SERVER_ERROR", {
        message: "Failed to add collaborator"
      })
    }

    return {
      id: collaborator.id,
      userId: invitee.id,
      role: normalizeRole(collaborator.role),
      name: invitee.name,
      email: invitee.email,
      image: invitee.image,
      createdAt: collaborator.createdAt.toISOString()
    }
  })

/**
 * collaborators.updateRole - Change a collaborator's role (owner-only)
 */
export const updateCollaboratorRole = protectedProcedure
  .input(UpdateCollaboratorRoleInputSchema)
  .handler(async ({ context, input }) => {
    await assertOwnsEntry(context.session.user.id, input.entryId)

    const [updated] = await db
      .update(entryCollaborators)
      .set({ role: input.role })
      .where(
        and(
          eq(entryCollaborators.entryId, input.entryId),
          eq(entryCollaborators.userId, input.userId)
        )
      )
      .returning()

    if (!updated) {
      throw new ORPCError("NOT_FOUND", { message: "Collaborator not found" })
    }

    return { success: true, role: normalizeRole(updated.role) }
  })

/**
 * collaborators.remove - Remove a collaborator (owner), or leave an
 * entry you were invited to (self)
 */
export const removeCollaborator = protectedProcedure
  .input(RemoveCollaboratorInputSchema)
  .handler(async ({ context, input }) => {
    const callerId = context.session.user.id

    if (callerId !== input.userId) {
      await assertOwnsEntry(callerId, input.entryId)
    }

    const result = await db
      .delete(entryCollaborators)
      .where(
        and(
          eq(entryCollaborators.entryId, input.entryId),
          eq(entryCollaborators.userId, input.userId)
        )
      )
      .returning()

    if (result.length === 0) {
      throw new ORPCError("NOT_FOUND", { message: "Collaborator not found" })
    }

    return { success: true }
  })

/**
 * Collaborators router - manage who can join real-time collaboration on an entry
 */
export const entryCollaboratorsRouter = {
  list: listEntryCollaborators,
  invite: inviteCollaborator,
  updateRole: updateCollaboratorRole,
  remove: removeCollaborator
}
