import { Hono } from "hono"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import type { App } from "../src/types"

const mockEnsureAttachmentImageCaption = vi.hoisted(() => vi.fn())
const mockGetAuthenticatedUser = vi.hoisted(() => vi.fn())
const mockIsValidProvider = vi.hoisted(() => vi.fn().mockReturnValue(true))
const mockBuildCredential = vi.hoisted(() => vi.fn())
const mockIsImageCaptionEnvFallbackEnabled = vi.hoisted(() => vi.fn())

vi.mock("../src/services/image-captioning", () => ({
  ensureAttachmentImageCaption: mockEnsureAttachmentImageCaption,
  isImageCaptionEnvFallbackEnabled: mockIsImageCaptionEnvFallbackEnabled
}))

vi.mock("../src/routes/ai/helpers", () => ({
  buildCredential: mockBuildCredential,
  extractApiErrorMessage: vi.fn(() => "image generation failed"),
  extractApiErrorStatus: vi.fn(() => 500),
  getAuthenticatedUser: mockGetAuthenticatedUser,
  isValidProvider: mockIsValidProvider,
  log: {
    error: vi.fn(),
    warn: vi.fn()
  }
}))

import { registerImageRoutes } from "../src/routes/ai/image-routes"

function createTestApp(): App {
  const app = new Hono() as App
  registerImageRoutes(app)
  return app
}

describe("image routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.IMAGE_CAPTION_INTERNAL_TOKEN = "internal-token"
    mockGetAuthenticatedUser.mockResolvedValue({
      userId: "user-1",
      locale: "en-US"
    })
    mockBuildCredential.mockReturnValue({
      provider: "openai",
      apiKey: "user-key",
      baseUrl: "https://api.openai.com/v1"
    })
    mockEnsureAttachmentImageCaption.mockResolvedValue(null)
    mockIsImageCaptionEnvFallbackEnabled.mockReturnValue(false)
  })

  it("requires BYOK for manual caption generation", async () => {
    const app = createTestApp()

    const response = await app.request("/api/image/caption", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ attachmentId: "attachment-1" })
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toEqual({
      error: "provider and apiKey are required for manual caption generation"
    })
    expect(mockEnsureAttachmentImageCaption).not.toHaveBeenCalled()
  })

  it("disables environment fallback for manual caption generation even with BYOK", async () => {
    const app = createTestApp()

    await app.request("/api/image/caption", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        attachmentId: "attachment-1",
        provider: "openai",
        apiKey: "user-key"
      })
    })

    expect(mockBuildCredential).toHaveBeenCalledWith(
      "openai",
      "user-key",
      undefined,
      undefined
    )
    expect(mockEnsureAttachmentImageCaption).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        attachmentId: "attachment-1",
        allowEnvFallback: false
      })
    )
  })

  it("only enables internal environment fallback when the feature flag is on", async () => {
    const app = createTestApp()

    await app.request("/api/image/caption/internal", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-caption-internal-token": "internal-token"
      },
      body: JSON.stringify({
        userId: "user-1",
        attachmentId: "attachment-1"
      })
    })

    expect(mockEnsureAttachmentImageCaption).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        attachmentId: "attachment-1",
        allowEnvFallback: false
      })
    )

    mockEnsureAttachmentImageCaption.mockClear()
    mockIsImageCaptionEnvFallbackEnabled.mockReturnValue(true)

    await app.request("/api/image/caption/internal", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-caption-internal-token": "internal-token"
      },
      body: JSON.stringify({
        userId: "user-1",
        attachmentId: "attachment-1"
      })
    })

    expect(mockEnsureAttachmentImageCaption).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        attachmentId: "attachment-1",
        allowEnvFallback: true
      })
    )
  })
})
