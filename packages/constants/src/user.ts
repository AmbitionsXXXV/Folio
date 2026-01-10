/**
 * User-related constants and utility functions
 */

/**
 * Number of digits to pad user number (e.g., 5 digits -> "00001")
 */
export const USER_NO_PAD_LENGTH = 5

/**
 * Milliseconds per day constant
 */
const MS_PER_DAY = 1000 * 60 * 60 * 24

/**
 * Format user number for display
 * Converts numeric user ID to zero-padded string format
 *
 * @param no - User number (nullable)
 * @returns Formatted string like "00001" or "-" if null/undefined
 *
 * @example
 * formatUserNo(1)    // "00001"
 * formatUserNo(123)  // "00123"
 * formatUserNo(null) // "-"
 */
export function formatUserNo(no: number | undefined | null): string {
	if (no === undefined || no === null) return '-'
	return no.toString().padStart(USER_NO_PAD_LENGTH, '0')
}

/**
 * Calculate the number of days since a given date
 *
 * @param date - The start date (nullable)
 * @returns Number of days since the date, or 0 if date is null/undefined
 *
 * @example
 * getDaysSince(new Date('2024-01-01')) // Returns days since Jan 1, 2024
 * getDaysSince(null)                   // Returns 0
 */
export function getDaysSince(date: Date | string | undefined | null): number {
	if (!date) return 0
	const d = typeof date === 'string' ? new Date(date) : date
	const now = new Date()
	const diffTime = now.getTime() - d.getTime()
	return Math.max(0, Math.floor(diffTime / MS_PER_DAY))
}
