import type { AiProvider } from '@folionote/ai'
import { buildKnowledgeChatSystemPrompt, providerSupports } from '@folionote/ai'
import {
	createVercelAiChatModel,
	createVercelAiImageModel,
} from '@folionote/ai/vercel-ai'
import { createImageGenerationTool } from '@folionote/ai-tools/image-generation/tools'
import type { NoteToolContext } from '@folionote/ai-tools/note/types'
import { isTavilyConfigured } from '@folionote/ai-tools/web-search/api'
import {
	streamText as aiStreamText,
	convertToModelMessages,
	createIdGenerator,
} from 'ai'
import { generateChatId, saveChat } from '../../services/ai-chat-store'
import { aiTools } from '../../services/ai-tools'
import type { App } from '../../types'
import { calculateCostFromUsage } from '../../utils/cost'
import {
	buildModelMessagesWithVisionContext,
	combineSystemPrompt,
	prepareNoteContext,
	resolveStreamMessages,
	resolveTopologyContextText,
} from './context'
import {
	buildCredential,
	extractLastUserText,
	getAuthenticatedUser,
	getLocalDateString,
	isValidProvider,
	log,
} from './helpers'
import { buildProviderOptions } from './provider-options'
import type { AiStreamRequestBody, UsageMetadata } from './types'

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

export function registerStreamRoute(app: App) {
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
}
