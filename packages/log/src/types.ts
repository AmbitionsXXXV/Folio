/**
 * Log level types
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

/**
 * Logger configuration options
 */
export interface LoggerOptions {
	/** Enable/disable colors (auto-detected by default) */
	colors?: boolean
	/** Minimum log level to output (default: 'debug') */
	level?: LogLevel
	/** Optional prefix for all log messages */
	prefix?: string
	/** Show timestamp in logs (default: true for server, false for browser) */
	timestamp?: boolean
}

/**
 * Logger interface
 */
export interface Logger {
	/** Create a child logger with an additional prefix */
	child(prefix: string): Logger
	debug(...args: unknown[]): void
	error(...args: unknown[]): void
	info(...args: unknown[]): void
	warn(...args: unknown[]): void
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
