import {
	type AiProvider,
	buildKnowledgeChatSystemPrompt,
	DEFAULT_KNOWLEDGE_CHAT_RAG_TOP_K,
	type DecryptedCredential,
	PROVIDER_CONFIGS,
} from '@folionote/ai'
import { createVercelAiChatModel } from '@folionote/ai/vercel-ai'
import { createContext } from '@folionote/api/context'
import { createLogger } from '@folionote/log'
import {
	streamText as aiStreamText,
	convertToModelMessages,
	createIdGenerator,
	type UIMessage,
} from 'ai'
import {
	generateChatId,
	loadChatMessages,
	saveChat,
} from '../services/ai-chat-store'
import {
	fetchNotesByIds,
	MAX_ATTACHED_NOTES,
	searchNotesForRag,
} from '../services/notes'
import type { App } from '../types'
import { convertToSupportedLanguage } from '../utils/language'

const log = createLogger({ prefix: 'ai-stream' })

const AI_PROVIDERS = ['openai', 'deepseek', 'gemini', 'claude', 'qwen'] as const

// =============================================================================
// Request/Response Types
// =============================================================================

/**
 * Request body for AI stream endpoint (AI SDK v6 aligned)
 *
 * Two modes supported:
 * 1. Full messages mode: Send all messages, server persists on completion
 * 2. Last message mode: Send only the last message + chatId, server loads history
 */
type AiStreamRequestBody = {
	/** Chat session ID for persistence. If omitted for new chat, server generates one. */
	chatId?: string
	/** Provider ID */
	provider: string
	/** API key (BYOK) */
	apiKey: string
	/** Optional base URL override */
	baseUrl?: string
	/** Optional model override */
	model?: string
	/**
	 * The user's prompt/question.
	 * Used for RAG query even when messages are provided.
	 */
	prompt: string
	/**
	 * Conversation history as UIMessage array.
	 * For bandwidth optimization, can send only the last message
	 * when chatId is provided (server loads history).
	 */
	messages?: UIMessage[]
	/** Optional: IDs of notes to attach as context */
	noteEntryIds?: string[]
	/** Optional: Number of notes to retrieve via RAG */
	ragTopK?: number
	/** Optional: Enable extended thinking/reasoning */
	enableReasoning?: boolean
}

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Prepare note context for AI streaming (RAG)
 */
async function prepareNoteContext(
	userId: string,
	prompt: string,
	noteEntryIds: string[] | undefined,
	ragTopK: number | undefined
) {
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

	return { attachedNotes, retrievedNotes }
}

/** Default reasoning budget tokens */
const DEFAULT_REASONING_BUDGET_TOKENS = 10_000

/**
 * Build provider options for extended thinking/reasoning
 *
 * Returns typed provider options for AI SDK streamText.
 * Uses `as const` assertions to satisfy SharedV3ProviderOptions type.
 */
function buildProviderOptions(provider: AiProvider, enableReasoning: boolean) {
	if (!enableReasoning) return undefined

	switch (provider) {
		case 'claude':
			return {
				anthropic: {
					thinking: {
						type: 'enabled' as const,
						budgetTokens: DEFAULT_REASONING_BUDGET_TOKENS,
					},
				},
			}
		case 'deepseek':
		case 'qwen':
			return {
				openai: {
					reasoningEffort: 'medium' as const,
				},
			}
		default:
			return undefined
	}
}

// =============================================================================
// Route Registration
// =============================================================================

/**
 * Register AI streaming routes
 *
 * Implements AI SDK v6 message persistence best practices:
 * - Server-generated message IDs via createIdGenerator
 * - Unified saveChat in onFinish callback
 * - consumeStream for disconnect resilience
 * - toUIMessageStreamResponse for proper UIMessage format
 */
export function registerAiStreamRoute(app: App) {
	// GET /api/ai/chat/:chatId - Retrieve persisted chat messages
	app.get('/api/ai/chat/:chatId', async (c) => {
		const detectedLanguage = c.get('language')
		const locale = convertToSupportedLanguage(detectedLanguage)
		const context = await createContext({ context: c, locale })

		if (!context.session?.user) {
			return c.json({ error: 'Unauthorized' }, 401)
		}

		const chatId = c.req.param('chatId')
		if (!chatId) {
			return c.json({ error: 'Missing chatId' }, 400)
		}

		const userId = context.session.user.id
		const messages = loadChatMessages(userId, chatId)

		return c.json({
			chatId,
			messages,
		})
	})

	// POST /api/ai/chat - Create a new chat session
	app.post('/api/ai/chat', async (c) => {
		const detectedLanguage = c.get('language')
		const locale = convertToSupportedLanguage(detectedLanguage)
		const context = await createContext({ context: c, locale })

		if (!context.session?.user) {
			return c.json({ error: 'Unauthorized' }, 401)
		}

		const chatId = generateChatId()
		return c.json({ chatId })
	})

	// POST /api/ai/stream - Stream AI response (AI SDK v6 aligned)
	app.post('/api/ai/stream', async (c) => {
		const detectedLanguage = c.get('language')
		const locale = convertToSupportedLanguage(detectedLanguage)

		const context = await createContext({ context: c, locale })

		if (!context.session?.user) {
			return c.json({ error: 'Unauthorized' }, 401)
		}

		const body = await c.req.json<AiStreamRequestBody>()

		const {
			chatId: requestChatId,
			provider,
			apiKey,
			baseUrl,
			model,
			prompt,
			messages: requestMessages,
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

			// Determine or generate chatId
			const chatId = requestChatId || generateChatId()

			// Load existing messages if chatId provided but no messages sent
			// (optimization: client sends only last message)
			let messages: UIMessage[]
			if (requestMessages && requestMessages.length > 0) {
				messages = requestMessages
			} else {
				// Load from storage and append user message
				const storedMessages = loadChatMessages(userId, chatId)
				const userMessage: UIMessage = {
					id: `user-${Date.now()}`,
					role: 'user',
					parts: [{ type: 'text', text: prompt }],
				}
				messages = [...storedMessages, userMessage]
			}

			// Prepare RAG context
			const { attachedNotes, retrievedNotes } = await prepareNoteContext(
				userId,
				prompt,
				noteEntryIds,
				ragTopK
			)

			const { systemPrompt } = buildKnowledgeChatSystemPrompt({
				attachedNotes,
				retrievedNotes,
			})

			// Create the AI model
			const aiModel = createVercelAiChatModel(credential, { model })

			// Convert UIMessages to model messages
			const modelMessages = await convertToModelMessages(messages)

			// Build provider options for reasoning
			const providerOptions = buildProviderOptions(
				provider as AiProvider,
				enableReasoning ?? false
			)

			// Stream text using AI SDK
			const result = aiStreamText({
				model: aiModel,
				system: systemPrompt,
				messages: modelMessages,
				// Provider options are typed per-provider; cast to satisfy SDK's strict union type
				providerOptions: providerOptions as Parameters<
					typeof aiStreamText
				>[0]['providerOptions'],
			})

			// Consume stream to ensure completion even on disconnect
			// This ensures onFinish is called and messages are saved
			result.consumeStream()

			// Return AI SDK UI message stream response
			// This handles proper UIMessage formatting automatically
			return result.toUIMessageStreamResponse({
				// Pass original messages to prevent duplication
				originalMessages: messages,
				// Server-generated message IDs for persistence consistency
				generateMessageId: createIdGenerator({
					prefix: 'msg',
					size: 16,
				}),
				// Unified save point: called when stream completes
				onFinish: ({ messages: finalMessages }) => {
					// Save complete conversation to storage
					saveChat({
						userId,
						chatId,
						messages: finalMessages,
					})

					// Log completion (usage is available via result.usage promise if needed)
					log.debug(`Chat ${chatId} completed: ${finalMessages.length} messages`)
				},
				// Send chatId in response headers for client to track
				headers: {
					'X-Chat-Id': chatId,
				},
			})
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			log.error('Stream error:', error)
			return c.json({ error: errorMessage }, 500)
		}
	})
}
