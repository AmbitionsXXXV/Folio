import { tool } from 'ai'
import { fetchWebSearchResults } from '../api/tavily-api'
import { WebSearchToolInputSchema } from '../schemas'

export const webSearch = tool({
	description:
		'Search the web for current information. Use this when the user asks about recent events, needs up-to-date facts, or wants information beyond your training data.',
	strict: true,
	inputSchema: WebSearchToolInputSchema,
	execute: async ({ query, maxResults, searchDepth }, { abortSignal }) => {
		return await fetchWebSearchResults(query, maxResults, searchDepth, abortSignal)
	},
})
