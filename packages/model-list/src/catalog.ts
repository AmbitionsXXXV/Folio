/**
 * Canonical AI model catalog schema — the single source of truth.
 *
 * This is THE one schema shared end-to-end:
 * - the upstream fetcher normalizes models.dev / Vercel AI Gateway into it,
 * - the database stores exactly this shape (text columns + jsonb mirrors),
 * - the oRPC `getModelCatalog` response returns it,
 * - the web/native frontend renders from it.
 *
 * Keeping one schema is the whole point: there is no per-layer redefinition and
 * no provider-id translation table to keep in sync.
 */

import { z } from "zod"

import { AiModelTypeSchema } from "./types"

/**
 * Where a catalog row came from. `seed` is the bundled fallback shipped in this
 * package; the others are live upstream sources.
 */
export const CatalogSourceSchema = z.enum([
  "models.dev",
  "vercel-gateway",
  "seed"
])
export type CatalogSource = z.infer<typeof CatalogSourceSchema>

/**
 * Model capability flags, unified across upstream sources. All optional: an
 * absent flag means "unknown", which the UI treats as "not supported".
 */
export const CatalogModelAbilitiesSchema = z.object({
  reasoning: z.boolean().optional(),
  functionCall: z.boolean().optional(),
  vision: z.boolean().optional(),
  files: z.boolean().optional(),
  structuredOutput: z.boolean().optional(),
  search: z.boolean().optional(),
  imageOutput: z.boolean().optional(),
  video: z.boolean().optional()
})
export type CatalogModelAbilities = z.infer<typeof CatalogModelAbilitiesSchema>

/**
 * Normalized pricing, always USD per 1,000,000 tokens. An absent dimension means
 * the upstream source did not publish a price for it. (SQL NULL is mapped to
 * `undefined` at the DB boundary, so the public shape stays null-free.)
 */
export const CatalogModelPricingSchema = z.object({
  currency: z.literal("USD").default("USD"),
  input: z.number().optional(),
  output: z.number().optional(),
  cacheRead: z.number().optional(),
  cacheWrite: z.number().optional()
})
export type CatalogModelPricing = z.infer<typeof CatalogModelPricingSchema>

/** Extended params carried for UI toggles (e.g. reasoning effort, thinking budget). */
export const CatalogModelSettingsSchema = z.object({
  extendParams: z.array(z.string()).optional()
})
export type CatalogModelSettings = z.infer<typeof CatalogModelSettingsSchema>

/**
 * THE model shape. `enabled` is the catalog default; per-user enable/disable
 * overrides live in `user_ai_model_settings` and are applied at read time.
 */
export const CatalogModelSchema = z.object({
  /** Provider-native model id used for inference (e.g. "claude-sonnet-4-5"). */
  id: z.string(),
  /** Canonical provider id (e.g. "anthropic", "google", "openai"). */
  providerId: z.string(),
  type: AiModelTypeSchema,
  displayName: z.string(),
  enabled: z.boolean().default(false),
  abilities: CatalogModelAbilitiesSchema.default({}),
  /** Convenience mirror of abilities.reasoning, kept for existing callers. */
  reasoning: z.boolean().optional(),
  contextWindowTokens: z.number().int().nonnegative().optional(),
  maxOutputTokens: z.number().int().nonnegative().optional(),
  pricing: CatalogModelPricingSchema.optional(),
  settings: CatalogModelSettingsSchema.optional(),
  releasedAt: z.string().optional(),
  knowledgeCutoff: z.string().optional(),
  legacy: z.boolean().optional(),
  source: CatalogSourceSchema.default("seed")
})
export type CatalogModel = z.infer<typeof CatalogModelSchema>

/** THE provider shape. */
export const CatalogProviderSchema = z.object({
  id: z.string(),
  name: z.string(),
  logo: z.string().optional(),
  enabled: z.boolean().default(true),
  sort: z.number().int().optional(),
  docUrl: z.string().optional(),
  source: CatalogSourceSchema.default("seed")
})
export type CatalogProvider = z.infer<typeof CatalogProviderSchema>

export const ModelCatalogSchema = z.object({
  providers: z.array(CatalogProviderSchema),
  models: z.array(CatalogModelSchema)
})
export type ModelCatalog = z.infer<typeof ModelCatalogSchema>
