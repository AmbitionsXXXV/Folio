import type { SlashCommandItem } from '../types'

/**
 * Filter commands by query string
 * Matches against title, description, and keywords
 */
export function filterCommands(
	items: SlashCommandItem[],
	query: string
): SlashCommandItem[] {
	const normalizedQuery = query.toLowerCase().trim()

	if (!normalizedQuery) {
		return items
	}

	return items.filter((item) => {
		const titleMatch = item.title.toLowerCase().includes(normalizedQuery)
		const descriptionMatch = item.description.toLowerCase().includes(normalizedQuery)
		const keywordMatch = item.keywords?.some((keyword) =>
			keyword.toLowerCase().includes(normalizedQuery)
		)

		return titleMatch || descriptionMatch || keywordMatch
	})
}
