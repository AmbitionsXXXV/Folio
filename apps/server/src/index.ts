import 'dotenv/config'
import {
	type AiProvider,
	type DecryptedCredential,
	PROVIDER_CONFIGS,
} from '@folionote/ai'
import { streamTextWithCredential } from '@folionote/ai/stream-text'
import { createContext } from '@folionote/api/context'
import { appRouter } from '@folionote/api/routers/index'
import { auth } from '@folionote/auth'
import { createHonoLogger, createLogger } from '@folionote/log'
import { serve } from '@hono/node-server'
import { OpenAPIHandler } from '@orpc/openapi/fetch'
import { OpenAPIReferencePlugin } from '@orpc/openapi/plugins'
import { onError } from '@orpc/server'
import { RPCHandler } from '@orpc/server/fetch'
import { ZodToJsonSchemaConverter } from '@orpc/zod/zod4'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { streamText } from 'hono/streaming'
import { timeout } from 'hono/timeout'
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
	}>()

	const { provider, apiKey, baseUrl, model, prompt } = body

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
		const result = await streamTextWithCredential(credential, {
			prompt,
			model,
		})

		return streamText(c, async (stream) => {
			for await (const chunk of result.textStream) {
				await stream.write(chunk)
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
