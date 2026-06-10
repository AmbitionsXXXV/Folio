import {
  createChat,
  deleteChat,
  deleteEmptyChat,
  listUserChats,
  loadChat,
  touchChat
} from "../../services/ai-chat-store"
import type { App } from "../../types"
import { executeContextCompaction } from "./compact"
import {
  buildCredential,
  getAuthenticatedUser,
  isValidProvider,
  log
} from "./helpers"
import type { AiCompactRequestBody } from "./types"

export function registerChatRoutes(app: App) {
  app.get("/api/ai/chats", async (c) => {
    const auth = await getAuthenticatedUser(c)
    if (!auth) {
      return c.json({ error: "Unauthorized" }, 401)
    }

    const chats = await listUserChats(auth.userId)
    return c.json({ chats })
  })

  app.get("/api/ai/chat/:chatId", async (c) => {
    const auth = await getAuthenticatedUser(c)
    if (!auth) {
      return c.json({ error: "Unauthorized" }, 401)
    }

    const chatId = c.req.param("chatId")
    if (!chatId) {
      return c.json({ error: "Missing chatId" }, 400)
    }

    const session = await loadChat(auth.userId, chatId, true)
    if (!session) {
      return c.json({ error: "Chat not found" }, 404)
    }

    return c.json({
      chatId: session.chatId,
      title: session.title,
      messages: session.messages,
      messageCount: session.messageCount,
      lastOpenedAt: session.lastOpenedAt.toISOString(),
      updatedAt: session.updatedAt.toISOString(),
      createdAt: session.createdAt.toISOString()
    })
  })

  app.post("/api/ai/chat", async (c) => {
    const auth = await getAuthenticatedUser(c)
    if (!auth) {
      return c.json({ error: "Unauthorized" }, 401)
    }

    const body = await c.req
      .json<{ title?: string }>()
      .catch(() => ({ title: undefined }))

    const session = await createChat({
      userId: auth.userId,
      title: body.title
    })

    return c.json({
      chatId: session.chatId,
      title: session.title,
      createdAt: session.createdAt.toISOString()
    })
  })

  app.delete("/api/ai/chat/:chatId", async (c) => {
    const auth = await getAuthenticatedUser(c)
    if (!auth) {
      return c.json({ error: "Unauthorized" }, 401)
    }

    const chatId = c.req.param("chatId")
    if (!chatId) {
      return c.json({ error: "Missing chatId" }, 400)
    }

    const deleted = await deleteChat(auth.userId, chatId)
    if (!deleted) {
      return c.json({ error: "Chat not found" }, 404)
    }

    return c.json({ success: true })
  })

  app.post("/api/ai/chat/:chatId/touch", async (c) => {
    const auth = await getAuthenticatedUser(c)
    if (!auth) {
      return c.json({ error: "Unauthorized" }, 401)
    }

    const chatId = c.req.param("chatId")
    if (!chatId) {
      return c.json({ error: "Missing chatId" }, 400)
    }

    await touchChat(auth.userId, chatId)
    return c.json({ success: true })
  })

  app.delete("/api/ai/chat/:chatId/empty", async (c) => {
    const auth = await getAuthenticatedUser(c)
    if (!auth) {
      return c.json({ error: "Unauthorized" }, 401)
    }

    const chatId = c.req.param("chatId")
    if (!chatId) {
      return c.json({ error: "Missing chatId" }, 400)
    }

    // Best-effort cleanup: returns success even if not deleted
    const deleted = await deleteEmptyChat(auth.userId, chatId)
    return c.json({ success: true, deleted })
  })

  app.post("/api/ai/compact", async (c) => {
    const auth = await getAuthenticatedUser(c)
    if (!auth) {
      return c.json({ error: "Unauthorized" }, 401)
    }

    const body = await c.req.json<AiCompactRequestBody>()
    const {
      chatId,
      provider,
      apiKey,
      baseUrl,
      model,
      messages,
      keepRecentCount
    } = body

    if (!(chatId && provider && apiKey)) {
      return c.json({ error: "Missing required fields" }, 400)
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
        tokensToCompact: body.tokensToCompact
      })
      return c.json(compactedResult)
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error"
      log.error("Compact error:", error)
      return c.json({ error: errorMessage }, 500)
    }
  })
}
