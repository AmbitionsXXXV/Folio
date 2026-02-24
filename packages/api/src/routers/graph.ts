/**
 * Graph Router
 *
 * Provides topology-aware graph data for knowledge graph visualization
 * and AI context augmentation.
 *
 * Data sources:
 * - entry_links (explicit ref/manual links)
 * - entry_tags (inferred edges via shared tags)
 * - entry_sources (inferred edges via shared sources)
 */

import {
	db,
	entries,
	entryLinks,
	entrySources,
	entryTags,
	tags,
} from '@folionote/db'
import { ORPCError } from '@orpc/server'
import { and, count, eq, inArray, isNull, or, sql } from 'drizzle-orm'
import { nanoid } from 'nanoid'
import { z } from 'zod'
import { protectedProcedure } from '../index'

// =============================================================================
// Types
// =============================================================================

type GraphNode = {
	id: string
	title: string
	isInbox: boolean
	isStarred: boolean
	isPinned: boolean
	tags: Array<{ id: string; name: string; color: string | null }>
	updatedAt: string
}

type GraphEdge = {
	id: string
	source: string
	target: string
	linkType: 'ref' | 'manual' | 'shared-tag' | 'shared-source'
	label?: string
}

// =============================================================================
// Schemas
// =============================================================================

const GetGraphInputSchema = z.object({
	tagId: z.string().optional(),
	sourceId: z.string().optional(),
	includeInferred: z.boolean().optional().default(true),
})

const GetNeighborsInputSchema = z.object({
	entryId: z.string(),
	depth: z.number().int().min(1).max(3).default(1),
	includeInferred: z.boolean().optional().default(true),
})

const AddManualLinkInputSchema = z.object({
	sourceEntryId: z.string(),
	targetEntryId: z.string(),
})

const RemoveLinkInputSchema = z.object({
	linkId: z.string(),
})

// =============================================================================
// Helpers
// =============================================================================

async function fetchEntryTags(
	entryIds: string[]
): Promise<Map<string, GraphNode['tags']>> {
	if (entryIds.length === 0) return new Map()

	const rows = await db
		.select({
			entryId: entryTags.entryId,
			tagId: tags.id,
			tagName: tags.name,
			tagColor: tags.color,
		})
		.from(entryTags)
		.innerJoin(tags, eq(entryTags.tagId, tags.id))
		.where(inArray(entryTags.entryId, entryIds))

	const map = new Map<string, GraphNode['tags']>()
	for (const row of rows) {
		const existing = map.get(row.entryId) ?? []
		existing.push({ id: row.tagId, name: row.tagName, color: row.tagColor })
		map.set(row.entryId, existing)
	}
	return map
}

async function fetchExplicitEdges(
	userId: string,
	entryIds: string[]
): Promise<GraphEdge[]> {
	if (entryIds.length === 0) return []

	const links = await db
		.select()
		.from(entryLinks)
		.where(
			and(
				eq(entryLinks.userId, userId),
				or(
					inArray(entryLinks.sourceEntryId, entryIds),
					inArray(entryLinks.targetEntryId, entryIds)
				)
			)
		)

	return links.map((l) => ({
		id: l.id,
		source: l.sourceEntryId,
		target: l.targetEntryId,
		linkType: l.linkType as 'ref' | 'manual',
	}))
}

async function fetchSharedTagEdges(entryIds: string[]): Promise<GraphEdge[]> {
	if (entryIds.length === 0) return []

	const tagAssociations = await db
		.select({
			entryId: entryTags.entryId,
			tagId: entryTags.tagId,
			tagName: tags.name,
		})
		.from(entryTags)
		.innerJoin(tags, eq(entryTags.tagId, tags.id))
		.where(inArray(entryTags.entryId, entryIds))

	const tagToEntries = new Map<string, Array<{ entryId: string; tagName: string }>>()
	for (const row of tagAssociations) {
		const existing = tagToEntries.get(row.tagId) ?? []
		existing.push({ entryId: row.entryId, tagName: row.tagName })
		tagToEntries.set(row.tagId, existing)
	}

	const edges: GraphEdge[] = []
	const seen = new Set<string>()

	for (const [, entriesForTag] of tagToEntries) {
		if (entriesForTag.length < 2) continue
		for (let i = 0; i < entriesForTag.length; i++) {
			for (let j = i + 1; j < entriesForTag.length; j++) {
				const a = entriesForTag[i]
				const b = entriesForTag[j]
				if (!(a && b)) continue
				const key = [a.entryId, b.entryId].sort().join(':')
				if (seen.has(key)) continue
				seen.add(key)
				edges.push({
					id: `shared-tag-${key}`,
					source: a.entryId,
					target: b.entryId,
					linkType: 'shared-tag',
					label: a.tagName,
				})
			}
		}
	}

	return edges
}

async function fetchSharedSourceEdges(entryIds: string[]): Promise<GraphEdge[]> {
	if (entryIds.length === 0) return []

	const sourceAssociations = await db
		.select({
			entryId: entrySources.entryId,
			sourceId: entrySources.sourceId,
		})
		.from(entrySources)
		.where(inArray(entrySources.entryId, entryIds))

	const sourceToEntries = new Map<string, string[]>()
	for (const row of sourceAssociations) {
		const existing = sourceToEntries.get(row.sourceId) ?? []
		existing.push(row.entryId)
		sourceToEntries.set(row.sourceId, existing)
	}

	const edges: GraphEdge[] = []
	const seen = new Set<string>()

	for (const [, sourceEntries] of sourceToEntries) {
		if (sourceEntries.length < 2) continue
		for (let i = 0; i < sourceEntries.length; i++) {
			for (let j = i + 1; j < sourceEntries.length; j++) {
				const a = sourceEntries[i]
				const b = sourceEntries[j]
				if (!(a && b)) continue
				const key = [a, b].sort().join(':')
				if (seen.has(key)) continue
				seen.add(key)
				edges.push({
					id: `shared-source-${key}`,
					source: a,
					target: b,
					linkType: 'shared-source',
				})
			}
		}
	}

	return edges
}

function toGraphNode(
	entry: {
		id: string
		title: string
		isInbox: boolean
		isStarred: boolean
		isPinned: boolean
		updatedAt: Date
	},
	tagMap: Map<string, GraphNode['tags']>
): GraphNode {
	return {
		id: entry.id,
		title: entry.title,
		isInbox: entry.isInbox,
		isStarred: entry.isStarred,
		isPinned: entry.isPinned,
		tags: tagMap.get(entry.id) ?? [],
		updatedAt: entry.updatedAt.toISOString(),
	}
}

function deduplicateEdges(edgeArrays: GraphEdge[][]): GraphEdge[] {
	const seen = new Set<string>()
	const result: GraphEdge[] = []
	for (const edges of edgeArrays) {
		for (const edge of edges) {
			const key =
				edge.linkType === 'ref' || edge.linkType === 'manual'
					? edge.id
					: `${edge.linkType}:${[edge.source, edge.target].sort().join(':')}`
			if (seen.has(key)) continue
			seen.add(key)
			result.push(edge)
		}
	}
	return result
}

// =============================================================================
// Procedures
// =============================================================================

const getGraph = protectedProcedure
	.input(GetGraphInputSchema)
	.handler(async ({ context, input }) => {
		const userId = context.session.user.id
		const { tagId, sourceId, includeInferred } = input

		let entryRows: Array<{
			id: string
			title: string
			isInbox: boolean
			isStarred: boolean
			isPinned: boolean
			updatedAt: Date
		}>

		if (tagId) {
			const tagged = await db
				.select({ entryId: entryTags.entryId })
				.from(entryTags)
				.where(eq(entryTags.tagId, tagId))

			const ids = tagged.map((t) => t.entryId)
			if (ids.length === 0) return { nodes: [], edges: [] }

			entryRows = await db
				.select({
					id: entries.id,
					title: entries.title,
					isInbox: entries.isInbox,
					isStarred: entries.isStarred,
					isPinned: entries.isPinned,
					updatedAt: entries.updatedAt,
				})
				.from(entries)
				.where(
					and(
						eq(entries.userId, userId),
						isNull(entries.deletedAt),
						inArray(entries.id, ids)
					)
				)
		} else if (sourceId) {
			const sourced = await db
				.select({ entryId: entrySources.entryId })
				.from(entrySources)
				.where(eq(entrySources.sourceId, sourceId))

			const ids = sourced.map((s) => s.entryId)
			if (ids.length === 0) return { nodes: [], edges: [] }

			entryRows = await db
				.select({
					id: entries.id,
					title: entries.title,
					isInbox: entries.isInbox,
					isStarred: entries.isStarred,
					isPinned: entries.isPinned,
					updatedAt: entries.updatedAt,
				})
				.from(entries)
				.where(
					and(
						eq(entries.userId, userId),
						isNull(entries.deletedAt),
						inArray(entries.id, ids)
					)
				)
		} else {
			entryRows = await db
				.select({
					id: entries.id,
					title: entries.title,
					isInbox: entries.isInbox,
					isStarred: entries.isStarred,
					isPinned: entries.isPinned,
					updatedAt: entries.updatedAt,
				})
				.from(entries)
				.where(and(eq(entries.userId, userId), isNull(entries.deletedAt)))
		}

		const entryIds = entryRows.map((e) => e.id)
		const tagMap = await fetchEntryTags(entryIds)
		const nodes = entryRows.map((e) => toGraphNode(e, tagMap))

		const edgeSources: GraphEdge[][] = [await fetchExplicitEdges(userId, entryIds)]

		if (includeInferred) {
			edgeSources.push(await fetchSharedTagEdges(entryIds))
			edgeSources.push(await fetchSharedSourceEdges(entryIds))
		}

		const allEdges = deduplicateEdges(edgeSources)
		const nodeIdSet = new Set(entryIds)
		const edges = allEdges.filter(
			(e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target)
		)

		return { nodes, edges }
	})

async function expandFrontierByTags(
	frontier: string[],
	visited: Set<string>,
	nextFrontier: Set<string>
): Promise<void> {
	const tagRows = await db
		.select({ tagId: entryTags.tagId })
		.from(entryTags)
		.where(inArray(entryTags.entryId, frontier))

	const tagIds = [...new Set(tagRows.map((r) => r.tagId))]
	if (tagIds.length === 0) return

	const sharedTagEntries = await db
		.select({ entryId: entryTags.entryId })
		.from(entryTags)
		.where(inArray(entryTags.tagId, tagIds))

	for (const row of sharedTagEntries) {
		if (!visited.has(row.entryId)) nextFrontier.add(row.entryId)
	}
}

async function bfsTraverse(
	userId: string,
	startId: string,
	depth: number,
	includeInferred: boolean
): Promise<string[]> {
	const visited = new Set<string>()
	let frontier = [startId]

	for (let hop = 0; hop < depth && frontier.length > 0; hop++) {
		for (const id of frontier) visited.add(id)

		const links = await db
			.select()
			.from(entryLinks)
			.where(
				and(
					eq(entryLinks.userId, userId),
					or(
						inArray(entryLinks.sourceEntryId, frontier),
						inArray(entryLinks.targetEntryId, frontier)
					)
				)
			)

		const nextFrontier = new Set<string>()
		for (const link of links) {
			if (!visited.has(link.sourceEntryId)) nextFrontier.add(link.sourceEntryId)
			if (!visited.has(link.targetEntryId)) nextFrontier.add(link.targetEntryId)
		}

		if (includeInferred) {
			await expandFrontierByTags(frontier, visited, nextFrontier)
		}

		frontier = [...nextFrontier]
	}
	for (const id of frontier) visited.add(id)

	return [...visited]
}

const getNeighbors = protectedProcedure
	.input(GetNeighborsInputSchema)
	.handler(async ({ context, input }) => {
		const userId = context.session.user.id
		const { entryId, depth, includeInferred } = input

		const allIds = await bfsTraverse(userId, entryId, depth, includeInferred)
		if (allIds.length === 0) return { nodes: [], edges: [] }

		const entryRows = await db
			.select({
				id: entries.id,
				title: entries.title,
				isInbox: entries.isInbox,
				isStarred: entries.isStarred,
				isPinned: entries.isPinned,
				updatedAt: entries.updatedAt,
			})
			.from(entries)
			.where(
				and(
					eq(entries.userId, userId),
					isNull(entries.deletedAt),
					inArray(entries.id, allIds)
				)
			)

		const validIds = entryRows.map((e) => e.id)
		const tagMap = await fetchEntryTags(validIds)
		const nodes = entryRows.map((e) => toGraphNode(e, tagMap))

		const edgeSources: GraphEdge[][] = [await fetchExplicitEdges(userId, validIds)]
		if (includeInferred) {
			edgeSources.push(await fetchSharedTagEdges(validIds))
			edgeSources.push(await fetchSharedSourceEdges(validIds))
		}

		const nodeIdSet = new Set(validIds)
		const edges = deduplicateEdges(edgeSources).filter(
			(e) => nodeIdSet.has(e.source) && nodeIdSet.has(e.target)
		)

		return { nodes, edges }
	})

const addManualLink = protectedProcedure
	.input(AddManualLinkInputSchema)
	.handler(async ({ context, input }) => {
		const userId = context.session.user.id
		const { sourceEntryId, targetEntryId } = input

		if (sourceEntryId === targetEntryId) {
			throw new ORPCError('BAD_REQUEST', {
				message: 'Cannot link an entry to itself',
			})
		}

		const [source, target] = await Promise.all([
			db
				.select({ id: entries.id })
				.from(entries)
				.where(
					and(
						eq(entries.id, sourceEntryId),
						eq(entries.userId, userId),
						isNull(entries.deletedAt)
					)
				)
				.limit(1),
			db
				.select({ id: entries.id })
				.from(entries)
				.where(
					and(
						eq(entries.id, targetEntryId),
						eq(entries.userId, userId),
						isNull(entries.deletedAt)
					)
				)
				.limit(1),
		])

		if (!(source[0] && target[0])) {
			throw new ORPCError('NOT_FOUND', { message: 'Entry not found' })
		}

		const [existing] = await db
			.select({ id: entryLinks.id })
			.from(entryLinks)
			.where(
				and(
					eq(entryLinks.sourceEntryId, sourceEntryId),
					eq(entryLinks.targetEntryId, targetEntryId),
					eq(entryLinks.linkType, 'manual')
				)
			)
			.limit(1)

		if (existing) {
			return { id: existing.id, alreadyExists: true }
		}

		const id = nanoid()
		await db.insert(entryLinks).values({
			id,
			userId,
			sourceEntryId,
			targetEntryId,
			linkType: 'manual',
		})

		return { id, alreadyExists: false }
	})

const removeLink = protectedProcedure
	.input(RemoveLinkInputSchema)
	.handler(async ({ context, input }) => {
		const userId = context.session.user.id

		const result = await db
			.delete(entryLinks)
			.where(and(eq(entryLinks.id, input.linkId), eq(entryLinks.userId, userId)))
			.returning()

		return { success: result.length > 0 }
	})

const getGraphStats = protectedProcedure.handler(async ({ context }) => {
	const userId = context.session.user.id

	const [nodeCount] = await db
		.select({ value: count() })
		.from(entries)
		.where(and(eq(entries.userId, userId), isNull(entries.deletedAt)))

	const [edgeCount] = await db
		.select({ value: count() })
		.from(entryLinks)
		.where(eq(entryLinks.userId, userId))

	const linkedIds = await db
		.selectDistinct({ id: entryLinks.sourceEntryId })
		.from(entryLinks)
		.where(eq(entryLinks.userId, userId))
		.union(
			db
				.selectDistinct({ id: entryLinks.targetEntryId })
				.from(entryLinks)
				.where(eq(entryLinks.userId, userId))
		)

	const linkedIdSet = new Set(linkedIds.map((r) => r.id))
	const totalNodes = nodeCount?.value ?? 0
	const orphanCount = totalNodes - linkedIdSet.size

	const degreeRows = await db
		.select({
			entryId: sql<string>`entry_id`,
			degree: sql<number>`cnt`,
		})
		.from(
			sql`(
				SELECT source_entry_id AS entry_id, COUNT(*) AS cnt
				FROM entry_links WHERE user_id = ${userId}
				GROUP BY source_entry_id
				UNION ALL
				SELECT target_entry_id AS entry_id, COUNT(*) AS cnt
				FROM entry_links WHERE user_id = ${userId}
				GROUP BY target_entry_id
			) AS degree_counts`
		)
		.orderBy(sql`cnt DESC`)
		.limit(5)

	const topConnected = degreeRows.map((r) => ({
		entryId: r.entryId,
		degree: Number(r.degree),
	}))

	return {
		nodeCount: totalNodes,
		edgeCount: edgeCount?.value ?? 0,
		orphanCount,
		topConnected,
	}
})

export const graphRouter = {
	getGraph,
	getNeighbors,
	addManualLink,
	removeLink,
	getGraphStats,
}
