/**
 * Topology Context Builder
 *
 * Builds structured topological context from the entry_links graph
 * for injection into AI Knowledge Chat prompts.
 *
 * Traverses the knowledge graph around specified entries,
 * producing a formatted text block describing neighbors,
 * relationships, and summaries within a token budget.
 */

import { db, entries, entryLinks, entryTags, tags } from '@folionote/db'
import { and, eq, inArray, isNull, or } from 'drizzle-orm'

const CHARS_PER_TOKEN = 4
const MAX_TOPOLOGY_CONTEXT_TOKENS = 2000
const MAX_TOPOLOGY_CONTEXT_CHARS = MAX_TOPOLOGY_CONTEXT_TOKENS * CHARS_PER_TOKEN
const MAX_NOTE_SUMMARY_CHARS = 300

type TopologyNeighbor = {
	id: string
	title: string
	summary: string
	linkType: string
	direction: 'outgoing' | 'incoming'
}

type TopologyContextResult = {
	contextText: string
	neighborCount: number
}

async function traverseGraph(
	userId: string,
	startIds: string[],
	depth: number
): Promise<Map<string, TopologyNeighbor>> {
	const allNeighbors = new Map<string, TopologyNeighbor>()
	let frontier = [...new Set(startIds)]
	const visited = new Set(startIds)

	for (let hop = 0; hop < depth && frontier.length > 0; hop++) {
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
			const isOutgoing = frontier.includes(link.sourceEntryId)
			const neighborId = isOutgoing ? link.targetEntryId : link.sourceEntryId

			if (visited.has(neighborId)) continue
			visited.add(neighborId)
			nextFrontier.add(neighborId)

			if (!allNeighbors.has(neighborId)) {
				allNeighbors.set(neighborId, {
					id: neighborId,
					title: '',
					summary: '',
					linkType: link.linkType,
					direction: isOutgoing ? 'outgoing' : 'incoming',
				})
			}
		}

		frontier = [...nextFrontier]
	}

	return allNeighbors
}

async function hydrateNeighbors(
	userId: string,
	neighbors: Map<string, TopologyNeighbor>
): Promise<void> {
	const neighborIds = [...neighbors.keys()]
	if (neighborIds.length === 0) return

	const neighborEntries = await db
		.select({
			id: entries.id,
			title: entries.title,
			contentText: entries.contentText,
		})
		.from(entries)
		.where(
			and(
				eq(entries.userId, userId),
				isNull(entries.deletedAt),
				inArray(entries.id, neighborIds)
			)
		)

	for (const entry of neighborEntries) {
		const neighbor = neighbors.get(entry.id)
		if (!neighbor) continue
		neighbor.title = entry.title
		neighbor.summary = truncateText(entry.contentText ?? '', MAX_NOTE_SUMMARY_CHARS)
	}
}

function formatNeighborsContext(
	neighbors: Map<string, TopologyNeighbor>,
	neighborTags: Map<string, string[]>
): string {
	const header =
		'## Topology Context (Knowledge Graph Neighbors)\n\n' +
		"The following entries are connected to the mentioned notes in the user's knowledge graph.\n" +
		'Use these connections for deeper reasoning and multi-hop queries.\n\n'

	let contextText = header
	let usedChars = header.length

	for (const neighbor of neighbors.values()) {
		if (!neighbor.title) continue

		const block = formatNeighborBlock(neighbor, neighborTags.get(neighbor.id) ?? [])
		if (usedChars + block.length > MAX_TOPOLOGY_CONTEXT_CHARS) break

		contextText += block
		usedChars += block.length
	}

	return contextText
}

function formatNeighborBlock(
	neighbor: TopologyNeighbor,
	tagNames: string[]
): string {
	const dirLabel =
		neighbor.direction === 'outgoing' ? 'references →' : '← referenced by'
	const tagLine = tagNames.length > 0 ? ` [tags: ${tagNames.join(', ')}]` : ''

	return [
		`### ${neighbor.title}`,
		`- Relation: ${neighbor.linkType} (${dirLabel})${tagLine}`,
		neighbor.summary ? `- Summary: ${neighbor.summary}` : '',
		'',
	]
		.filter(Boolean)
		.join('\n')
}

/**
 * Build topological context for given entry IDs.
 *
 * For each entry, fetches 1-hop neighbors from entry_links,
 * formats them into a structured text block that the AI model
 * can use for multi-hop reasoning.
 */
export async function buildTopologyContext(
	userId: string,
	entryIds: string[],
	depth = 1
): Promise<TopologyContextResult> {
	if (entryIds.length === 0) {
		return { contextText: '', neighborCount: 0 }
	}

	const allNeighbors = await traverseGraph(userId, entryIds, depth)
	if (allNeighbors.size === 0) {
		return { contextText: '', neighborCount: 0 }
	}

	await hydrateNeighbors(userId, allNeighbors)

	const neighborIds = [...allNeighbors.keys()]
	const neighborTags = await fetchNeighborTags(neighborIds)
	const contextText = formatNeighborsContext(allNeighbors, neighborTags)

	return { contextText, neighborCount: allNeighbors.size }
}

async function fetchNeighborTags(
	entryIds: string[]
): Promise<Map<string, string[]>> {
	if (entryIds.length === 0) return new Map()

	const rows = await db
		.select({
			entryId: entryTags.entryId,
			tagName: tags.name,
		})
		.from(entryTags)
		.innerJoin(tags, eq(entryTags.tagId, tags.id))
		.where(inArray(entryTags.entryId, entryIds))

	const map = new Map<string, string[]>()
	for (const row of rows) {
		const existing = map.get(row.entryId) ?? []
		existing.push(row.tagName)
		map.set(row.entryId, existing)
	}
	return map
}

function truncateText(text: string, maxChars: number): string {
	if (text.length <= maxChars) return text
	return `${text.slice(0, maxChars - 3)}...`
}
