import { auth } from "@folionote/auth"
import { parseAcceptLanguage } from "@folionote/locales"
import type { SupportedLanguage } from "@folionote/locales"
import type { Context as HonoContext } from "hono"

export interface CreateContextOptions {
  context: HonoContext
  /** Pre-resolved locale from language middleware (optional for backward compatibility) */
  locale?: SupportedLanguage
}

/**
 * Resolve locale from headers (fallback when middleware locale is not provided)
 * Priority: X-Locale header > Accept-Language header > default
 */
function resolveLocale(headers: Headers): SupportedLanguage {
  const xLocale = headers.get("X-Locale")
  if (xLocale) {
    const normalized = xLocale.toLowerCase()
    if (normalized.startsWith("zh")) {
      return "zh-CN"
    }
    if (normalized.startsWith("en")) {
      return "en-US"
    }
    if (normalized.startsWith("ja")) {
      return "ja-JP"
    }
  }

  const acceptLanguage = headers.get("Accept-Language")
  return parseAcceptLanguage(acceptLanguage)
}

export async function createContext({ context, locale }: CreateContextOptions) {
  const { headers } = context.req.raw
  const session = await auth.api.getSession({ headers })

  // Use pre-resolved locale from middleware, or fallback to header parsing
  const resolvedLocale = locale ?? resolveLocale(headers)

  return {
    session,
    locale: resolvedLocale
  }
}

export type Context = Awaited<ReturnType<typeof createContext>>
