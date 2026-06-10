/**
 * Model-list constants
 *
 * Constants derived from Zod schemas for runtime use.
 * These are the canonical source of truth for model types.
 */

import { DEFAULT_MODEL_PROVIDER_LIST } from "./model-providers"
import { AiModelTypeSchema } from "./types"

/**
 * All supported AI model types.
 * Derived from AiModelTypeSchema to ensure type safety and single source of truth.
 */
export const MODEL_TYPES = AiModelTypeSchema.options

/**
 * Type for AI model types (derived from the Zod schema)
 */
export type ModelType = (typeof MODEL_TYPES)[number]

/**
 * All supported model provider IDs.
 * Derived from DEFAULT_MODEL_PROVIDER_LIST to ensure consistency.
 */
export const MODEL_PROVIDER_IDS = DEFAULT_MODEL_PROVIDER_LIST.map((p) => p.id)

/**
 * Type for model provider IDs (derived from the provider list)
 */
export type ModelProviderId = (typeof DEFAULT_MODEL_PROVIDER_LIST)[number]["id"]
