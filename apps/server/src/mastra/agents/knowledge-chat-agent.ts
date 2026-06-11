/**
 * Knowledge chat agent (Mastra)
 *
 * The orchestration core of the AI chat. Model, tools, and instructions are all
 * resolved per-request from the Mastra RequestContext that the stream route
 * seeds, which keeps the agent fully BYOK (Bring Your Own Key):
 *
 * - `chatModel`  — a Vercel AI SDK LanguageModel built from the caller's
 *   decrypted credential. Passed as an instance so the agent never re-creates it.
 * - `userId`     — forwarded to note tools via the tool execution context.
 * - tool flags   — gate which tools are exposed (function-calling support,
 *   web search availability, per-request image-generation tool).
 *
 * Instructions (the RAG/topology system prompt) are passed per call via
 * `agent.stream({ instructions })`, so the static `instructions` below is only a
 * fallback that is never used in the normal flow.
 */

import type { createImageGenerationTool } from "@folionote/ai-tools/image-generation/tools"
import { Agent } from "@mastra/core/agent"
import type { MastraLanguageModel } from "@mastra/core/agent"
import type { RequestContext } from "@mastra/core/request-context"

import { aiTools } from "../../services/ai-tools"
import { chatMemory } from "../memory"

type ImageGenerationTool = ReturnType<typeof createImageGenerationTool>

/**
 * RequestContext keys seeded by the chat stream route for each request.
 * Centralized so the route (writer) and the agent (reader) agree on the contract.
 */
export const CHAT_CTX = {
  userId: "userId",
  chatModel: "chatModel",
  enableTools: "enableTools",
  enableWebSearch: "enableWebSearch",
  imageGenerationTool: "imageGenerationTool"
} as const

function resolveChatModel(requestContext: RequestContext): MastraLanguageModel {
  const chatModel = requestContext.get(CHAT_CTX.chatModel)
  if (!chatModel) {
    throw new Error(
      "Knowledge chat agent: missing chatModel in request context"
    )
  }
  return chatModel as MastraLanguageModel
}

function resolveChatTools(requestContext: RequestContext) {
  if (!requestContext.get(CHAT_CTX.enableTools)) {
    return {}
  }

  const enableWebSearch = Boolean(requestContext.get(CHAT_CTX.enableWebSearch))
  const baseTools = enableWebSearch
    ? aiTools
    : (() => {
        const { webSearch: _webSearch, webFetch: _webFetch, ...rest } = aiTools
        return rest
      })()

  const imageGenerationTool = requestContext.get(
    CHAT_CTX.imageGenerationTool
  ) as ImageGenerationTool | undefined

  return imageGenerationTool
    ? { ...baseTools, generateImage: imageGenerationTool }
    : baseTools
}

export const knowledgeChatAgent = new Agent({
  id: "knowledge-chat",
  name: "Knowledge Chat",
  instructions:
    "You are FolioNote's knowledge assistant. Help the user capture, organize, and revisit what they learn from their notes.",
  model: ({ requestContext }) => resolveChatModel(requestContext),
  tools: ({ requestContext }) => resolveChatTools(requestContext),
  memory: chatMemory
})
