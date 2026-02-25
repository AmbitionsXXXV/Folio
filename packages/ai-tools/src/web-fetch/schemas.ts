import { z } from 'zod'
import { FETCH_FORMATS } from './types'

export const WebFetchToolInputSchema = z.object({
	url: z.string().describe('The URL to fetch content from'),
	format: z
		.enum(FETCH_FORMATS)
		.default('markdown')
		.describe(
			'The format to return the content in (text, markdown, or html). Defaults to markdown.'
		),
	timeout: z
		.number()
		.int()
		.min(1)
		.max(120)
		.optional()
		.describe('Timeout in seconds (default: 30, max: 120)'),
})
