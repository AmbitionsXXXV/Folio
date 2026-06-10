import type { AiProvider, DecryptedCredential } from "@folionote/ai"
import { createVercelAiImageModel } from "@folionote/ai/vercel-ai"
import { generateImage } from "ai"

import {
  ensureAttachmentImageCaption,
  isImageCaptionEnvFallbackEnabled
} from "../../services/image-captioning"
import type { App } from "../../types"
import {
  buildCredential,
  extractApiErrorMessage,
  extractApiErrorStatus,
  getAuthenticatedUser,
  isValidProvider,
  log
} from "./helpers"
import type {
  CaptionImageRequestBody,
  InternalCaptionImageRequestBody
} from "./types"

export function registerImageRoutes(app: App) {
  app.post("/api/image/caption", async (c) => {
    const auth = await getAuthenticatedUser(c)
    if (!auth) {
      return c.json({ error: "Unauthorized" }, 401)
    }

    const body = await c.req.json<CaptionImageRequestBody>()
    if (!(body.attachmentId && body.attachmentId.trim().length > 0)) {
      return c.json({ error: "Missing attachmentId" }, 400)
    }

    const hasProviderOrApiKey = Boolean(body.provider) || Boolean(body.apiKey)
    if (hasProviderOrApiKey && !(body.provider && body.apiKey)) {
      return c.json(
        { error: "provider and apiKey must be provided together" },
        400
      )
    }
    if (!(body.provider && body.apiKey)) {
      return c.json(
        {
          error:
            "provider and apiKey are required for manual caption generation"
        },
        400
      )
    }

    if (!isValidProvider(body.provider)) {
      return c.json({ error: `Unsupported provider: ${body.provider}` }, 400)
    }
    const credential: DecryptedCredential = buildCredential(
      body.provider,
      body.apiKey,
      body.baseUrl,
      body.model
    )

    const result = await ensureAttachmentImageCaption({
      userId: auth.userId,
      attachmentId: body.attachmentId,
      credential,
      model: body.model,
      force: body.force ?? false,
      allowEnvFallback: false
    })

    return c.json({
      success: true,
      generated: Boolean(result),
      caption: result?.description,
      modelId: result?.modelId
    })
  })

  app.post("/api/image/caption/internal", async (c) => {
    const expectedToken = process.env.IMAGE_CAPTION_INTERNAL_TOKEN
    const providedToken = c.req.header("x-caption-internal-token")

    if (!expectedToken || providedToken !== expectedToken) {
      return c.json({ error: "Unauthorized" }, 401)
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
      return c.json({ error: "Missing required fields" }, 400)
    }

    const result = await ensureAttachmentImageCaption({
      userId: body.userId,
      attachmentId: body.attachmentId,
      model: body.model,
      force: body.force ?? false,
      allowEnvFallback: isImageCaptionEnvFallbackEnabled()
    })

    return c.json({
      success: true,
      generated: Boolean(result)
    })
  })

  app.post("/api/ai/generate-image", async (c) => {
    const auth = await getAuthenticatedUser(c)
    if (!auth) {
      return c.json({ error: "Unauthorized" }, 401)
    }

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

    const { provider, apiKey, baseUrl, model, prompt, n, size, aspectRatio } =
      body

    if (!provider) {
      return c.json({ error: "Missing required field: provider" }, 400)
    }
    if (!apiKey) {
      return c.json({ error: "Missing required field: apiKey" }, 400)
    }
    if (!prompt) {
      return c.json({ error: "Missing required field: prompt" }, 400)
    }
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
        aspectRatio: aspectRatio as `${number}:${number}` | undefined
      })

      const images = result.images.map((img) => ({
        base64: img.base64,
        mediaType: img.mediaType
      }))

      return c.json({ images, warnings: result.warnings })
    } catch (error: unknown) {
      log.error("Image generation error:", error)

      const statusCode = extractApiErrorStatus(error) ?? 500
      const errorMessage = extractApiErrorMessage(error)

      return c.json({ error: errorMessage }, statusCode as 500)
    }
  })
}
