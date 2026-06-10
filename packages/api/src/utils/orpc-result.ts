/**
 * ORPC Result Bridge
 *
 * Bridges the functional Result type with ORPCError for API error handling.
 * Provides type-safe error creation and Result unwrapping that throws ORPCError.
 */

import type { Result } from "@folionote/utils"
import { ORPCError } from "@orpc/server"

/**
 * Supported ORPC error codes
 */
export type AppErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "TOO_MANY_REQUESTS"
  | "INTERNAL_SERVER_ERROR"

/**
 * Standard application error type for use with Result
 */
export interface AppError {
  code: AppErrorCode
  message: string
  data?: unknown
}

// ============================================
// Error Factory Functions
// ============================================

/**
 * Create a NOT_FOUND error
 */
export function notFound(message = "Resource not found"): AppError {
  return { code: "NOT_FOUND", message }
}

/**
 * Create a BAD_REQUEST error
 */
export function badRequest(message: string): AppError {
  return { code: "BAD_REQUEST", message }
}

/**
 * Create a CONFLICT error (e.g., version conflict)
 */
export function conflict(message: string, data?: unknown): AppError {
  return { code: "CONFLICT", message, data }
}

/**
 * Create an UNAUTHORIZED error
 */
export function unauthorized(message = "Unauthorized"): AppError {
  return { code: "UNAUTHORIZED", message }
}

/**
 * Create a FORBIDDEN error
 */
export function forbidden(message = "Forbidden"): AppError {
  return { code: "FORBIDDEN", message }
}

/**
 * Create an INTERNAL_SERVER_ERROR
 */
export function internalError(message = "Internal server error"): AppError {
  return { code: "INTERNAL_SERVER_ERROR", message }
}

// ============================================
// Result → ORPCError Bridge
// ============================================

/**
 * Convert AppError to ORPCError and throw
 */
export function throwAppError(error: AppError): never {
  throw new ORPCError(error.code, {
    message: error.message,
    data: error.data
  })
}

/**
 * Unwrap a Result, throwing ORPCError if it's an Err
 *
 * @example
 * const result = await findOneOrNotFound(...)
 * return unwrapOrThrow(result) // throws ORPCError if not found
 */
export function unwrapOrThrow<T>(result: Result<T, AppError>): T {
  if (result.ok) {
    return result.value
  }
  throwAppError(result.error)
}
