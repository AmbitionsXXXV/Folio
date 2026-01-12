import {
	formatLevel,
	formatPrefix,
	formatTimestamp,
	isNode,
	supportsColor,
} from './colors'
import {
	LOG_LEVEL_PRIORITY,
	type Logger,
	type LoggerOptions,
	type LogLevel,
} from './types'

/**
 * Create a logger instance
 *
 * @example
 * ```ts
 * // Basic usage
 * const log = createLogger()
 * log.info('Hello world')
 *
 * // With prefix
 * const log = createLogger({ prefix: 'api' })
 * log.info('Request received')  // [api] Request received
 *
 * // Child logger
 * const dbLog = log.child('db')
 * dbLog.warn('Connection slow')  // [api:db] Connection slow
 * ```
 */
export function createLogger(options: LoggerOptions = {}): Logger {
	const {
		prefix = '',
		level = 'debug',
		colors = isNode() ? supportsColor() : false,
		timestamp = isNode(),
	} = options

	const minPriority = LOG_LEVEL_PRIORITY[level]

	/**
	 * Internal log function
	 */
	function log(logLevel: LogLevel, args: unknown[]): void {
		// Check if this level should be logged
		if (LOG_LEVEL_PRIORITY[logLevel] < minPriority) {
			return
		}

		// Get the appropriate console method
		const consoleFn = logLevel === 'debug' ? console.debug : console[logLevel]

		// Build the log message parts
		const parts: string[] = []

		if (timestamp) {
			parts.push(formatTimestamp(colors))
		}

		parts.push(formatLevel(logLevel, colors))

		if (prefix) {
			parts.push(formatPrefix(prefix, colors))
		}

		// Output the log
		consoleFn(parts.join(' '), ...args)
	}

	return {
		debug(...args: unknown[]) {
			log('debug', args)
		},
		info(...args: unknown[]) {
			log('info', args)
		},
		warn(...args: unknown[]) {
			log('warn', args)
		},
		error(...args: unknown[]) {
			log('error', args)
		},
		child(childPrefix: string): Logger {
			const newPrefix = prefix ? `${prefix}:${childPrefix}` : childPrefix
			return createLogger({
				prefix: newPrefix,
				level,
				colors,
				timestamp,
			})
		},
	}
}
