/**
 * TOC (Table of Contents) utilities for extracting headings from ProseMirror JSON
 * and generating stable anchor IDs.
 *
 * Returns TOCItemType format compatible with fumadocs-core/toc.
 */

import type { TOCItemType } from 'fumadocs-core/toc'

/**
 * Re-export TOCItemType from fumadocs-core for convenience
 */
export type { TOCItemType }

/**
 * ProseMirror JSON node type (simplified for heading extraction)
 */
type ProseMirrorNode = {
	type: string
	attrs?: Record<string, unknown>
	content?: ProseMirrorNode[]
	text?: string
}

/**
 * Slugify a heading text to create a URL-friendly anchor ID.
 * Handles Unicode characters and normalizes the string.
 *
 * @param text - The heading text to slugify
 * @returns A URL-friendly slug
 */
export function slugifyHeading(text: string): string {
	return (
		text
			.toLowerCase()
			.trim()
			// Replace spaces and underscores with hyphens
			.replace(/[\s_]+/g, '-')
			// Remove characters that are not alphanumeric, hyphens, or Unicode letters
			.replace(/[^\p{L}\p{N}-]/gu, '')
			// Remove consecutive hyphens
			.replace(/-+/g, '-')
			// Remove leading/trailing hyphens
			.replace(/^-|-$/g, '')
	)
}

/**
 * Extract plain text from a ProseMirror node recursively.
 *
 * @param node - The ProseMirror node to extract text from
 * @returns The concatenated plain text content
 */
function extractTextFromNode(node: ProseMirrorNode): string {
	if (node.text) {
		return node.text
	}

	if (node.content) {
		return node.content.map(extractTextFromNode).join('')
	}

	return ''
}

/**
 * Internal type for extracted items before deduplication
 */
type ExtractedItem = {
	slug: string
	title: string
	depth: number
}

/**
 * Extract TOC items from ProseMirror JSON content.
 * Only extracts H1-H3 headings.
 *
 * @param contentJson - The ProseMirror JSON string or object
 * @returns Array of extracted items (not yet deduplicated)
 */
function extractItemsFromContentJson(
	contentJson: string | object | null | undefined
): ExtractedItem[] {
	if (!contentJson) {
		return []
	}

	let doc: ProseMirrorNode

	try {
		doc =
			typeof contentJson === 'string'
				? (JSON.parse(contentJson) as ProseMirrorNode)
				: (contentJson as ProseMirrorNode)
	} catch {
		return []
	}

	if (!(doc.content && Array.isArray(doc.content))) {
		return []
	}

	const items: ExtractedItem[] = []

	for (const node of doc.content) {
		if (node.type === 'heading') {
			const depth = (node.attrs?.level as number) ?? 1

			// Only include H1-H3
			if (depth >= 1 && depth <= 3) {
				const title = extractTextFromNode(node).trim()

				if (title) {
					const slug = slugifyHeading(title)
					items.push({
						slug,
						title,
						depth,
					})
				}
			}
		}
	}

	return items
}

/**
 * Make heading slugs unique by appending numeric suffixes for duplicates.
 *
 * @param items - Array of extracted items (may have duplicate slugs)
 * @returns Array of TOCItemType with unique URLs
 */
function makeUniqueItems(items: ExtractedItem[]): TOCItemType[] {
	const slugCounts = new Map<string, number>()
	const result: TOCItemType[] = []

	for (const item of items) {
		const baseSlug = item.slug || 'heading'
		const count = slugCounts.get(baseSlug) ?? 0
		slugCounts.set(baseSlug, count + 1)

		const uniqueSlug = count === 0 ? baseSlug : `${baseSlug}-${count}`

		result.push({
			title: item.title,
			url: `#${uniqueSlug}`,
			depth: item.depth,
		})
	}

	return result
}

/**
 * Parse content JSON and return TOC items in fumadocs TOCItemType format.
 * This is the main function to use for generating TOC from ProseMirror content.
 *
 * @param contentJson - The ProseMirror JSON string or object
 * @returns Array of TOCItemType compatible with fumadocs-core/toc
 */
export function parseTocFromContent(
	contentJson: string | object | null | undefined
): TOCItemType[] {
	const items = extractItemsFromContentJson(contentJson)
	return makeUniqueItems(items)
}

/**
 * Assign IDs to heading elements in the DOM based on TOC items.
 * This should be called after the editor content is rendered.
 *
 * IMPORTANT: This function must be called BEFORE the TOC component mounts,
 * or the IntersectionObserver in fumadocs won't find the heading elements.
 *
 * @param container - Reference to the container element holding the editor content
 * @param items - Array of TOCItemType items
 * @returns true if IDs were assigned successfully
 */
export function assignHeadingIds(
	container: HTMLElement | null,
	items: TOCItemType[]
): boolean {
	if (!container || items.length === 0) {
		return false
	}

	const headings = container.querySelectorAll('h1, h2, h3')
	const itemsCopy = [...items]
	let assignedCount = 0

	for (const heading of headings) {
		const text = heading.textContent?.trim() ?? ''
		const depth = Number.parseInt(heading.tagName.slice(1), 10)

		// Find matching item by title and depth
		const matchIndex = itemsCopy.findIndex(
			(item) => item.title === text && item.depth === depth
		)

		if (matchIndex !== -1) {
			const item = itemsCopy[matchIndex]
			if (!item) continue
			// Extract ID from URL (remove leading #)
			const newId = item.url.slice(1)
			// Only update if ID is different to avoid unnecessary DOM mutations
			if (heading.id !== newId) {
				heading.id = newId
			}
			assignedCount++
			// Remove from copy to handle duplicates correctly
			itemsCopy.splice(matchIndex, 1)
		}
	}

	return assignedCount > 0
}

/**
 * Hook helper: Synchronously assign heading IDs.
 * Use this in useLayoutEffect to ensure IDs are set before paint.
 *
 * @param container - Reference to the container element
 * @param items - Array of TOCItemType items
 */
export function syncAssignHeadingIds(
	container: HTMLElement | null,
	items: TOCItemType[]
): void {
	assignHeadingIds(container, items)
}
