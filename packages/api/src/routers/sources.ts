import { db, entries, entrySources, sources } from '@folio/db'
import { ORPCError } from '@orpc/server'
import { and, desc, eq, isNull, lt } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { protectedProcedure } from '../index'

/**
 * Source type enum
 */
const SourceTypeSchema = z.enum([
	'link',
	'pdf',
	'book',
	'article',
	'video',
	'podcast',
	'other',
])

/**
 * Input schema for creating a source
 */
const CreateSourceInputSchema = z.object({
	type: SourceTypeSchema.default('link'),
	title: z.string().min(1).max(500),
	url: z.string().url().optional(),
	author: z.string().max(200).optional(),
	publishedAt: z.date().optional(),
	metadata: z.string().optional(),
})

/**
 * Input schema for updating a source
 */
const UpdateSourceInputSchema = z.object({
	id: z.string(),
	type: SourceTypeSchema.optional(),
	title: z.string().min(1).max(500).optional(),
	url: z.string().url().nullable().optional(),
	author: z.string().max(200).nullable().optional(),
	publishedAt: z.date().nullable().optional(),
	metadata: z.string().nullable().optional(),
})

/**
 * Input schema for getting/deleting a single source
 */
const GetSourceInputSchema = z.object({
	id: z.string(),
})

/**
 * Input schema for listing sources with pagination
 */
const ListSourcesInputSchema = z.object({
	type: SourceTypeSchema.optional(),
	cursor: z.string().optional(),
	limit: z.number().int().min(1).max(100).default(20),
})

/**
 * Input schema for adding/removing sources from entries
 */
const EntrySourceInputSchema = z.object({
	entryId: z.string(),
	sourceId: z.string(),
	position: z.string().optional(),
})

/**
 * sources.create - Create a new source
 */
export const createSource = protectedProcedure
	.input(CreateSourceInputSchema)
	.handler(async ({ context, input }) => {
		const userId = context.session.user.id
		const id = nanoid()

		const [source] = await db
			.insert(sources)
			.values({
				id,
				userId,
				type: input.type,
				title: input.title,
				url: input.url ?? null,
				author: input.author ?? null,
				publishedAt: input.publishedAt ?? null,
				metadata: input.metadata ?? null,
			})
			.returning()

		return source
	})

/**
 * sources.update - Update an existing source
 */
export const updateSource = protectedProcedure
	.input(UpdateSourceInputSchema)
	.handler(async ({ context, input }) => {
		const userId = context.session.user.id
		const { id, ...updateData } = input

		const fieldsToUpdate: Record<string, unknown> = {}
		if (updateData.type !== undefined) {
			fieldsToUpdate.type = updateData.type
		}
		if (updateData.title !== undefined) {
			fieldsToUpdate.title = updateData.title
		}
		if (updateData.url !== undefined) {
			fieldsToUpdate.url = updateData.url
		}
		if (updateData.author !== undefined) {
			fieldsToUpdate.author = updateData.author
		}
		if (updateData.publishedAt !== undefined) {
			fieldsToUpdate.publishedAt = updateData.publishedAt
		}
		if (updateData.metadata !== undefined) {
			fieldsToUpdate.metadata = updateData.metadata
		}

		if (Object.keys(fieldsToUpdate).length === 0) {
			const [existingSource] = await db
				.select()
				.from(sources)
				.where(
					and(
						eq(sources.id, id),
						eq(sources.userId, userId),
						isNull(sources.deletedAt)
					)
				)
				.limit(1)

			if (!existingSource) {
				throw new ORPCError('NOT_FOUND', { message: 'Source not found' })
			}
			return existingSource
		}

		const [source] = await db
			.update(sources)
			.set(fieldsToUpdate)
			.where(
				and(
					eq(sources.id, id),
					eq(sources.userId, userId),
					isNull(sources.deletedAt)
				)
			)
			.returning()

		if (!source) {
			throw new ORPCError('NOT_FOUND', { message: 'Source not found' })
		}

		return source
	})

/**
 * sources.delete - Soft delete a source
 */
export const deleteSource = protectedProcedure
	.input(GetSourceInputSchema)
	.handler(async ({ context, input }) => {
		const userId = context.session.user.id

		const [source] = await db
			.update(sources)
			.set({ deletedAt: new Date() })
			.where(
				and(
					eq(sources.id, input.id),
					eq(sources.userId, userId),
					isNull(sources.deletedAt)
				)
			)
			.returning()

		if (!source) {
			throw new ORPCError('NOT_FOUND', { message: 'Source not found' })
		}

		return { success: true }
	})

/**
 * sources.restore - Restore a soft-deleted source
 */
export const restoreSource = protectedProcedure
	.input(GetSourceInputSchema)
	.handler(async ({ context, input }) => {
		const userId = context.session.user.id
		const { isNotNull } = await import('drizzle-orm')

		const [source] = await db
			.update(sources)
			.set({ deletedAt: null })
			.where(
				and(
					eq(sources.id, input.id),
					eq(sources.userId, userId),
					isNotNull(sources.deletedAt)
				)
			)
			.returning()

		if (!source) {
			throw new ORPCError('NOT_FOUND', {
				message: 'Source not found or not deleted',
			})
		}

		return source
	})

/**
 * sources.get - Get a single source by ID
 */
export const getSource = protectedProcedure
	.input(GetSourceInputSchema)
	.handler(async ({ context, input }) => {
		const userId = context.session.user.id

		const [source] = await db
			.select()
			.from(sources)
			.where(
				and(
					eq(sources.id, input.id),
					eq(sources.userId, userId),
					isNull(sources.deletedAt)
				)
			)
			.limit(1)

		if (!source) {
			throw new ORPCError('NOT_FOUND', { message: 'Source not found' })
		}

		return source
	})

/**
 * sources.list - List sources with filtering and cursor-based pagination
 */
export const listSources = protectedProcedure
	.input(ListSourcesInputSchema)
	.handler(async ({ context, input }) => {
		const userId = context.session.user.id
		const { type, cursor, limit } = input

		const conditions = [eq(sources.userId, userId), isNull(sources.deletedAt)]

		if (type) {
			conditions.push(eq(sources.type, type))
		}

		if (cursor) {
			const [cursorSource] = await db
				.select({ updatedAt: sources.updatedAt })
				.from(sources)
				.where(eq(sources.id, cursor))
				.limit(1)

			if (cursorSource) {
				conditions.push(lt(sources.updatedAt, cursorSource.updatedAt))
			}
		}

		const items = await db
			.select()
			.from(sources)
			.where(and(...conditions))
			.orderBy(desc(sources.updatedAt))
			.limit(limit + 1)

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
 * sources.addToEntry - Add a source to an entry
 */
export const addSourceToEntry = protectedProcedure
	.input(EntrySourceInputSchema)
	.handler(async ({ context, input }) => {
		const userId = context.session.user.id
		const { entryId, sourceId, position } = input

		// Verify the entry belongs to the user and is not deleted
		const [entry] = await db
			.select()
			.from(entries)
			.where(
				and(
					eq(entries.id, entryId),
					eq(entries.userId, userId),
					isNull(entries.deletedAt)
				)
			)
			.limit(1)

		if (!entry) {
			throw new ORPCError('NOT_FOUND', { message: 'Entry not found' })
		}

		// Verify the source belongs to the user and is not deleted
		const [source] = await db
			.select()
			.from(sources)
			.where(
				and(
					eq(sources.id, sourceId),
					eq(sources.userId, userId),
					isNull(sources.deletedAt)
				)
			)
			.limit(1)

		if (!source) {
			throw new ORPCError('NOT_FOUND', { message: 'Source not found' })
		}

		// Check if the association already exists
		const [existingAssociation] = await db
			.select()
			.from(entrySources)
			.where(
				and(eq(entrySources.entryId, entryId), eq(entrySources.sourceId, sourceId))
			)
			.limit(1)

		if (existingAssociation) {
			// Update position if provided
			if (position !== undefined) {
				const [updated] = await db
					.update(entrySources)
					.set({ position })
					.where(eq(entrySources.id, existingAssociation.id))
					.returning()
				return { success: true, entrySource: updated }
			}
			return { success: true, entrySource: existingAssociation }
		}

		// Create the association
		const [entrySource] = await db
			.insert(entrySources)
			.values({
				id: nanoid(),
				entryId,
				sourceId,
				position: position ?? null,
			})
			.returning()

		return { success: true, entrySource }
	})

/**
 * sources.removeFromEntry - Remove a source from an entry
 */
export const removeSourceFromEntry = protectedProcedure
	.input(z.object({ entryId: z.string(), sourceId: z.string() }))
	.handler(async ({ context, input }) => {
		const userId = context.session.user.id
		const { entryId, sourceId } = input

		// Verify the entry belongs to the user
		const [entry] = await db
			.select()
			.from(entries)
			.where(
				and(
					eq(entries.id, entryId),
					eq(entries.userId, userId),
					isNull(entries.deletedAt)
				)
			)
			.limit(1)

		if (!entry) {
			throw new ORPCError('NOT_FOUND', { message: 'Entry not found' })
		}

		// Delete the association
		const result = await db
			.delete(entrySources)
			.where(
				and(eq(entrySources.entryId, entryId), eq(entrySources.sourceId, sourceId))
			)
			.returning()

		return { success: true, deleted: result.length > 0 }
	})

/**
 * sources.getEntrySources - Get all sources for an entry
 */
export const getEntrySources = protectedProcedure
	.input(z.object({ entryId: z.string() }))
	.handler(async ({ context, input }) => {
		const userId = context.session.user.id

		// Verify the entry belongs to the user
		const [entry] = await db
			.select()
			.from(entries)
			.where(
				and(
					eq(entries.id, input.entryId),
					eq(entries.userId, userId),
					isNull(entries.deletedAt)
				)
			)
			.limit(1)

		if (!entry) {
			throw new ORPCError('NOT_FOUND', { message: 'Entry not found' })
		}

		// Get all sources for this entry
		const associations = await db
			.select({
				source: sources,
				position: entrySources.position,
			})
			.from(entrySources)
			.innerJoin(sources, eq(entrySources.sourceId, sources.id))
			.where(and(eq(entrySources.entryId, input.entryId), isNull(sources.deletedAt)))

		return associations.map((a) => ({ ...a.source, position: a.position }))
	})

/**
 * sources.getSourceEntries - Get all entries for a source
 */
export const getSourceEntries = protectedProcedure
	.input(GetSourceInputSchema)
	.handler(async ({ context, input }) => {
		const userId = context.session.user.id

		// Verify the source belongs to the user
		const [source] = await db
			.select()
			.from(sources)
			.where(
				and(
					eq(sources.id, input.id),
					eq(sources.userId, userId),
					isNull(sources.deletedAt)
				)
			)
			.limit(1)

		if (!source) {
			throw new ORPCError('NOT_FOUND', { message: 'Source not found' })
		}

		// Get all entries for this source
		const associations = await db
			.select({
				entry: entries,
				position: entrySources.position,
			})
			.from(entrySources)
			.innerJoin(entries, eq(entrySources.entryId, entries.id))
			.where(and(eq(entrySources.sourceId, input.id), isNull(entries.deletedAt)))

		return associations.map((a) => ({ ...a.entry, position: a.position }))
	})

/**
 * Sources router - all source-related procedures
 */
export const sourcesRouter = {
	create: createSource,
	update: updateSource,
	delete: deleteSource,
	restore: restoreSource,
	get: getSource,
	list: listSources,
	addToEntry: addSourceToEntry,
	removeFromEntry: removeSourceFromEntry,
	getEntrySources,
	getSourceEntries,
}
