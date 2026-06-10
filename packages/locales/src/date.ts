/**
 * Default language fallback (must match defaultLanguage in index.ts)
 * Using direct value to avoid circular dependency
 */
const DEFAULT_LOCALE = "en-US"

/**
 * Date format presets for consistent date formatting across the application
 */
export type DateFormatPreset =
  | "short" // e.g., "Jan 6"
  | "medium" // e.g., "Jan 6, 2026"
  | "long" // e.g., "January 6, 2026"
  | "full" // e.g., "Saturday, January 6, 2026"
  | "time" // e.g., "2:30 PM"
  | "shortTime" // e.g., "Jan 6, 2:30 PM"
  | "relative" // e.g., "2 days ago" (fallback to medium if > 7 days)

/**
 * Options for date formatting with locale and preset
 */
export interface FormatDateOptions {
  locale?: string
  preset?: DateFormatPreset
  options?: Intl.DateTimeFormatOptions
}

/**
 * Preset configurations for Intl.DateTimeFormat
 */
const presetConfigs: Record<
  Exclude<DateFormatPreset, "relative">,
  Intl.DateTimeFormatOptions
> = {
  short: {
    month: "short",
    day: "numeric"
  },
  medium: {
    year: "numeric",
    month: "short",
    day: "numeric"
  },
  long: {
    year: "numeric",
    month: "long",
    day: "numeric"
  },
  full: {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  },
  time: {
    hour: "2-digit",
    minute: "2-digit"
  },
  shortTime: {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }
}

/**
 * Format relative time (e.g., "2 days ago")
 */
function formatRelativeTime(date: Date, locale: string): string | null {
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days < 0) {
    return null // Future dates, use default format
  }

  if (days === 0) {
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours === 0) {
      const minutes = Math.floor(diff / (1000 * 60))
      if (minutes === 0) {
        return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
          0,
          "second"
        )
      }
      return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
        -minutes,
        "minute"
      )
    }
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
      -hours,
      "hour"
    )
  }

  if (days < 7) {
    return new Intl.RelativeTimeFormat(locale, { numeric: "auto" }).format(
      -days,
      "day"
    )
  }

  return null // More than 7 days, return null to use fallback format
}

/**
 * Format a date with locale support and preset options
 *
 * @param date - The date to format (Date object, string, or number)
 * @param options - Formatting options including locale, preset, and custom options
 * @returns Formatted date string
 *
 * @example
 * ```ts
 * // Use with i18n.language
 * const { i18n } = useTranslation()
 * formatDate(new Date(), { locale: i18n.language, preset: 'medium' })
 *
 * // Use with custom options
 * formatDate(new Date(), {
 *   locale: 'zh-CN',
 *   options: { weekday: 'short', month: 'long', day: 'numeric' }
 * })
 * ```
 */
export function formatDate(
  date: Date | string | number,
  options: FormatDateOptions = {}
): string {
  const { locale = DEFAULT_LOCALE, preset = "medium" } = options
  const dateObj = date instanceof Date ? date : new Date(date)

  // Handle relative time preset
  if (preset === "relative") {
    const relativeStr = formatRelativeTime(dateObj, locale)
    if (relativeStr) {
      return relativeStr
    }
    // Fallback to medium format for dates > 7 days
    return new Intl.DateTimeFormat(locale, presetConfigs.medium).format(dateObj)
  }

  // Use custom options if provided, otherwise use preset
  const formatOptions = options.options ?? presetConfigs[preset]
  return new Intl.DateTimeFormat(locale, formatOptions).format(dateObj)
}

/**
 * Create a date formatter function bound to a specific locale
 * Useful for creating a hook-based formatter
 *
 * @param locale - The locale to use for formatting
 * @returns A function that formats dates using the specified locale
 *
 * @example
 * ```ts
 * // In a React hook
 * function useDateFormatter() {
 *   const { i18n } = useTranslation()
 *   return useMemo(() => createDateFormatter(i18n.language), [i18n.language])
 * }
 * ```
 */
export function createDateFormatter(locale: string) {
  return (
    date: Date | string | number,
    options?: Omit<FormatDateOptions, "locale">
  ) => formatDate(date, { ...options, locale })
}
