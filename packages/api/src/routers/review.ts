import { db, entries, reviewEvents } from '@folio/db'
import { ORPCError } from '@orpc/server'
import { and, desc, eq, gte, isNull, lt, notInArray, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { protectedProcedure } from '../index'

/**
 * Review rule types for queue generation
 */
const ReviewRuleSchema = z
	.enum(['new', 'starred', 'unreviewed', 'all'])
	.default('all')

/**
 * Input schema for getting review queue
 */
const GetReviewQueueInputSchema = z.object({
	rule: ReviewRuleSchema,
	limit: z.number().int().min(1).max(50).default(10),
})

/**
 * Input schema for marking entry as reviewed
 */
const MarkReviewedInputSchema = z.object({
	entryId: z.string(),
	note: z.string().optional(),
})

/**
 * Input schema for getting review history
 */
const GetReviewHistoryInputSchema = z.object({
	entryId: z.string().optional(),
	cursor: z.string().optional(),
	limit: z.number().int().min(1).max(100).default(20),
})

/**
 * Helper: Get the start of today (midnight)
 */
const getStartOfToday = () => {
	const today = new Date()
	today.setHours(0, 0, 0, 0)
	return today
}

/**
 * review.getQueue - Get today's review queue based on rule
 */
export const getReviewQueue = protectedProcedure
	.input(GetReviewQueueInputSchema)
	.handler(async ({ context, input }) => {
		const userId = context.session.user.id
		const { rule, limit } = input
		const startOfToday = getStartOfToday()

		// Get entries that have already been reviewed today
		const todayReviews = await db
			.select({ entryId: reviewEvents.entryId })
			.from(reviewEvents)
			.where(
				and(
					eq(reviewEvents.userId, userId),
					gte(reviewEvents.reviewedAt, startOfToday)
				)
			)

		const reviewedTodayIds = todayReviews.map((r) => r.entryId)

		// Build conditions based on rule
		const baseConditions = [eq(entries.userId, userId), isNull(entries.deletedAt)]

		// Exclude already reviewed today entries
		if (reviewedTodayIds.length > 0) {
			baseConditions.push(notInArray(entries.id, reviewedTodayIds))
		}

		let items: (typeof entries.$inferSelect)[] = []

		switch (rule) {
			case 'new': {
				// Entries created in the last 7 days that haven't been reviewed
				const sevenDaysAgo = new Date()
				sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

				// Get entries that have never been reviewed
				const allReviewedEntryIds = await db
					.selectDistinct({ entryId: reviewEvents.entryId })
					.from(reviewEvents)
					.where(eq(reviewEvents.userId, userId))

				const everReviewedIds = allReviewedEntryIds.map((r) => r.entryId)

				const newConditions = [
					...baseConditions,
					gte(entries.createdAt, sevenDaysAgo),
				]
				if (everReviewedIds.length > 0) {
					newConditions.push(notInArray(entries.id, everReviewedIds))
				}

				items = await db
					.select()
					.from(entries)
					.where(and(...newConditions))
					.orderBy(desc(entries.createdAt))
					.limit(limit)
				break
			}
			case 'starred': {
				// Starred entries
				items = await db
					.select()
					.from(entries)
					.where(and(...baseConditions, eq(entries.isStarred, true)))
					.orderBy(desc(entries.updatedAt))
					.limit(limit)
				break
			}
			case 'unreviewed': {
				// Entries that have never been reviewed
				const allReviewedEntryIds = await db
					.selectDistinct({ entryId: reviewEvents.entryId })
					.from(reviewEvents)
					.where(eq(reviewEvents.userId, userId))

				const everReviewedIds = allReviewedEntryIds.map((r) => r.entryId)

				const unreviewedConditions = [...baseConditions]
				if (everReviewedIds.length > 0) {
					unreviewedConditions.push(notInArray(entries.id, everReviewedIds))
				}

				items = await db
					.select()
					.from(entries)
					.where(and(...unreviewedConditions))
					.orderBy(desc(entries.createdAt))
					.limit(limit)
				break
			}
			default: {
				// All entries (excluding already reviewed today)
				items = await db
					.select()
					.from(entries)
					.where(and(...baseConditions))
					.orderBy(desc(entries.updatedAt))
					.limit(limit)
				break
			}
		}

		return {
			items,
			rule,
			reviewedTodayCount: reviewedTodayIds.length,
		}
	})

/**
 * review.markReviewed - Mark an entry as reviewed
 */
export const markReviewed = protectedProcedure
	.input(MarkReviewedInputSchema)
	.handler(async ({ context, input }) => {
		const userId = context.session.user.id
		const { entryId, note } = input

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

		// Create review event
		const [reviewEvent] = await db
			.insert(reviewEvents)
			.values({
				id: nanoid(),
				userId,
				entryId,
				note: note ?? null,
				reviewedAt: new Date(),
			})
			.returning()

		return { success: true, reviewEvent }
	})

/**
 * review.getHistory - Get review history
 */
export const getReviewHistory = protectedProcedure
	.input(GetReviewHistoryInputSchema)
	.handler(async ({ context, input }) => {
		const userId = context.session.user.id
		const { entryId, cursor, limit } = input

		const conditions = [eq(reviewEvents.userId, userId)]

		if (entryId) {
			conditions.push(eq(reviewEvents.entryId, entryId))
		}

		if (cursor) {
			const [cursorEvent] = await db
				.select({ reviewedAt: reviewEvents.reviewedAt })
				.from(reviewEvents)
				.where(eq(reviewEvents.id, cursor))
				.limit(1)

			if (cursorEvent) {
				conditions.push(lt(reviewEvents.reviewedAt, cursorEvent.reviewedAt))
			}
		}

		const items = await db
			.select({
				reviewEvent: reviewEvents,
				entry: entries,
			})
			.from(reviewEvents)
			.innerJoin(entries, eq(reviewEvents.entryId, entries.id))
			.where(and(...conditions))
			.orderBy(desc(reviewEvents.reviewedAt))
			.limit(limit + 1)

		const hasMore = items.length > limit
		const resultItems = hasMore ? items.slice(0, limit) : items
		const nextCursor = hasMore ? resultItems.at(-1)?.reviewEvent.id : undefined

		return {
			items: resultItems,
			nextCursor,
			hasMore,
		}
	})

/**
 * review.getTodayStats - Get today's review statistics
 */
export const getTodayStats = protectedProcedure.handler(async ({ context }) => {
	const userId = context.session.user.id
	const startOfToday = getStartOfToday()

	// Count entries reviewed today
	const todayReviews = await db
		.select({ entryId: reviewEvents.entryId })
		.from(reviewEvents)
		.where(
			and(
				eq(reviewEvents.userId, userId),
				gte(reviewEvents.reviewedAt, startOfToday)
			)
		)

	// Count total entries (not deleted)
	const totalEntries = await db
		.select({ count: sql<number>`count(*)` })
		.from(entries)
		.where(and(eq(entries.userId, userId), isNull(entries.deletedAt)))

	// Count starred entries
	const starredEntries = await db
		.select({ count: sql<number>`count(*)` })
		.from(entries)
		.where(
			and(
				eq(entries.userId, userId),
				eq(entries.isStarred, true),
				isNull(entries.deletedAt)
			)
		)

	// Count entries never reviewed
	const allReviewedEntryIds = await db
		.selectDistinct({ entryId: reviewEvents.entryId })
		.from(reviewEvents)
		.where(eq(reviewEvents.userId, userId))

	const everReviewedCount = allReviewedEntryIds.length

	return {
		reviewedToday: todayReviews.length,
		totalEntries: Number(totalEntries[0]?.count ?? 0),
		starredEntries: Number(starredEntries[0]?.count ?? 0),
		unreviewedEntries: Number(totalEntries[0]?.count ?? 0) - everReviewedCount,
	}
})

/**
 * review.getEntryReviewCount - Get review count for an entry
 */
export const getEntryReviewCount = protectedProcedure
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

		// Count reviews for this entry
		const reviews = await db
			.select({ count: sql<number>`count(*)` })
			.from(reviewEvents)
			.where(eq(reviewEvents.entryId, input.entryId))

		// Get last review date
		const lastReview = await db
			.select({ reviewedAt: reviewEvents.reviewedAt })
			.from(reviewEvents)
			.where(eq(reviewEvents.entryId, input.entryId))
			.orderBy(desc(reviewEvents.reviewedAt))
			.limit(1)

		return {
			count: Number(reviews[0]?.count ?? 0),
			lastReviewedAt: lastReview[0]?.reviewedAt ?? null,
		}
	})

/**
 * Review router - all review-related procedures
 */
export const reviewRouter = {
	getQueue: getReviewQueue,
	markReviewed,
	getHistory: getReviewHistory,
	getTodayStats,
	getEntryReviewCount,
}
