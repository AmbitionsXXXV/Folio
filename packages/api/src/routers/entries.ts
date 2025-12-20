import { db, entries } from '@folio/db'
import { ORPCError } from '@orpc/server'
import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { protectedProcedure } from '../index'

/**
 * Entry filter types for list queries
 */
const EntryFilterSchema = z
	.enum(['inbox', 'starred', 'pinned', 'deleted', 'all'])
	.default('all')

/**
 * Input schema for creating an entry
 */
const CreateEntryInputSchema = z.object({
	title: z.string().optional().default(''),
	content: z.string().optional().default(''),
	isInbox: z.boolean().optional().default(true),
})

/**
 * Input schema for updating an entry
 */
const UpdateEntryInputSchema = z.object({
	id: z.string(),
	title: z.string().optional(),
	content: z.string().optional(),
	isInbox: z.boolean().optional(),
	isStarred: z.boolean().optional(),
	isPinned: z.boolean().optional(),
})

/**
 * Input schema for getting a single entry
 */
const GetEntryInputSchema = z.object({
	id: z.string(),
})

/**
 * Input schema for listing entries with pagination
 */
const ListEntriesInputSchema = z.object({
	filter: EntryFilterSchema,
	cursor: z.string().optional(),
	limit: z.number().int().min(1).max(100).default(20),
})

/**
 * entries.create - Create a new entry
 */
export const createEntry = protectedProcedure
	.input(CreateEntryInputSchema)
	.handler(async ({ context, input }) => {
		const userId = context.session.user.id
		const id = nanoid()

		const [entry] = await db
			.insert(entries)
			.values({
				id,
				userId,
				title: input.title,
				content: input.content,
				isInbox: input.isInbox,
			})
			.returning()

		return entry
	})

/**
 * entries.update - Update an existing entry
 */
export const updateEntry = protectedProcedure
	.input(UpdateEntryInputSchema)
	.handler(async ({ context, input }) => {
		const userId = context.session.user.id
		const { id, ...updateData } = input

		// Only include defined fields in the update
		const fieldsToUpdate: Record<string, unknown> = {}
		if (updateData.title !== undefined) {
			fieldsToUpdate.title = updateData.title
		}
		if (updateData.content !== undefined) {
			fieldsToUpdate.content = updateData.content
		}
		if (updateData.isInbox !== undefined) {
			fieldsToUpdate.isInbox = updateData.isInbox
		}
		if (updateData.isStarred !== undefined) {
			fieldsToUpdate.isStarred = updateData.isStarred
		}
		if (updateData.isPinned !== undefined) {
			fieldsToUpdate.isPinned = updateData.isPinned
		}

		const [entry] = await db
			.update(entries)
			.set(fieldsToUpdate)
			.where(
				and(
					eq(entries.id, id),
					eq(entries.userId, userId),
					isNull(entries.deletedAt)
				)
			)
			.returning()

		if (!entry) {
			throw new ORPCError('NOT_FOUND', { message: 'Entry not found' })
		}

		return entry
	})

/**
 * entries.delete - Soft delete an entry
 */
export const deleteEntry = protectedProcedure
	.input(GetEntryInputSchema)
	.handler(async ({ context, input }) => {
		const userId = context.session.user.id

		const [entry] = await db
			.update(entries)
			.set({ deletedAt: new Date() })
			.where(
				and(
					eq(entries.id, input.id),
					eq(entries.userId, userId),
					isNull(entries.deletedAt)
				)
			)
			.returning()

		if (!entry) {
			throw new ORPCError('NOT_FOUND', { message: 'Entry not found' })
		}

		return { success: true }
	})

/**
 * entries.restore - Restore a soft-deleted entry
 */
export const restoreEntry = protectedProcedure
	.input(GetEntryInputSchema)
	.handler(async ({ context, input }) => {
		const userId = context.session.user.id

		const [entry] = await db
			.update(entries)
			.set({ deletedAt: null })
			.where(
				and(
					eq(entries.id, input.id),
					eq(entries.userId, userId),
					isNotNull(entries.deletedAt)
				)
			)
			.returning()

		if (!entry) {
			throw new ORPCError('NOT_FOUND', { message: 'Entry not found or not deleted' })
		}

		return entry
	})

/**
 * entries.get - Get a single entry by ID
 */
export const getEntry = protectedProcedure
	.input(GetEntryInputSchema)
	.handler(async ({ context, input }) => {
		const userId = context.session.user.id

		const [entry] = await db
			.select()
			.from(entries)
			.where(
				and(
					eq(entries.id, input.id),
					eq(entries.userId, userId),
					isNull(entries.deletedAt)
				)
			)
			.limit(1)

		if (!entry) {
			throw new ORPCError('NOT_FOUND', { message: 'Entry not found' })
		}

		return entry
	})

/**
 * entries.list - List entries with filtering and cursor-based pagination
 */
export const listEntries = protectedProcedure
	.input(ListEntriesInputSchema)
	.handler(async ({ context, input }) => {
		const userId = context.session.user.id
		const { filter, cursor, limit } = input

		// Build filter conditions based on filter type
		const conditions = [eq(entries.userId, userId)]

		switch (filter) {
			case 'inbox':
				conditions.push(eq(entries.isInbox, true))
				conditions.push(isNull(entries.deletedAt))
				break
			case 'starred':
				conditions.push(eq(entries.isStarred, true))
				conditions.push(isNull(entries.deletedAt))
				break
			case 'pinned':
				conditions.push(eq(entries.isPinned, true))
				conditions.push(isNull(entries.deletedAt))
				break
			case 'deleted':
				conditions.push(isNotNull(entries.deletedAt))
				break
			default:
				conditions.push(isNull(entries.deletedAt))
				break
		}

		// Add cursor condition for pagination
		if (cursor) {
			// Cursor is the ID of the last item from the previous page
			// We need to find entries created before the cursor entry
			const [cursorEntry] = await db
				.select({ updatedAt: entries.updatedAt })
				.from(entries)
				.where(eq(entries.id, cursor))
				.limit(1)

			if (cursorEntry) {
				const { lt } = await import('drizzle-orm')
				conditions.push(lt(entries.updatedAt, cursorEntry.updatedAt))
			}
		}

		const items = await db
			.select()
			.from(entries)
			.where(and(...conditions))
			.orderBy(desc(entries.updatedAt))
			.limit(limit + 1) // Fetch one extra to determine if there are more

		const hasMore = items.length > limit
		const resultItems = hasMore ? items.slice(0, limit) : items
		const nextCursor = hasMore ? resultItems.at(-1)?.id : undefined

		return {
			items: resultItems,
			nextCursor,
			hasMore,
		}
	})

/**
 * Entries router - all entry-related procedures
 */
export const entriesRouter = {
	create: createEntry,
	update: updateEntry,
	delete: deleteEntry,
	restore: restoreEntry,
	get: getEntry,
	list: listEntries,
}
