import { AI_PROVIDERS, PROVIDER_CONFIGS } from "@folionote/ai"
import type { AiProvider, DecryptedCredential } from "@folionote/ai"
import { createContext } from "@folionote/api/context"
import { createLogger } from "@folionote/log"
import type { Context as HonoContext } from "hono"

import type { AppVariables } from "../../types"
import { convertToSupportedLanguage } from "../../utils/language"
import type { AuthenticatedUser } from "./types"

const log = createLogger({ prefix: "ai-stream" })

export async function getAuthenticatedUser(
  c: HonoContext<{ Variables: AppVariables }>
): Promise<AuthenticatedUser | null> {
  const locale = convertToSupportedLanguage(c.get("language"))
  const ctx = await createContext({ context: c, locale })
  if (!ctx.session?.user) {
    return null
  }
  return { userId: ctx.session.user.id, locale }
}

export function isValidProvider(provider: string): provider is AiProvider {
  return AI_PROVIDERS.includes(provider as (typeof AI_PROVIDERS)[number])
}

export function buildCredential(
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
    model
  }
}

// Hosts an attacker could use to make the server reach internal services
// (SSRF) via a user-supplied BYOK baseUrl.
const PRIVATE_IPV4_REGEX =
  /^(?:0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/
const LOOPBACK_OR_LINK_LOCAL_IPV6_REGEX = /^(?:::1|fe80:|fc00:|fd[0-9a-f]{2}:)/i

function isDisallowedHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "")
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "0.0.0.0"
  ) {
    return true
  }
  if (PRIVATE_IPV4_REGEX.test(host)) {
    return true
  }
  return host.includes(":") && LOOPBACK_OR_LINK_LOCAL_IPV6_REGEX.test(host)
}

/**
 * Validate a user-supplied BYOK baseUrl before the server uses it to reach an AI
 * provider. Blocks SSRF to internal/metadata endpoints and credential leakage.
 * Returns an error message when invalid, or null when absent (use the provider
 * default) or valid.
 *
 * Note: this blocks IP-literal and localhost targets synchronously. A public
 * hostname that resolves to a private IP (DNS rebinding) is not caught here.
 */
export function validateUserBaseUrl(baseUrl?: string): string | null {
  const trimmed = baseUrl?.trim()
  if (!trimmed) {
    return null
  }
  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return "Invalid baseUrl"
  }
  if (url.protocol !== "https:") {
    return "baseUrl must use https"
  }
  if (url.username || url.password) {
    return "baseUrl must not embed credentials"
  }
  if (isDisallowedHost(url.hostname)) {
    return "baseUrl host is not allowed"
  }
  return null
}

export function getLocalDateString(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/**
 * Extract text from the last user message in a conversation for RAG query.
 */
export function extractLastUserText(
  messages: import("ai").UIMessage[]
): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg?.role !== "user") {
      continue
    }
    const textParts = (msg.parts ?? []).filter(
      (p): p is { type: "text"; text: string } => p.type === "text"
    )
    const text = textParts.map((p) => p.text).join("")
    if (text.length > 0) {
      return text
    }
  }
  return ""
}

export function truncateText(text: string, maxChars: number): string {
  if (text.length <= maxChars) {
    return text
  }
  return `${text.slice(0, maxChars - 3)}...`
}

export function extractApiErrorStatus(error: unknown): number | undefined {
  if (
    error &&
    typeof error === "object" &&
    "statusCode" in error &&
    typeof error.statusCode === "number"
  ) {
    return error.statusCode
  }
  if (error && typeof error === "object" && "cause" in error) {
    return extractApiErrorStatus(error.cause)
  }
  return undefined
}

export const API_ERROR_MESSAGES: Record<number, string> = {
  401: "API key is invalid or expired. Please check your credentials.",
  403: "Access denied. Your API key does not have permission for this model.",
  429: "API quota exceeded or rate limited. Please wait and try again, or check your billing plan.",
  500: "The AI provider returned an internal error. Please try again later.",
  503: "The AI service is temporarily unavailable. Please try again later."
}

export function extractApiErrorMessage(error: unknown): string {
  const statusCode = extractApiErrorStatus(error)
  const friendlyMessage = statusCode
    ? API_ERROR_MESSAGES[statusCode]
    : undefined
  if (friendlyMessage) {
    return friendlyMessage
  }
  if (error instanceof Error) {
    return error.message
  }
  return "An unexpected error occurred during image generation."
}

export { log }
