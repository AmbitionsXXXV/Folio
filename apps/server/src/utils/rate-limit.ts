/**
 * AI endpoint rate limiting.
 *
 * The AI HTTP routes are plain Hono handlers, not oRPC procedures, so the oRPC
 * rate-limit middleware does not apply. This wraps the shared Redis token-bucket
 * limiter (`@folionote/api`) for use in Hono handlers, keyed by the authenticated
 * user id.
 */
import { checkRateLimit } from "@folionote/api/utils/rate-limit"
import type { RateLimitConfig } from "@folionote/api/utils/rate-limit"
import { createLogger } from "@folionote/log"
import type { Context as HonoContext } from "hono"

import type { AppVariables } from "../types"

const log = createLogger({ prefix: "rate-limit" })

const ONE_MINUTE_MS = 60_000

/** Chat streaming: 30 requests/minute/user. */
export const AI_STREAM_RATE_LIMIT: RateLimitConfig = {
  keyPrefix: "ai:stream",
  maxRequests: 30,
  windowMs: ONE_MINUTE_MS
}

/** Image generation: 10 requests/minute/user (expensive). */
export const AI_IMAGE_RATE_LIMIT: RateLimitConfig = {
  keyPrefix: "ai:image",
  maxRequests: 10,
  windowMs: ONE_MINUTE_MS
}

/** Manual image captioning: 30 requests/minute/user. */
export const AI_CAPTION_RATE_LIMIT: RateLimitConfig = {
  keyPrefix: "ai:caption",
  maxRequests: 30,
  windowMs: ONE_MINUTE_MS
}

/**
 * Enforce a per-user rate limit for an AI route. Returns a 429 Response when the
 * caller is over the limit, otherwise null.
 *
 * Fails OPEN (allows the request) if the rate-limit check itself errors — e.g.
 * Redis is unavailable — so a cache outage throttles abuse-protection rather
 * than taking AI down entirely.
 */
export async function enforceAiRateLimit(
  c: HonoContext<{ Variables: AppVariables }>,
  userId: string,
  config: RateLimitConfig
): Promise<Response | null> {
  try {
    const status = await checkRateLimit(config.keyPrefix, userId, config)
    if (!status.allowed) {
      const retryAfter = Math.ceil(status.resetInMs / 1000)
      c.header("Retry-After", String(retryAfter))
      return c.json(
        {
          error: `Rate limit exceeded. Try again in ${retryAfter}s.`,
          retryAfterSeconds: retryAfter
        },
        429
      )
    }
  } catch (error) {
    log.warn("AI rate limit check failed; allowing request", error)
  }
  return null
}
