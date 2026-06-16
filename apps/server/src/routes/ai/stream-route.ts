import type { AiProvider } from "@folionote/ai"
import { buildKnowledgeChatSystemPrompt, providerSupports } from "@folionote/ai"
import { createImageGenerationTool } from "@folionote/ai-tools/image-generation/tools"
import { isTavilyConfigured } from "@folionote/ai-tools/web-search/api"
import {
  createVercelAiChatModel,
  createVercelAiImageModel
} from "@folionote/ai/vercel-ai"
import { toAISdkStream } from "@mastra/ai-sdk"
import type { AgentExecutionOptions } from "@mastra/core/agent"
import { RequestContext } from "@mastra/core/request-context"
import {
  createIdGenerator,
  createUIMessageStream,
  createUIMessageStreamResponse
} from "ai"
import type { UIMessage } from "ai"

import {
  CHAT_CTX,
  knowledgeChatAgent
} from "../../mastra/agents/knowledge-chat-agent"
import { generateChatId } from "../../services/ai-chat-store"
import type { App } from "../../types"
import { calculateCostFromUsage } from "../../utils/cost"
import {
  AI_STREAM_RATE_LIMIT,
  enforceAiRateLimit
} from "../../utils/rate-limit"
import {
  buildVisionContextMessage,
  combineSystemPrompt,
  mergeVisionCandidateNotes,
  prepareNoteContext,
  resolveTopologyContextText
} from "./context"
import {
  buildCredential,
  extractLastUserText,
  getAuthenticatedUser,
  getLocalDateString,
  isValidProvider,
  log,
  validateUserBaseUrl
} from "./helpers"
import { buildProviderOptions } from "./provider-options"
import type { AiStreamRequestBody, UsageMetadata } from "./types"

function validateStreamRequest(
  body: AiStreamRequestBody
): { error: string; status: 400 } | null {
  if (!(body.provider && body.apiKey)) {
    return { error: "Missing required fields", status: 400 }
  }
  const hasPromptOrMessages =
    Boolean(body.prompt) || Boolean(body.messages && body.messages.length > 0)
  if (!hasPromptOrMessages) {
    return { error: "Either prompt or messages is required", status: 400 }
  }
  if (!isValidProvider(body.provider)) {
    return {
      error: `Unsupported provider: ${body.provider}`,
      status: 400
    }
  }
  return null
}

export function registerStreamRoute(app: App) {
  app.post("/api/ai/stream", async (c) => {
    const auth = await getAuthenticatedUser(c)
    if (!auth) {
      return c.json({ error: "Unauthorized" }, 401)
    }

    const limited = await enforceAiRateLimit(
      c,
      auth.userId,
      AI_STREAM_RATE_LIMIT
    )
    if (limited) {
      return limited
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
      enableWebSearch,
      enableImageGeneration
    } = body

    const validationError = validateStreamRequest(body)
    if (validationError) {
      return c.json({ error: validationError.error }, validationError.status)
    }
    const baseUrlError = validateUserBaseUrl(baseUrl)
    if (baseUrlError) {
      return c.json({ error: baseUrlError }, 400)
    }
    const validProvider = provider as AiProvider
    const credential = buildCredential(validProvider, apiKey, baseUrl, model)

    try {
      const chatId = requestChatId || generateChatId()
      const generateMessageId = createIdGenerator({ prefix: "msg", size: 16 })

      // Memory (ChatSessionMemoryStore) loads prior history per thread, so only
      // the current turn is passed; for prompt-only requests we synthesize the
      // single new user message.
      const messages: UIMessage[] = requestMessages?.length
        ? requestMessages
        : [
            {
              id: generateMessageId(),
              role: "user",
              parts: [{ type: "text", text: prompt ?? "" }]
            }
          ]

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
          model
        }
      )

      const topologyContextText = await resolveTopologyContextText(
        auth.userId,
        noteEntryIds,
        attachedNotes
      )

      const currentDate = getLocalDateString(new Date())
      const { systemPrompt: baseSystemPrompt } = buildKnowledgeChatSystemPrompt(
        {
          attachedNotes,
          retrievedNotes,
          currentDate
        }
      )
      const systemPrompt = combineSystemPrompt(
        baseSystemPrompt,
        topologyContextText
      )

      // Note images for vision-capable providers are injected as extra context
      // messages (instead of being woven into the persisted history).
      const visionContextMessage = providerSupports(validProvider, "vision")
        ? buildVisionContextMessage(
            mergeVisionCandidateNotes(attachedNotes, retrievedNotes)
          )
        : undefined

      const providerOptions = buildProviderOptions(
        validProvider,
        enableReasoning ?? false
      )
      const shouldEnableTools = providerSupports(
        validProvider,
        "function_calling"
      )
      const shouldEnableWebSearch =
        Boolean(enableWebSearch) && isTavilyConfigured()
      const shouldEnableImageGeneration =
        Boolean(enableImageGeneration) &&
        providerSupports(validProvider, "image_generation")

      let imageGenerationTool:
        | ReturnType<typeof createImageGenerationTool>
        | undefined
      if (shouldEnableImageGeneration) {
        try {
          const imageModel = createVercelAiImageModel(credential)
          imageGenerationTool = createImageGenerationTool(imageModel)
        } catch {
          log.warn(
            `Image generation not available for provider ${validProvider}`
          )
        }
      }

      // Seed per-request BYOK config for the agent's dynamic model/tools.
      const requestContext = new RequestContext()
      requestContext.set(CHAT_CTX.userId, auth.userId)
      requestContext.set(CHAT_CTX.chatModel, aiModel)
      requestContext.set(CHAT_CTX.enableTools, shouldEnableTools)
      requestContext.set(CHAT_CTX.enableWebSearch, shouldEnableWebSearch)
      if (imageGenerationTool) {
        requestContext.set(CHAT_CTX.imageGenerationTool, imageGenerationTool)
      }

      const mastraStream = await knowledgeChatAgent.stream(
        messages as unknown as Parameters<typeof knowledgeChatAgent.stream>[0],
        {
          instructions: systemPrompt,
          // Vision message is an AI SDK v6 ModelMessage; Mastra types `context`
          // against its bundled v5 ModelMessage, so widen at the boundary.
          context: visionContextMessage
            ? ([visionContextMessage] as unknown as NonNullable<
                AgentExecutionOptions["context"]
              >)
            : undefined,
          memory: { thread: chatId, resource: auth.userId },
          requestContext,
          // buildProviderOptions returns AI SDK provider options; Mastra types
          // the field with a stricter, non-exported ProviderOptions, so widen at
          // the boundary (the runtime value is unchanged).
          providerOptions: providerOptions as unknown as
            | Record<string, Record<string, never>>
            | undefined
        }
      )

      // Keep generating (and persisting via memory) even if the client disconnects.
      mastraStream.consumeStream()

      // Persistence is handled by Mastra Memory (ChatSessionMemoryStore), which
      // merges each turn into the existing ai_chat_sessions blob.
      const uiMessageStream = createUIMessageStream({
        originalMessages: messages,
        generateId: generateMessageId,
        execute: async ({ writer }) => {
          for await (const part of toAISdkStream(mastraStream, {
            from: "agent",
            version: "v6",
            sendReasoning: true,
            sendSources: true,
            messageMetadata: ({ part }) => {
              if (part.type === "finish") {
                const usage: UsageMetadata = {
                  inputTokens: part.totalUsage.inputTokens,
                  outputTokens: part.totalUsage.outputTokens,
                  totalTokens: part.totalUsage.totalTokens,
                  reasoningTokens:
                    part.totalUsage.outputTokenDetails?.reasoningTokens
                }
                const costUSD = calculateCostFromUsage(
                  provider,
                  aiModel.modelId,
                  usage
                )
                return { usage: { ...usage, costUSD } }
              }
              return
            }
          })) {
            await writer.write(part as Parameters<typeof writer.write>[0])
          }
        }
      })

      return createUIMessageStreamResponse({
        stream: uiMessageStream,
        headers: { "X-Chat-Id": chatId }
      })
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error"
      log.error("Stream error:", error)
      return c.json({ error: errorMessage }, 500)
    }
  })
}
