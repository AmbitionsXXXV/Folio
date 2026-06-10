/**
 * Database Query Helpers
 *
 * Utility functions that wrap common database query patterns with Result type.
 * These helpers make error handling more explicit and composable.
 */

import type { Result } from "@folionote/utils"
import { err, fromPromise, ok } from "@folionote/utils"

import { internalError, notFound } from "./orpc-result"
import type { AppError } from "./orpc-result"

/**
 * Find a single record, returning NOT_FOUND error if not found
 *
 * @example
 * const result = await findOneOrNotFound(
 *   () => db.select().from(sources).where(eq(sources.id, id)).limit(1),
 *   'Source not found'
 * )
 * return unwrapOrThrow(result)
 */
export async function findOneOrNotFound<T>(
  queryFn: () => Promise<T[]>,
  errorMessage?: string
): Promise<Result<T, AppError>> {
  const result = await fromPromise(queryFn())

  if (!result.ok) {
    return err(internalError(result.error.message))
  }

  const [item] = result.value
  if (!item) {
    return err(notFound(errorMessage))
  }

  return ok(item)
}

/**
 * Find a single record that may or may not exist
 * Returns Ok(undefined) if not found instead of an error
 *
 * @example
 * const result = await findOneOptional(
 *   () => db.select().from(settings).where(eq(settings.userId, userId)).limit(1)
 * )
 * if (result.ok) {
 *   const settings = result.value // T | undefined
 * }
 */
export async function findOneOptional<T>(
  queryFn: () => Promise<T[]>
): Promise<Result<T | undefined, AppError>> {
  const result = await fromPromise(queryFn())

  if (!result.ok) {
    return err(internalError(result.error.message))
  }

  return ok(result.value[0])
}

/**
 * Execute a query and return the results
 * Wraps any database errors in an InternalError
 *
 * @example
 * const result = await queryMany(
 *   () => db.select().from(entries).where(eq(entries.userId, userId))
 * )
 */
export async function queryMany<T>(
  queryFn: () => Promise<T[]>
): Promise<Result<T[], AppError>> {
  const result = await fromPromise(queryFn())

  if (!result.ok) {
    return err(internalError(result.error.message))
  }

  return ok(result.value)
}

/**
 * Execute an insert/update/delete and return the first result
 * Returns NOT_FOUND if no rows were affected
 *
 * @example
 * const result = await mutateOne(
 *   () => db.update(sources).set({ title }).where(...).returning(),
 *   'Source not found'
 * )
 */
export async function mutateOne<T>(
  queryFn: () => Promise<T[]>,
  errorMessage?: string
): Promise<Result<T, AppError>> {
  const result = await fromPromise(queryFn())

  if (!result.ok) {
    return err(internalError(result.error.message))
  }

  const [item] = result.value
  if (!item) {
    return err(notFound(errorMessage))
  }

  return ok(item)
}
