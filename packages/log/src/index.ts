// Core exports

// Utility exports (for advanced use cases)
export { isBrowser, isNode, supportsColor } from "./colors"
export type { HonoLoggerOptions } from "./hono"
// Hono integration
export { createHonoLogger } from "./hono"
export { createLogger } from "./logger"
export type { Logger, LoggerOptions, LogLevel } from "./types"

// Default logger instance
import { createLogger } from "./logger"

/**
 * Default logger instance for quick usage
 *
 * @example
 * ```ts
 * import { log } from '@folionote/log'
 *
 * log.info('Application started')
 * log.error('Something went wrong', error)
 * ```
 */
export const log = createLogger()
