import {
	AI_PROVIDERS,
	type AiProvider,
	buildKnowledgeChatSystemPrompt,
	DEFAULT_KNOWLEDGE_CHAT_RAG_TOP_K,
	type DecryptedCredential,
	type NoteContext,
	PROVIDER_CONFIGS,
	providerSupports,
} from '@folionote/ai'
import {
	createVercelAiChatModel,
	createVercelAiEmbeddingModel,
	createVercelAiImageModel,
} from '@folionote/ai/vercel-ai'
import { createImageGenerationTool } from '@folionote/ai-tools/image-generation/tools'
import type { NoteToolContext } from '@folionote/ai-tools/note/types'
import { isTavilyConfigured } from '@folionote/ai-tools/web-search/api'
import { createContext } from '@folionote/api/context'
import { createLogger } from '@folionote/log'
import {
	generateText as aiGenerateText,
	streamText as aiStreamText,
	convertToModelMessages,
	createIdGenerator,
	generateImage,
	type ModelMessage,
	type UIMessage,
} from 'ai'
import type { Context as HonoContext } from 'hono'
import {
	createChat,
	deleteChat,
	deleteEmptyChat,
	generateChatId,
	listUserChats,
	loadChat,
	loadChatMessages,
	saveChat,
	touchChat,
} from '../services/ai-chat-store'
import { aiTools } from '../services/ai-tools'
import {
	ensureAttachmentImageCaption,
	ensureEntryImageCaptions,
} from '../services/image-captioning'
import {
	fetchNotesByIds,
	MAX_ATTACHED_NOTES,
	searchNotesForRag,
} from '../services/notes'
import { ragRetrieve } from '../services/rag'
import { buildTopologyContext } from '../services/topology-context'
import type { App, AppVariables } from '../types'
import { calculateCostFromUsage } from '../utils/cost'
import { convertToSupportedLanguage } from '../utils/language'

const log = createLogger({ prefix: 'ai-stream' })

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
	 * May be empty during tool-calling follow-ups or regeneration.
	 */
	prompt?: string
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
	/** Optional: Enable web search tool */
	enableWebSearch?: boolean
	/** Optional: Enable image generation tool */
	enableImageGeneration?: boolean
}

type AiCompactRequestBody = {
	chatId: string
	provider: string
	apiKey: string
	baseUrl?: string
	model?: string
	messages?: UIMessage[]
	keepRecentCount?: number
	tokensToCompact?: number
}

type CaptionImageRequestBody = {
	attachmentId: string
	provider?: string
	apiKey?: string
	baseUrl?: string
	model?: string
	force?: boolean
}

type InternalCaptionImageRequestBody = {
	userId: string
	attachmentId: string
	model?: string
	force?: boolean
}

// =============================================================================
// Helper Functions
// =============================================================================

type AuthenticatedUser = { userId: string; locale: string }

async function getAuthenticatedUser(
	c: HonoContext<{ Variables: AppVariables }>
): Promise<AuthenticatedUser | null> {
	const locale = convertToSupportedLanguage(c.get('language'))
	const ctx = await createContext({ context: c, locale })
	if (!ctx.session?.user) return null
	return { userId: ctx.session.user.id, locale }
}

function isValidProvider(provider: string): provider is AiProvider {
	return AI_PROVIDERS.includes(provider as (typeof AI_PROVIDERS)[number])
}

function buildCredential(
	provider: AiProvider,
	apiKey: string,
	baseUrl?: string,
	model?: string
): DecryptedCredential {
	const providerConfig = PROVIDER_CONFIGS[provider]
	return {
		provider,
		apiKey,
		baseUrl: baseUrl?.trim() || providerConfig.defaultBaseUrl,
		model,
	}
}

function getLocalDateString(date: Date): string {
	const y = date.getFullYear()
	const m = String(date.getMonth() + 1).padStart(2, '0')
	const d = String(date.getDate()).padStart(2, '0')
	return `${y}-${m}-${d}`
}

/**
 * Extract text from the last user message in a conversation for RAG query.
 */
function extractLastUserText(messages: UIMessage[]): string {
	for (let i = messages.length - 1; i >= 0; i--) {
		const msg = messages[i]
		if (msg?.role !== 'user') continue
		const textParts = (msg.parts ?? []).filter(
			(p): p is { type: 'text'; text: string } => p.type === 'text'
		)
		const text = textParts.map((p) => p.text).join('')
		if (text.length > 0) return text
	}
	return ''
}

const MAX_NOTE_IMAGES_FOR_VISION = 5
const MAX_IMAGE_DESCRIPTION_CHARS = 280

function truncateText(text: string, maxChars: number): string {
	if (text.length <= maxChars) return text
	return `${text.slice(0, maxChars - 3)}...`
}

function buildVisionContextMessage(
	notes: Array<{ title: string; images?: NoteContext['images'] }>
): ModelMessage | undefined {
	const content: Array<
		| { type: 'text'; text: string }
		| { type: 'image'; image: URL; mediaType?: string }
	> = [
		{
			type: 'text',
			text: [
				'Reference images from the user notes are attached below.',
				'Use them as supporting context when answering the user question.',
				'If an image is irrelevant, ignore it.',
			].join('\n'),
		},
	]

	let imageCount = 0
	for (const note of notes) {
		if (!note.images || note.images.length === 0) continue
		for (const image of note.images) {
			if (imageCount >= MAX_NOTE_IMAGES_FOR_VISION) break
			try {
				const imageUrl = new URL(image.url)
				const description =
					image.description?.trim() ?? 'No generated description available.'
				content.push({
					type: 'text',
					text: `Note: ${note.title}\nImage summary: ${truncateText(description, MAX_IMAGE_DESCRIPTION_CHARS)}`,
				})
				content.push({
					type: 'image',
					image: imageUrl,
					mediaType: image.mimeType,
				})
				imageCount += 1
			} catch (error) {
				log.warn(`Invalid image URL skipped: ${image.url}`, error)
			}
		}
		if (imageCount >= MAX_NOTE_IMAGES_FOR_VISION) break
	}

	if (imageCount === 0) {
		return undefined
	}

	return {
		role: 'user',
		content,
	}
}

async function resolveStreamMessages(input: {
	userId: string
	chatId: string
	prompt?: string
	requestMessages?: UIMessage[]
}): Promise<UIMessage[]> {
	if (input.requestMessages && input.requestMessages.length > 0) {
		return input.requestMessages
	}

	const storedMessages = await loadChatMessages(input.userId, input.chatId)
	const userMessage: UIMessage = {
		id: `user-${Date.now()}`,
		role: 'user',
		parts: [{ type: 'text', text: input.prompt ?? '' }],
	}

	return [...storedMessages, userMessage]
}

/**
 * Prepare note context for AI streaming (RAG).
 * When a LanguageModel is provided, the enhanced RAG pipeline (query rewrite + multi-retrieve + rerank)
 * is used. Falls back to the legacy FTS-only path on failure or when no model is given.
 */
async function prepareNoteContext(
	userId: string,
	prompt: string,
	noteEntryIds: string[] | undefined,
	ragTopK: number | undefined,
	model?: import('ai').LanguageModel,
	captionOptions?: {
		credential: DecryptedCredential
		model?: string
	}
) {
	const sanitizedNoteIds = (noteEntryIds ?? [])
		.filter((id) => typeof id === 'string' && id.length > 0)
		.slice(0, MAX_ATTACHED_NOTES)

	const uniqueNoteIds = [...new Set(sanitizedNoteIds)]
	let attachedNotes = await fetchNotesByIds(userId, uniqueNoteIds)

	const effectiveRagTopK = ragTopK ?? DEFAULT_KNOWLEDGE_CHAT_RAG_TOP_K

	let embeddingModel: import('ai').EmbeddingModel | undefined
	if (captionOptions?.credential) {
		try {
			if (providerSupports(captionOptions.credential.provider, 'embedding')) {
				embeddingModel = createVercelAiEmbeddingModel(captionOptions.credential)
			}
		} catch {
			/* embedding not available for this provider */
		}
	}

	let retrievedNotes = model
		? await ragRetrieve({
				userId,
				query: prompt,
				excludeIds: uniqueNoteIds,
				topK: effectiveRagTopK,
				model,
				embeddingModel,
			})
		: await searchNotesForRag(userId, prompt, uniqueNoteIds, effectiveRagTopK)

	const allNoteIds = [
		...new Set([...uniqueNoteIds, ...retrievedNotes.map((note) => note.id)]),
	]
	if (allNoteIds.length > 0) {
		const generatedCount = await ensureEntryImageCaptions({
			userId,
			entryIds: allNoteIds,
			credential: captionOptions?.credential,
			model: captionOptions?.model,
			allowEnvFallback: true,
		})

		if (generatedCount > 0) {
			const refreshedNotes = await fetchNotesByIds(userId, allNoteIds)
			const refreshedNoteMap = new Map(
				refreshedNotes.map((note) => [note.id, note] as const)
			)

			attachedNotes = uniqueNoteIds
				.map((noteId) => refreshedNoteMap.get(noteId))
				.filter((note): note is NoteContext => Boolean(note))

			retrievedNotes = retrievedNotes.map(
				(note) => refreshedNoteMap.get(note.id) ?? note
			)

			log.debug(`Generated image captions for ${generatedCount} attachment(s)`)
		}
	}

	return { attachedNotes, retrievedNotes }
}

async function resolveTopologyContextText(
	userId: string,
	noteEntryIds: string[] | undefined,
	attachedNotes: NoteContext[]
): Promise<string> {
	const topologyEntryIds = [
		...(noteEntryIds ?? []),
		...attachedNotes.map((note) => note.id),
	]
	if (topologyEntryIds.length === 0) {
		return ''
	}

	const { contextText } = await buildTopologyContext(userId, topologyEntryIds, 1)
	return contextText
}

function mergeVisionCandidateNotes(
	attachedNotes: NoteContext[],
	retrievedNotes: NoteContext[]
): NoteContext[] {
	const attachedNoteIds = new Set(attachedNotes.map((note) => note.id))
	const uniqueRetrievedNotes = retrievedNotes.filter(
		(note) => !attachedNoteIds.has(note.id)
	)
	return [...attachedNotes, ...uniqueRetrievedNotes]
}

function buildModelMessagesWithVisionContext(input: {
	provider: AiProvider
	modelMessages: ModelMessage[]
	attachedNotes: NoteContext[]
	retrievedNotes: NoteContext[]
}): ModelMessage[] {
	if (!providerSupports(input.provider, 'vision')) {
		return input.modelMessages
	}

	const visionContextMessage = buildVisionContextMessage(
		mergeVisionCandidateNotes(input.attachedNotes, input.retrievedNotes)
	)
	if (!visionContextMessage) {
		return input.modelMessages
	}

	return [...input.modelMessages, visionContextMessage]
}

function combineSystemPrompt(
	baseSystemPrompt: string,
	topologyContextText: string
): string {
	if (topologyContextText.length === 0) {
		return baseSystemPrompt
	}
	return `${baseSystemPrompt}\n\n${topologyContextText}`
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

const DEFAULT_KEEP_RECENT_COUNT = 4
const MIN_KEEP_RECENT_COUNT = 2
const MAX_KEEP_RECENT_COUNT = 12
const ESTIMATED_CHARS_PER_TOKEN = 4
const COMPACT_SUMMARY_FALLBACK = 'Conversation context compacted.'

const COMPACT_SUMMARY_SYSTEM_PROMPT = [
	'You are compacting a long conversation for future turns.',
	'Summarize key user goals, constraints, facts, decisions, open questions, and pending tasks.',
	'Preserve concrete values (numbers, dates, names, code identifiers, URLs).',
	'Do not invent details and do not include unnecessary prose.',
	'Return concise markdown bullet points.',
].join('\n')

type UsageMetadata = {
	inputTokens?: number
	outputTokens?: number
	totalTokens?: number
	reasoningTokens?: number
	cachedInputTokens?: number
	costUSD?: number
}

type CompactInfo = {
	compactedAt: string
	originalMessageCount: number
	compactedMessageCount: number
	keptMessageCount: number
	summaryTokens: number
}

function sanitizeKeepRecentCount(value: number | undefined): number {
	if (typeof value !== 'number' || Number.isNaN(value)) {
		return DEFAULT_KEEP_RECENT_COUNT
	}
	return Math.min(
		MAX_KEEP_RECENT_COUNT,
		Math.max(MIN_KEEP_RECENT_COUNT, Math.floor(value))
	)
}

function extractMessageText(message: UIMessage): string {
	const parts = message.parts ?? []
	const fragments: string[] = []
	for (const part of parts) {
		if (part.type === 'text' && typeof part.text === 'string') {
			fragments.push(part.text)
		}
		if (
			part.type === 'reasoning' &&
			'text' in part &&
			typeof part.text === 'string'
		) {
			fragments.push(`[Reasoning] ${part.text}`)
		}
	}
	return fragments.join('\n').trim()
}

function estimateMessageTokens(message: UIMessage): number {
	return Math.ceil(extractMessageText(message).length / ESTIMATED_CHARS_PER_TOKEN)
}

function resolveCompactionSplitIndex(
	messages: UIMessage[],
	keepRecentCount: number,
	tokensToCompact: number | undefined
): number {
	const minimumSplitIndex = Math.max(0, messages.length - keepRecentCount)
	if (!(tokensToCompact && tokensToCompact > 0)) {
		return minimumSplitIndex
	}

	let compactedTokens = 0
	let splitIndex = 0
	while (splitIndex < minimumSplitIndex && compactedTokens < tokensToCompact) {
		compactedTokens += estimateMessageTokens(messages[splitIndex] as UIMessage)
		splitIndex += 1
	}

	return Math.max(splitIndex, Math.min(1, minimumSplitIndex))
}

function buildCompactTranscript(messages: UIMessage[]): string {
	return messages
		.map((message, index) => {
			const text = extractMessageText(message)
			if (!text) return null
			return `#${index + 1} [${message.role}]\n${text}`
		})
		.filter((item): item is string => Boolean(item))
		.join('\n\n')
}

const USAGE_KEYS = [
	'inputTokens',
	'outputTokens',
	'totalTokens',
	'reasoningTokens',
	'cachedInputTokens',
] as const

function normalizeUsageMetadata(value: unknown): UsageMetadata | undefined {
	if (!value || typeof value !== 'object') return undefined
	const raw = value as Record<string, unknown>
	const result: Record<string, number> = {}
	let hasValue = false
	for (const key of USAGE_KEYS) {
		if (typeof raw[key] === 'number') {
			result[key] = raw[key]
			hasValue = true
		}
	}
	return hasValue ? (result as UsageMetadata) : undefined
}

type CompactRouteResponse = {
	chatId: string
	messages: UIMessage[]
	summary: string
	compactedCount: number
	keptCount: number
	compactInfo?: CompactInfo
}

function createNoCompactResponse(
	chatId: string,
	messages: UIMessage[]
): CompactRouteResponse {
	return {
		chatId,
		messages,
		summary: '',
		compactedCount: 0,
		keptCount: messages.length,
	}
}

type CompactExecutionInput = {
	userId: string
	chatId: string
	provider: AiProvider
	model?: string
	credential: DecryptedCredential
	providedMessages?: UIMessage[]
	keepRecentCount?: number
	tokensToCompact?: number
}

async function executeContextCompaction(
	input: CompactExecutionInput
): Promise<CompactRouteResponse> {
	const {
		userId,
		chatId,
		provider,
		model,
		credential,
		providedMessages,
		keepRecentCount,
		tokensToCompact,
	} = input

	const currentMessages =
		providedMessages && providedMessages.length > 0
			? providedMessages
			: await loadChatMessages(userId, chatId)
	const effectiveKeepRecentCount = sanitizeKeepRecentCount(keepRecentCount)
	if (currentMessages.length <= effectiveKeepRecentCount) {
		return createNoCompactResponse(chatId, currentMessages)
	}

	const splitIndex = resolveCompactionSplitIndex(
		currentMessages,
		effectiveKeepRecentCount,
		tokensToCompact
	)
	if (splitIndex <= 0 || splitIndex >= currentMessages.length) {
		return createNoCompactResponse(chatId, currentMessages)
	}

	const oldMessages = currentMessages.slice(0, splitIndex)
	const recentMessages = currentMessages.slice(splitIndex)
	const transcript = buildCompactTranscript(oldMessages)
	if (!transcript) {
		return createNoCompactResponse(chatId, currentMessages)
	}

	const compactModel = createVercelAiChatModel(credential, { model })
	const compactResult = await aiGenerateText({
		model: compactModel,
		system: COMPACT_SUMMARY_SYSTEM_PROMPT,
		prompt: [
			'Conversation transcript (older turns to compact):',
			transcript,
			'',
			'Return only the compact summary.',
		].join('\n'),
	})

	const summaryText = compactResult.text.trim() || COMPACT_SUMMARY_FALLBACK
	const compactInfo: CompactInfo = {
		compactedAt: new Date().toISOString(),
		originalMessageCount: currentMessages.length,
		compactedMessageCount: oldMessages.length,
		keptMessageCount: recentMessages.length,
		summaryTokens: Math.ceil(summaryText.length / ESTIMATED_CHARS_PER_TOKEN),
	}
	const summaryUsage = normalizeUsageMetadata(compactResult.usage)
	const summaryUsageWithCost =
		summaryUsage && compactModel.modelId
			? {
					...summaryUsage,
					costUSD:
						summaryUsage.costUSD ??
						calculateCostFromUsage(provider, compactModel.modelId, summaryUsage),
				}
			: summaryUsage

	const generateSummaryMessageId = createIdGenerator({
		prefix: 'msg',
		size: 16,
	})
	const summaryMessage: UIMessage = {
		id: generateSummaryMessageId(),
		role: 'assistant',
		parts: [{ type: 'text', text: summaryText }],
		metadata: {
			compactInfo,
			usage: summaryUsageWithCost,
		},
	}
	const compactedMessages = [summaryMessage, ...recentMessages]

	await saveChat({
		userId,
		chatId,
		messages: compactedMessages,
	})

	return {
		chatId,
		messages: compactedMessages,
		summary: summaryText,
		compactedCount: oldMessages.length,
		keptCount: recentMessages.length,
		compactInfo,
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
	app.get('/api/ai/chats', async (c) => {
		const auth = await getAuthenticatedUser(c)
		if (!auth) return c.json({ error: 'Unauthorized' }, 401)

		const chats = await listUserChats(auth.userId)
		return c.json({ chats })
	})

	app.get('/api/ai/chat/:chatId', async (c) => {
		const auth = await getAuthenticatedUser(c)
		if (!auth) return c.json({ error: 'Unauthorized' }, 401)

		const chatId = c.req.param('chatId')
		if (!chatId) return c.json({ error: 'Missing chatId' }, 400)

		const session = await loadChat(auth.userId, chatId, true)
		if (!session) return c.json({ error: 'Chat not found' }, 404)

		return c.json({
			chatId: session.chatId,
			title: session.title,
			messages: session.messages,
			messageCount: session.messageCount,
			lastOpenedAt: session.lastOpenedAt.toISOString(),
			updatedAt: session.updatedAt.toISOString(),
			createdAt: session.createdAt.toISOString(),
		})
	})

	app.post('/api/ai/chat', async (c) => {
		const auth = await getAuthenticatedUser(c)
		if (!auth) return c.json({ error: 'Unauthorized' }, 401)

		const body = await c.req
			.json<{ title?: string }>()
			.catch(() => ({ title: undefined }))

		const session = await createChat({
			userId: auth.userId,
			title: body.title,
		})

		return c.json({
			chatId: session.chatId,
			title: session.title,
			createdAt: session.createdAt.toISOString(),
		})
	})

	app.delete('/api/ai/chat/:chatId', async (c) => {
		const auth = await getAuthenticatedUser(c)
		if (!auth) return c.json({ error: 'Unauthorized' }, 401)

		const chatId = c.req.param('chatId')
		if (!chatId) return c.json({ error: 'Missing chatId' }, 400)

		const deleted = await deleteChat(auth.userId, chatId)
		if (!deleted) return c.json({ error: 'Chat not found' }, 404)

		return c.json({ success: true })
	})

	app.post('/api/ai/chat/:chatId/touch', async (c) => {
		const auth = await getAuthenticatedUser(c)
		if (!auth) return c.json({ error: 'Unauthorized' }, 401)

		const chatId = c.req.param('chatId')
		if (!chatId) return c.json({ error: 'Missing chatId' }, 400)

		await touchChat(auth.userId, chatId)
		return c.json({ success: true })
	})

	app.delete('/api/ai/chat/:chatId/empty', async (c) => {
		const auth = await getAuthenticatedUser(c)
		if (!auth) return c.json({ error: 'Unauthorized' }, 401)

		const chatId = c.req.param('chatId')
		if (!chatId) return c.json({ error: 'Missing chatId' }, 400)

		// Best-effort cleanup: returns success even if not deleted
		const deleted = await deleteEmptyChat(auth.userId, chatId)
		return c.json({ success: true, deleted })
	})

	app.post('/api/ai/compact', async (c) => {
		const auth = await getAuthenticatedUser(c)
		if (!auth) return c.json({ error: 'Unauthorized' }, 401)

		const body = await c.req.json<AiCompactRequestBody>()
		const { chatId, provider, apiKey, baseUrl, model, messages, keepRecentCount } =
			body

		if (!(chatId && provider && apiKey)) {
			return c.json({ error: 'Missing required fields' }, 400)
		}
		if (!isValidProvider(provider)) {
			return c.json({ error: `Unsupported provider: ${provider}` }, 400)
		}

		const credential = buildCredential(provider, apiKey, baseUrl, model)

		try {
			const compactedResult = await executeContextCompaction({
				userId: auth.userId,
				chatId,
				provider,
				model,
				credential,
				providedMessages: messages,
				keepRecentCount,
				tokensToCompact: body.tokensToCompact,
			})
			return c.json(compactedResult)
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			log.error('Compact error:', error)
			return c.json({ error: errorMessage }, 500)
		}
	})

	app.post('/api/image/caption', async (c) => {
		const auth = await getAuthenticatedUser(c)
		if (!auth) return c.json({ error: 'Unauthorized' }, 401)

		const body = await c.req.json<CaptionImageRequestBody>()
		if (!(body.attachmentId && body.attachmentId.trim().length > 0)) {
			return c.json({ error: 'Missing attachmentId' }, 400)
		}

		const hasProviderOrApiKey = Boolean(body.provider) || Boolean(body.apiKey)
		if (hasProviderOrApiKey && !(body.provider && body.apiKey)) {
			return c.json({ error: 'provider and apiKey must be provided together' }, 400)
		}

		let credential: DecryptedCredential | undefined
		if (body.provider && body.apiKey) {
			if (!isValidProvider(body.provider)) {
				return c.json({ error: `Unsupported provider: ${body.provider}` }, 400)
			}
			credential = buildCredential(
				body.provider,
				body.apiKey,
				body.baseUrl,
				body.model
			)
		}

		const result = await ensureAttachmentImageCaption({
			userId: auth.userId,
			attachmentId: body.attachmentId,
			credential,
			model: body.model,
			force: body.force ?? false,
			allowEnvFallback: credential === undefined,
		})

		return c.json({
			success: true,
			generated: Boolean(result),
			caption: result?.description,
			modelId: result?.modelId,
		})
	})

	app.post('/api/image/caption/internal', async (c) => {
		const expectedToken = process.env.IMAGE_CAPTION_INTERNAL_TOKEN
		const providedToken = c.req.header('x-caption-internal-token')

		if (!expectedToken || providedToken !== expectedToken) {
			return c.json({ error: 'Unauthorized' }, 401)
		}

		const body = await c.req.json<InternalCaptionImageRequestBody>()
		if (
			!(
				body.userId &&
				body.userId.trim().length > 0 &&
				body.attachmentId &&
				body.attachmentId.trim().length > 0
			)
		) {
			return c.json({ error: 'Missing required fields' }, 400)
		}

		const result = await ensureAttachmentImageCaption({
			userId: body.userId,
			attachmentId: body.attachmentId,
			model: body.model,
			force: body.force ?? false,
			allowEnvFallback: true,
		})

		return c.json({
			success: true,
			generated: Boolean(result),
		})
	})

	function validateStreamRequest(
		body: AiStreamRequestBody
	): { error: string; status: 400 } | null {
		if (!(body.provider && body.apiKey)) {
			return { error: 'Missing required fields', status: 400 }
		}
		const hasPromptOrMessages =
			Boolean(body.prompt) || Boolean(body.messages && body.messages.length > 0)
		if (!hasPromptOrMessages) {
			return { error: 'Either prompt or messages is required', status: 400 }
		}
		if (!isValidProvider(body.provider)) {
			return {
				error: `Unsupported provider: ${body.provider}`,
				status: 400,
			}
		}
		return null
	}

	function resolveTools(options: {
		shouldEnableTools: boolean
		shouldEnableWebSearch: boolean
		imageGenerationTool?: ReturnType<typeof createImageGenerationTool>
	}) {
		const { shouldEnableTools, shouldEnableWebSearch, imageGenerationTool } = options
		if (!shouldEnableTools) return undefined

		const baseTools = shouldEnableWebSearch
			? aiTools
			: (() => {
					const { webSearch: _ws, webFetch: _wf, ...rest } = aiTools
					return rest
				})()

		if (imageGenerationTool) {
			return { ...baseTools, generateImage: imageGenerationTool }
		}
		return baseTools
	}

	app.post('/api/ai/stream', async (c) => {
		const auth = await getAuthenticatedUser(c)
		if (!auth) return c.json({ error: 'Unauthorized' }, 401)

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
			enableWebSearch,
			enableImageGeneration,
		} = body

		const validationError = validateStreamRequest(body)
		if (validationError) {
			return c.json({ error: validationError.error }, validationError.status)
		}
		const validProvider = provider as AiProvider
		const credential = buildCredential(validProvider, apiKey, baseUrl, model)

		try {
			const chatId = requestChatId || generateChatId()

			const messages = await resolveStreamMessages({
				userId: auth.userId,
				chatId,
				prompt,
				requestMessages,
			})

			const ragQuery = prompt || extractLastUserText(messages)
			const aiModel = createVercelAiChatModel(credential, { model })

			const { attachedNotes, retrievedNotes } = await prepareNoteContext(
				auth.userId,
				ragQuery,
				noteEntryIds,
				ragTopK,
				aiModel,
				{
					credential,
					model,
				}
			)

			const topologyContextText = await resolveTopologyContextText(
				auth.userId,
				noteEntryIds,
				attachedNotes
			)

			const currentDate = getLocalDateString(new Date())
			const { systemPrompt: baseSystemPrompt } = buildKnowledgeChatSystemPrompt({
				attachedNotes,
				retrievedNotes,
				currentDate,
			})
			const systemPrompt = combineSystemPrompt(baseSystemPrompt, topologyContextText)
			const modelMessages = await convertToModelMessages(messages)
			const modelMessagesWithVision = buildModelMessagesWithVisionContext({
				provider: validProvider,
				modelMessages,
				attachedNotes,
				retrievedNotes,
			})
			const providerOptions = buildProviderOptions(
				validProvider,
				enableReasoning ?? false
			)
			const shouldEnableTools = providerSupports(validProvider, 'function_calling')
			const shouldEnableWebSearch = Boolean(enableWebSearch) && isTavilyConfigured()
			const shouldEnableImageGeneration =
				Boolean(enableImageGeneration) &&
				providerSupports(validProvider, 'image_generation')

			let imageGenerationTool:
				| ReturnType<typeof createImageGenerationTool>
				| undefined
			if (shouldEnableImageGeneration) {
				try {
					const imageModel = createVercelAiImageModel(credential)
					imageGenerationTool = createImageGenerationTool(imageModel)
				} catch {
					log.warn(`Image generation not available for provider ${validProvider}`)
				}
			}

			const tools = resolveTools({
				shouldEnableTools,
				shouldEnableWebSearch,
				imageGenerationTool,
			})

			const result = aiStreamText({
				model: aiModel,
				system: systemPrompt,
				messages: modelMessagesWithVision,
				tools,
				experimental_context: {
					userId: auth.userId,
				} satisfies NoteToolContext,
				providerOptions: providerOptions as Parameters<
					typeof aiStreamText
				>[0]['providerOptions'],
			})

			result.consumeStream()

			return result.toUIMessageStreamResponse({
				originalMessages: messages,
				generateMessageId: createIdGenerator({ prefix: 'msg', size: 16 }),
				sendSources: true,
				sendReasoning: true,
				messageMetadata: ({ part }) => {
					if (part.type === 'finish') {
						const usage: UsageMetadata = {
							inputTokens: part.totalUsage.inputTokens,
							outputTokens: part.totalUsage.outputTokens,
							totalTokens: part.totalUsage.totalTokens,
							reasoningTokens: part.totalUsage.outputTokenDetails?.reasoningTokens,
						}
						const costUSD = calculateCostFromUsage(provider, aiModel.modelId, usage)
						return { usage: { ...usage, costUSD } }
					}
					return undefined
				},
				onFinish: ({ messages: finalMessages }) => {
					saveChat({
						userId: auth.userId,
						chatId,
						messages: finalMessages,
					})
					log.debug(`Chat ${chatId} completed: ${finalMessages.length} messages`)
				},
				headers: { 'X-Chat-Id': chatId },
			})
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error'
			log.error('Stream error:', error)
			return c.json({ error: errorMessage }, 500)
		}
	})

	// =========================================================================
	// POST /api/ai/generate-image — Dedicated image generation via ImageModelV3
	// =========================================================================

	app.post('/api/ai/generate-image', async (c) => {
		const auth = await getAuthenticatedUser(c)
		if (!auth) return c.json({ error: 'Unauthorized' }, 401)

		const body = await c.req.json<{
			provider: string
			apiKey: string
			baseUrl?: string
			model?: string
			prompt: string
			n?: number
			size?: string
			aspectRatio?: string
		}>()

		const { provider, apiKey, baseUrl, model, prompt, n, size, aspectRatio } = body

		if (!provider) return c.json({ error: 'Missing required field: provider' }, 400)
		if (!apiKey) return c.json({ error: 'Missing required field: apiKey' }, 400)
		if (!prompt) return c.json({ error: 'Missing required field: prompt' }, 400)
		if (!isValidProvider(provider)) {
			return c.json({ error: `Unsupported provider: ${provider}` }, 400)
		}

		const validProvider = provider as AiProvider
		const credential = buildCredential(validProvider, apiKey, baseUrl, model)

		try {
			const imageModel = createVercelAiImageModel(credential, { model })
			const result = await generateImage({
				model: imageModel,
				prompt,
				n: n ?? 1,
				size: size as `${number}x${number}` | undefined,
				aspectRatio: aspectRatio as `${number}:${number}` | undefined,
			})

			const images = result.images.map((img) => ({
				base64: img.base64,
				mediaType: img.mediaType,
			}))

			return c.json({ images, warnings: result.warnings })
		} catch (error: unknown) {
			log.error('Image generation error:', error)

			const statusCode = extractApiErrorStatus(error) ?? 500
			const errorMessage = extractApiErrorMessage(error)

			return c.json({ error: errorMessage }, statusCode as 500)
		}
	})
}

function extractApiErrorStatus(error: unknown): number | undefined {
	if (
		error &&
		typeof error === 'object' &&
		'statusCode' in error &&
		typeof error.statusCode === 'number'
	) {
		return error.statusCode
	}
	if (error && typeof error === 'object' && 'cause' in error) {
		return extractApiErrorStatus(error.cause)
	}
	return undefined
}

const API_ERROR_MESSAGES: Record<number, string> = {
	401: 'API key is invalid or expired. Please check your credentials.',
	403: 'Access denied. Your API key does not have permission for this model.',
	429: 'API quota exceeded or rate limited. Please wait and try again, or check your billing plan.',
	500: 'The AI provider returned an internal error. Please try again later.',
	503: 'The AI service is temporarily unavailable. Please try again later.',
}

function extractApiErrorMessage(error: unknown): string {
	const statusCode = extractApiErrorStatus(error)
	const friendlyMessage = statusCode ? API_ERROR_MESSAGES[statusCode] : undefined
	if (friendlyMessage) {
		return friendlyMessage
	}
	if (error instanceof Error) {
		return error.message
	}
	return 'An unexpected error occurred during image generation.'
}
