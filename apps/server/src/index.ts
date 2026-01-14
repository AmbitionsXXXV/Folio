import 'dotenv/config'
import {
	type AiProvider,
	buildKnowledgeChatPrompt,
	DEFAULT_KNOWLEDGE_CHAT_RAG_TOP_K,
	type DecryptedCredential,
	type NoteContext,
	PROVIDER_CONFIGS,
} from '@folionote/ai'
import { streamTextWithCredential } from '@folionote/ai/stream-text'
import { createContext } from '@folionote/api/context'
import { appRouter } from '@folionote/api/routers/index'
import { auth } from '@folionote/auth'
import { db, entries } from '@folionote/db'
import { createHonoLogger, createLogger } from '@folionote/log'
import { serve } from '@hono/node-server'
import { OpenAPIHandler } from '@orpc/openapi/fetch'
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins'
import { onError } from '@orpc/server'
import { RPCHandler } from '@orpc/server/fetch'
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4'
import { and, desc, eq, inArray, isNull, notInArray, sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { streamText } from 'hono/streaming'
import { timeout } from 'hono/timeout'
import { costFromUsage } from 'tokenlens'
import { initI18n } from './i18n'

await initI18n()

const log = createLogger({ prefix: 'server' })

const app = new Hono()

const corsOrigins = process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()) || [
	'http://localhost:3001',
]
log.info('CORS_ORIGIN', corsOrigins)

app.use(logger(createHonoLogger()))
app.use(
	'/*',
	cors({
		origin: (origin) => {
			// 允许配置的 origins
			if (corsOrigins.includes(origin)) {
				return origin
			}
			// 开发环境允许 localhost
			if (origin.startsWith('http://localhost:')) {
				return origin
			}
			return null
		},
		allowMethods: ['GET', 'POST', 'OPTIONS'],
		allowHeaders: ['Content-Type', 'Authorization', 'X-Locale', 'Accept-Language'],
		credentials: true,
	}),
	timeout(30_000)
)

app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c.req.raw))

export const apiHandler = new OpenAPIHandler(appRouter, {
	plugins: [
		new OpenAPIReferencePlugin({
			schemaConverters: [new ZodToJsonSchemaConverter()],
		}),
	],
	interceptors: [
		onError((error) => {
			log.error('API error:', error)
		}),
	],
})

export const rpcHandler = new RPCHandler(appRouter, {
	interceptors: [
		onError((error) => {
			log.error('RPC error:', error)
		}),
	],
})

app.use('/*', async (c, next) => {
	const context = await createContext({ context: c })

	c.header('Vary', 'Accept-Language, X-Locale')

	const rpcResult = await rpcHandler.handle(c.req.raw, {
		prefix: '/rpc',
		context,
	})

	if (rpcResult.matched) {
		return c.newResponse(rpcResult.response.body, rpcResult.response)
	}

	const apiResult = await apiHandler.handle(c.req.raw, {
		prefix: '/api-reference',
		context,
	})

	if (apiResult.matched) {
		return c.newResponse(apiResult.response.body, apiResult.response)
	}

	await next()
})

app.get('/', (c) => c.text('OK'))
app.get('/health', (c) =>
	c.json({ status: 'ok', timestamp: new Date().toISOString() })
)

// Streaming text generation endpoint
// This bypasses oRPC for true streaming support
const AI_PROVIDERS = ['openai', 'deepseek', 'gemini', 'claude', 'qwen'] as const

/** Maximum number of attached notes allowed */
const MAX_ATTACHED_NOTES = 10

/** Regex for splitting query into search terms */
const WHITESPACE_REGEX = /\s+/

/**
 * Fetch notes by IDs for the given user (Library only, not deleted)
 */
async function fetchNotesByIds(
	userId: string,
	noteIds: string[]
): Promise<NoteContext[]> {
	if (noteIds.length === 0) return []

	const notes = await db
		.select({
			id: entries.id,
			title: entries.title,
			contentText: entries.contentText,
		})
		.from(entries)
		.where(
			and(
				eq(entries.userId, userId),
				inArray(entries.id, noteIds),
				isNull(entries.deletedAt),
				eq(entries.isInbox, false) // Library only
			)
		)

	return notes.map((n) => ({
		id: n.id,
		title: n.title,
		contentText: n.contentText ?? '',
	}))
}

/**
 * Perform FTS search for RAG retrieval
 * Falls back to ILIKE if FTS returns no results
 */
async function searchNotesForRag(
	userId: string,
	query: string,
	excludeIds: string[],
	limit: number
): Promise<NoteContext[]> {
	const searchTerms = query
		.trim()
		.split(WHITESPACE_REGEX)
		.filter((term) => term.length > 0)
		.map((term) => `${term}:*`)
		.join(' & ')

	if (!searchTerms) return []

	const baseConditions = [
		eq(entries.userId, userId),
		isNull(entries.deletedAt),
		eq(entries.isInbox, false), // Library only
	]

	if (excludeIds.length > 0) {
		baseConditions.push(notInArray(entries.id, excludeIds))
	}

	// Try FTS first
	try {
		const ftsResults = await db
			.select({
				id: entries.id,
				title: entries.title,
				contentText: entries.contentText,
			})
			.from(entries)
			.where(
				and(
					...baseConditions,
					sql`to_tsvector('simple', coalesce(${entries.title}, '') || ' ' || coalesce(${entries.contentText}, '')) @@ to_tsquery('simple', ${searchTerms})`
				)
			)
			.orderBy(desc(entries.updatedAt))
			.limit(limit)

		if (ftsResults.length > 0) {
			return ftsResults.map((n) => ({
				id: n.id,
				title: n.title,
				contentText: n.contentText ?? '',
			}))
		}
	} catch (error) {
		log.warn('FTS search failed, falling back to ILIKE:', error)
	}

	// Fallback to ILIKE
	const searchPattern = `%${query}%`
	const ilikeResults = await db
		.select({
			id: entries.id,
			title: entries.title,
			contentText: entries.contentText,
		})
		.from(entries)
		.where(
			and(
				...baseConditions,
				sql`(${entries.title} ILIKE ${searchPattern} OR ${entries.contentText} ILIKE ${searchPattern})`
			)
		)
		.orderBy(desc(entries.updatedAt))
		.limit(limit)

	return ilikeResults.map((n) => ({
		id: n.id,
		title: n.title,
		contentText: n.contentText ?? '',
	}))
}

/**
 * Calculate cost using tokenlens from usage data
 */
function calculateCostFromUsage(
	provider: string,
	modelId: string,
	usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number }
): number | undefined {
	try {
		const tokenlensModelId = `${provider}/${modelId}`
		return costFromUsage({
			id: tokenlensModelId,
			usage: {
				promptTokens: usage.inputTokens,
				completionTokens: usage.outputTokens,
				totalTokens: usage.totalTokens,
			},
		})
	} catch {
		return undefined
	}
}

app.post('/api/ai/stream', async (c) => {
	const context = await createContext({ context: c })

	if (!context.session?.user) {
		return c.json({ error: 'Unauthorized' }, 401)
	}

	const body = await c.req.json<{
		provider: string
		apiKey: string
		baseUrl?: string
		model?: string
		prompt: string
		/** Optional: IDs of notes to attach as context */
		noteEntryIds?: string[]
		/** Optional: Number of notes to retrieve via RAG */
		ragTopK?: number
		/** Optional: Enable extended thinking/reasoning */
		enableReasoning?: boolean
	}>()

	const {
		provider,
		apiKey,
		baseUrl,
		model,
		prompt,
		noteEntryIds,
		ragTopK,
		enableReasoning,
	} = body

	if (!(provider && apiKey && prompt)) {
		return c.json({ error: 'Missing required fields' }, 400)
	}

	if (!AI_PROVIDERS.includes(provider as (typeof AI_PROVIDERS)[number])) {
		return c.json({ error: `Unsupported provider: ${provider}` }, 400)
	}

	const providerConfig = PROVIDER_CONFIGS[provider as AiProvider]
	const credential: DecryptedCredential = {
		provider: provider as AiProvider,
		apiKey,
		baseUrl: baseUrl?.trim() || providerConfig.defaultBaseUrl,
		model,
	}

	try {
		const userId = context.session.user.id

		// Fetch attached notes if provided
		const sanitizedNoteIds = (noteEntryIds ?? [])
			.filter((id) => typeof id === 'string' && id.length > 0)
			.slice(0, MAX_ATTACHED_NOTES)

		const uniqueNoteIds = [...new Set(sanitizedNoteIds)]
		const attachedNotes = await fetchNotesByIds(userId, uniqueNoteIds)

		// Perform RAG search
		const effectiveRagTopK = ragTopK ?? DEFAULT_KNOWLEDGE_CHAT_RAG_TOP_K
		const retrievedNotes = await searchNotesForRag(
			userId,
			prompt,
			uniqueNoteIds,
			effectiveRagTopK
		)

		// Build the knowledge chat prompt
		const { prompt: assembledPrompt } = buildKnowledgeChatPrompt({
			userPrompt: prompt,
			attachedNotes,
			retrievedNotes,
		})

		const result = await streamTextWithCredential(credential, {
			prompt: assembledPrompt,
			model,
			enableReasoning,
		})

		// Stream response with SSE format to support thinking content and usage
		return streamText(c, async (stream) => {
			// If reasoning is enabled, we need to use fullStreamResult to get thinking
			if (enableReasoning) {
				// Use the full stream to capture reasoning parts
				const fullStream = result.fullStreamResult.fullStream
				for await (const part of fullStream) {
					if (part.type === 'reasoning-delta') {
						// Send thinking content with a special prefix
						await stream.write(`\x1E__THINKING__\x1E${part.text}`)
					} else if (part.type === 'text-delta') {
						// Send regular text
						await stream.write(part.text)
					}
				}
			} else {
				// Simple text stream without reasoning
				for await (const chunk of result.textStream) {
					await stream.write(chunk)
				}
			}

			// Get usage information after stream completes
			try {
				const usage = await result.fullStreamResult.usage
				if (usage) {
					const costUSD = calculateCostFromUsage(result.provider, result.modelId, {
						inputTokens: usage.inputTokens,
						outputTokens: usage.outputTokens,
						totalTokens: usage.totalTokens,
					})

					// Send usage info with special marker
					await stream.write(
						`\x1E__USAGE__\x1E${JSON.stringify({
							inputTokens: usage.inputTokens,
							outputTokens: usage.outputTokens,
							totalTokens: usage.totalTokens,
							reasoningTokens: usage.outputTokenDetails?.reasoningTokens,
							costUSD,
						})}`
					)
				}
			} catch (usageError) {
				log.debug('Failed to get usage info:', usageError)
			}
		})
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : 'Unknown error'
		log.error('Stream error:', error)
		return c.json({ error: errorMessage }, 500)
	}
})

const port = Number(process.env.PORT) || 3000

log.info(`Server is running on http://localhost:${port}`)

serve({
	fetch: app.fetch,
	port,
})

export default app
