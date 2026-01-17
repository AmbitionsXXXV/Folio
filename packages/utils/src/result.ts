/**
 * Result Type Utilities
 *
 * A functional approach to error handling that makes success/failure explicit.
 * Provides type-safe error handling without exceptions.
 *
 * @example
 * // Instead of throwing
 * const result = await fromPromise(fetchUser(id))
 * if (!result.ok) {
 *   return err({ code: 'NOT_FOUND', message: result.error.message })
 * }
 * return ok(result.value)
 */

/**
 * Result type - represents either success (Ok) or failure (Err)
 */
export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E }

/**
 * Create a successful Result
 */
export function ok<T>(value: T): Result<T, never> {
	return { ok: true, value }
}

/**
 * Create a failed Result
 */
export function err<E>(error: E): Result<never, E> {
	return { ok: false, error }
}

/**
 * Wrap a synchronous function that might throw into a Result
 */
export function fromTry<T>(fn: () => T): Result<T, Error> {
	try {
		return ok(fn())
	} catch (error) {
		return err(error instanceof Error ? error : new Error(String(error)))
	}
}

/**
 * Wrap a Promise into a Result
 */
export async function fromPromise<T>(
	promise: Promise<T>
): Promise<Result<T, Error>> {
	try {
		const value = await promise
		return ok(value)
	} catch (error) {
		return err(error instanceof Error ? error : new Error(String(error)))
	}
}

/**
 * Map over a successful Result
 */
export function map<T, U, E>(
	result: Result<T, E>,
	fn: (value: T) => U
): Result<U, E> {
	if (result.ok) {
		return ok(fn(result.value))
	}
	return result
}

/**
 * Map over a failed Result
 */
export function mapError<T, E, F>(
	result: Result<T, E>,
	fn: (error: E) => F
): Result<T, F> {
	if (!result.ok) {
		return err(fn(result.error))
	}
	return result
}

/**
 * Chain Results together (flatMap)
 */
export function flatMap<T, U, E>(
	result: Result<T, E>,
	fn: (value: T) => Result<U, E>
): Result<U, E> {
	if (result.ok) {
		return fn(result.value)
	}
	return result
}

/**
 * Unwrap a Result, throwing if it's an error
 */
export function unwrap<T, E>(result: Result<T, E>): T {
	if (result.ok) {
		return result.value
	}
	throw result.error
}

/**
 * Unwrap a Result with a default value
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
	if (result.ok) {
		return result.value
	}
	return defaultValue
}

/**
 * Check if a Result is Ok
 */
export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
	return result.ok
}

/**
 * Check if a Result is Err
 */
export function isErr<T, E>(
	result: Result<T, E>
): result is { ok: false; error: E } {
	return !result.ok
}

/**
 * Combine multiple Results into a single Result
 * Returns Ok with array of values if all succeed, or first Err if any fail
 */
export function all<T, E>(results: Result<T, E>[]): Result<T[], E> {
	const values: T[] = []
	for (const result of results) {
		if (!result.ok) {
			return result
		}
		values.push(result.value)
	}
	return ok(values)
}

/**
 * Match on a Result, providing handlers for both cases
 */
export function match<T, E, U>(
	result: Result<T, E>,
	handlers: {
		ok: (value: T) => U
		err: (error: E) => U
	}
): U {
	if (result.ok) {
		return handlers.ok(result.value)
	}
	return handlers.err(result.error)
}
