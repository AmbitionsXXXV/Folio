/**
 * Log level types
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Logger configuration options
 */
export interface LoggerOptions {
	/** Optional prefix for all log messages */
	prefix?: string
	/** Minimum log level to output (default: 'debug') */
	level?: LogLevel
	/** Enable/disable colors (auto-detected by default) */
	colors?: boolean
	/** Show timestamp in logs (default: true for server, false for browser) */
	timestamp?: boolean
}

/**
 * Logger interface
 */
export interface Logger {
	debug(...args: unknown[]): void
	info(...args: unknown[]): void
	warn(...args: unknown[]): void
	error(...args: unknown[]): void
	/** Create a child logger with an additional prefix */
	child(prefix: string): Logger
}

/**
 * Log level priority (higher = more severe)
 */
export const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
	debug: 0,
	info: 1,
	warn: 2,
	error: 3,
}
