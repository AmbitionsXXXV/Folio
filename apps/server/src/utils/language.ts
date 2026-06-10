import { defaultLanguage, supportedLanguages } from "@folionote/locales"
import type { SupportedLanguage } from "@folionote/locales"

/**
 * Convert simplified language code (e.g., 'en', 'zh') to BCP47 format (e.g., 'en-US', 'zh-CN')
 * This bridges Hono's language middleware output with our i18n system
 */
export function convertToSupportedLanguage(lang: string): SupportedLanguage {
  const normalized = lang.toLowerCase()

  // Direct match for full BCP47 codes
  if (supportedLanguages.includes(lang as SupportedLanguage)) {
    return lang as SupportedLanguage
  }

  // Map simplified codes to full BCP47
  if (normalized === "en" || normalized.startsWith("en-")) {
    return "en-US"
  }
  if (normalized === "zh" || normalized.startsWith("zh-")) {
    return "zh-CN"
  }
  if (normalized === "ja" || normalized.startsWith("ja-")) {
    return "ja-JP"
  }

  return defaultLanguage
}
