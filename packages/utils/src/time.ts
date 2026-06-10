/**
 * Time unit types for i18n
 */
export type TimeUnit = "second" | "minute" | "hour" | "day"

/**
 * Formatted time result with value and unit
 */
export interface FormattedTime {
  unit: TimeUnit
  value: number
}

/**
 * Time formatting options
 */
export interface FormatTimeOptions {
  /**
   * Maximum unit to use (e.g., 'hour' will not convert to days)
   * @default 'day'
   */
  maxUnit?: TimeUnit
  /**
   * Whether to use precise values (e.g., 1.5 hours) or round up
   * @default false - rounds up to nearest integer
   */
  precise?: boolean
}

/**
 * Format seconds into a human-friendly time representation
 *
 * @param seconds - Number of seconds to format
 * @param options - Formatting options
 * @returns Object with value and unit for i18n integration
 *
 * @example
 * ```ts
 * formatTime(30) // { value: 30, unit: 'second' }
 * formatTime(90) // { value: 2, unit: 'minute' }
 * formatTime(3600) // { value: 1, unit: 'hour' }
 * formatTime(86400) // { value: 1, unit: 'day' }
 * ```
 */
export function formatTime(
  seconds: number,
  options: FormatTimeOptions = {}
): FormattedTime {
  const { precise = false, maxUnit = "day" } = options

  // Order matters: check from largest to smallest unit
  const units: { threshold: number; unit: TimeUnit; divisor: number }[] = [
    { threshold: 86_400, unit: "day", divisor: 86_400 }, // 24 * 60 * 60
    { threshold: 3600, unit: "hour", divisor: 3600 }, // 60 * 60
    { threshold: 60, unit: "minute", divisor: 60 },
    { threshold: 0, unit: "second", divisor: 1 }
  ]

  // Filter units based on maxUnit
  const maxUnitIndex = units.findIndex((u) => u.unit === maxUnit)
  const allowedUnits = units.slice(maxUnitIndex)

  // Find the appropriate unit
  for (const { threshold, unit, divisor } of allowedUnits) {
    if (seconds >= threshold) {
      const value = precise ? seconds / divisor : Math.ceil(seconds / divisor)
      return { value, unit }
    }
  }

  // Fallback to seconds
  return { value: seconds, unit: "second" }
}

/**
 * Legacy function for rate limit formatting
 * @deprecated Use formatTime instead
 */
export function formatRateLimitTime(seconds: number): FormattedTime {
  return formatTime(seconds, { maxUnit: "hour" })
}

/**
 * Helper to get i18n key for time unit
 *
 * @param unit - The time unit
 * @param namespace - i18n namespace (default: 'avatar')
 * @returns The i18n key path
 *
 * @example
 * ```ts
 * getTimeUnitKey('second') // 'avatar.timeUnit.second'
 * getTimeUnitKey('minute', 'common') // 'common.timeUnit.minute'
 * ```
 */
export function getTimeUnitKey(unit: TimeUnit, namespace = "avatar"): string {
  return `${namespace}.timeUnit.${unit}`
}

/**
 * Helper to format time with i18n translation function
 *
 * @param seconds - Number of seconds to format
 * @param t - i18n translation function
 * @param options - Formatting and translation options
 * @returns Translated time string
 *
 * @example
 * ```ts
 * formatTimeWithI18n(90, t) // "2 minutes" (or "2 分钟" in Chinese)
 * formatTimeWithI18n(90, t, { namespace: 'common' })
 * ```
 */
export function formatTimeWithI18n(
  seconds: number,
  t: (key: string) => string,
  options: FormatTimeOptions & { namespace?: string } = {}
): { value: number; unit: string } {
  const { namespace = "avatar", ...formatOptions } = options
  const { value, unit } = formatTime(seconds, formatOptions)
  return {
    value,
    unit: t(getTimeUnitKey(unit, namespace))
  }
}

/**
 * Get the timezone offset in minutes
 * Returns a positive value for timezones ahead of UTC, negative for behind
 *
 * @returns Timezone offset in minutes
 *
 * @example
 * ```ts
 * getTzOffset() // 480 for UTC+8 (Beijing)
 * getTzOffset() // -300 for UTC-5 (New York)
 * ```
 */
export function getTzOffset(): number {
  return -new Date().getTimezoneOffset()
}

/**
 * Greeting key type for i18n
 */
export type GreetingKey = "goodMorning" | "goodAfternoon" | "goodEvening"

/**
 * Simple greeting key type for i18n (without name parameter)
 */
export type SimpleGreetingKey =
  | "goodMorningSimple"
  | "goodAfternoonSimple"
  | "goodEveningSimple"

/**
 * Get greeting key based on current hour
 *
 * @returns Greeting key for i18n translation
 *
 * @example
 * ```ts
 * getGreetingKey() // 'goodMorning' (before 12:00)
 * getGreetingKey() // 'goodAfternoon' (12:00-17:59)
 * getGreetingKey() // 'goodEvening' (after 18:00)
 * ```
 */
export function getGreetingKey(): GreetingKey {
  const hour = new Date().getHours()
  if (hour < 12) {
    return "goodMorning"
  }
  if (hour < 18) {
    return "goodAfternoon"
  }
  return "goodEvening"
}

/**
 * Get simple greeting key (without name parameter)
 *
 * @returns Simple greeting key for i18n translation
 *
 * @example
 * ```ts
 * getSimpleGreetingKey() // 'goodMorningSimple' (before 12:00)
 * getSimpleGreetingKey() // 'goodAfternoonSimple' (12:00-17:59)
 * getSimpleGreetingKey() // 'goodEveningSimple' (after 18:00)
 * ```
 */
export function getSimpleGreetingKey(): SimpleGreetingKey {
  const hour = new Date().getHours()
  if (hour < 12) {
    return "goodMorningSimple"
  }
  if (hour < 18) {
    return "goodAfternoonSimple"
  }
  return "goodEveningSimple"
}
