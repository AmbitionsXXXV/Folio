import {
	type AiProvider,
	buildKnowledgeChatPrompt,
	DEFAULT_KNOWLEDGE_CHAT_RAG_TOP_K,
	type DecryptedCredential,
	PROVIDER_CONFIGS,
} from '@folionote/ai'
import { streamTextWithCredential } from '@folionote/ai/stream-text'
import { createContext } from '@folionote/api/context'
import { createLogger } from '@folionote/log'
import { streamText } from 'hono/streaming'
import {
	fetchNotesByIds,
	MAX_ATTACHED_NOTES,
	searchNotesForRag,
} from '../services/notes'
import type { App } from '../types'
import { calculateCostFromUsage } from '../utils/cost'
import { convertToSupportedLanguage } from '../utils/language'

const log = createLogger({ prefix: 'ai-stream' })

const AI_PROVIDERS = ['openai', 'deepseek', 'gemini', 'claude', 'qwen'] as const

/** Message type for conversation history */
type ChatMessageInput = {
	role: 'user' | 'assistant' | 'system'
	content: string
}

/** Request body for AI stream endpoint */
type AiStreamRequestBody = {
	provider: string
	apiKey: string
	baseUrl?: string
	model?: string
	prompt: string
	messages?: ChatMessageInput[]
	noteEntryIds?: string[]
	ragTopK?: number
	enableReasoning?: boolean
}

type StreamResult = ReturnType<typeof streamTextWithCredential>

/** Stream writer interface compatible with Hono's StreamingApi */
type StreamWriter = { write: (data: string) => Promise<unknown> }

/**
 * Handle streaming with reasoning enabled
 */
async function streamWithReasoning(stream: StreamWriter, result: StreamResult) {
	const fullStream = result.fullStreamResult.fullStream
	for await (const part of fullStream) {
		if (part.type === 'reasoning-delta') {
			await stream.write(`\x1E__THINKING__\x1E${part.text}`)
		} else if (part.type === 'text-delta') {
			await stream.write(part.text)
		}
	}
}

/**
 * Handle simple text streaming
 */
async function streamText_(stream: StreamWriter, result: StreamResult) {
	for await (const chunk of result.textStream) {
		await stream.write(chunk)
	}
}

/**
 * Write usage information to stream
 */
async function writeUsageInfo(stream: StreamWriter, result: StreamResult) {
	try {
		const usage = await result.fullStreamResult.usage
		if (usage) {
			const costUSD = calculateCostFromUsage(result.provider, result.modelId, {
				inputTokens: usage.inputTokens,
				outputTokens: usage.outputTokens,
				totalTokens: usage.totalTokens,
			})

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
}

/**
 * Register AI streaming route
 */
export function registerAiStreamRoute(app: App) {
	app.post('/api/ai/stream', async (c) => {
		const detectedLanguage = c.get('language')
		const locale = convertToSupportedLanguage(detectedLanguage)

		const context = await createContext({ context: c, locale })

		if (!context.session?.user) {
			return c.json({ error: 'Unauthorized' }, 401)
		}

		const body = await c.req.json<AiStreamRequestBody>()

		const {
			provider,
			apiKey,
			baseUrl,
			model,
			prompt,
			messages,
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

			const sanitizedNoteIds = (noteEntryIds ?? [])
				.filter((id) => typeof id === 'string' && id.length > 0)
				.slice(0, MAX_ATTACHED_NOTES)

			const uniqueNoteIds = [...new Set(sanitizedNoteIds)]
			const attachedNotes = await fetchNotesByIds(userId, uniqueNoteIds)

			const effectiveRagTopK = ragTopK ?? DEFAULT_KNOWLEDGE_CHAT_RAG_TOP_K
			const retrievedNotes = await searchNotesForRag(
				userId,
				prompt,
				uniqueNoteIds,
				effectiveRagTopK
			)

			const { prompt: systemPromptWithContext } = buildKnowledgeChatPrompt({
				userPrompt: prompt,
				attachedNotes,
				retrievedNotes,
			})

			const hasConversationHistory = messages && messages.length > 0

			const result = hasConversationHistory
				? streamTextWithCredential(credential, {
						system: systemPromptWithContext,
						messages: messages.map((m) => ({
							role: m.role,
							content: m.content,
						})),
						model,
						enableReasoning,
					})
				: streamTextWithCredential(credential, {
						prompt: systemPromptWithContext,
						model,
						enableReasoning,
					})

			return streamText(c, async (stream) => {
				if (enableReasoning) {
					await streamWithReasoning(stream, result)
				} else {
					await streamText_(stream, result)
				}
				await writeUsageInfo(stream, result)
			})
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			log.error('Stream error:', error)
			return c.json({ error: errorMessage }, 500)
		}
	})
}
