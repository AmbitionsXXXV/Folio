/**
 * Time unit types for i18n
 */
export type TimeUnit = 'second' | 'minute' | 'hour' | 'day'

/**
 * Formatted time result with value and unit
 */
export interface FormattedTime {
	value: number
	unit: TimeUnit
}

/**
 * Time formatting options
 */
export interface FormatTimeOptions {
	/**
	 * Whether to use precise values (e.g., 1.5 hours) or round up
	 * @default false - rounds up to nearest integer
	 */
	precise?: boolean
	/**
	 * Maximum unit to use (e.g., 'hour' will not convert to days)
	 * @default 'day'
	 */
	maxUnit?: TimeUnit
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
	const { precise = false, maxUnit = 'day' } = options

	// Order matters: check from largest to smallest unit
	const units: Array<{ threshold: number; unit: TimeUnit; divisor: number }> = [
		{ threshold: 86_400, unit: 'day', divisor: 86_400 }, // 24 * 60 * 60
		{ threshold: 3600, unit: 'hour', divisor: 3600 }, // 60 * 60
		{ threshold: 60, unit: 'minute', divisor: 60 },
		{ threshold: 0, unit: 'second', divisor: 1 },
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
	return { value: seconds, unit: 'second' }
}

/**
 * Legacy function for rate limit formatting
 * @deprecated Use formatTime instead
 */
export function formatRateLimitTime(seconds: number): FormattedTime {
	return formatTime(seconds, { maxUnit: 'hour' })
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
export function getTimeUnitKey(unit: TimeUnit, namespace = 'avatar'): string {
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
	const { namespace = 'avatar', ...formatOptions } = options
	const { value, unit } = formatTime(seconds, formatOptions)
	return {
		value,
		unit: t(getTimeUnitKey(unit, namespace)),
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
