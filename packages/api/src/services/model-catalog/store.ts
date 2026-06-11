/**
 * Model catalog store — DB-authoritative catalog with on-demand + TTL refresh.
 *
 * Read path (`getModelCatalog`) always serves from PostgreSQL and never blocks
 * on the network:
 * 1. seed the DB from bundled defaults if empty (first call only),
 * 2. kick a background refresh if the catalog is older than the TTL
 *    (stale-while-revalidate), debounced via a cooldown to avoid stampedes,
 * 3. return the current DB rows immediately.
 *
 * Refreshes upsert metadata (pricing, context, abilities, new models) but never
 * overwrite the per-row `enabled` default — that preserves the curated seed
 * defaults and any models a user has opted into. Per-user enable/disable
 * overrides live in `user_ai_*_settings` and are applied by the router.
 */

import { aiCatalogSync, aiModels, aiProviders, db } from "@folionote/db"
import { createLogger } from "@folionote/log"
import type {
  CatalogModel,
  CatalogProvider,
  CatalogSource,
  ModelCatalog
} from "@folionote/model-list"
import { and, asc, eq, sql } from "drizzle-orm"

import { buildSeedCatalog } from "./seed"
import { fetchUpstreamCatalog } from "./sources"

const log = createLogger({ prefix: "model-catalog:store" })

const SYNC_SINGLETON_ID = "singleton"
const ONE_DAY_MS = 24 * 60 * 60 * 1000
const TEN_MINUTES_MS = 10 * 60 * 1000

/** Refresh when the last successful sync is older than this. */
const CATALOG_TTL_MS = positiveEnv(process.env.AI_CATALOG_TTL_MS, ONE_DAY_MS)
/** Don't re-attempt a refresh more often than this (across requests). */
const SYNC_COOLDOWN_MS = positiveEnv(
  process.env.AI_CATALOG_SYNC_COOLDOWN_MS,
  TEN_MINUTES_MS
)
/** Upsert batch size — keeps bound parameter counts well under PG limits. */
const UPSERT_CHUNK_SIZE = 200

/** Process-local guards (best-effort; DB cooldown bounds the multi-process case). */
let seeded = false
let refreshing = false

function positiveEnv(raw: string | undefined, fallback: number): number {
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

/**
 * Collapse rows sharing a primary key (last write wins).
 *
 * Required before a batched upsert: PostgreSQL rejects an `ON CONFLICT DO UPDATE`
 * that touches the same row twice in one statement. Duplicates can arise from
 * upstream provider aliases collapsing to one canonical id (e.g. `moonshot` and
 * `moonshotai` → `moonshot`, `alibaba` → `qwen`).
 */
function dedupeById<T extends { id: string }>(rows: T[]): T[] {
  const byId = new Map<string, T>()
  for (const row of rows) {
    byId.set(row.id, row)
  }
  return [...byId.values()]
}

// ============================================================================
// Row mapping
// ============================================================================

function toProviderRow(provider: CatalogProvider) {
  return {
    id: provider.id,
    name: provider.name,
    logo: provider.logo ?? null,
    enabled: provider.enabled,
    sort: provider.sort ?? 0,
    docUrl: provider.docUrl ?? null,
    source: provider.source
  }
}

function toModelRow(model: CatalogModel) {
  return {
    id: `${model.providerId}:${model.type}:${model.id}`,
    providerId: model.providerId,
    modelId: model.id,
    type: model.type,
    displayName: model.displayName,
    enabled: model.enabled,
    abilities: model.abilities,
    contextWindowTokens: model.contextWindowTokens ?? null,
    maxOutputTokens: model.maxOutputTokens ?? null,
    pricing: model.pricing ?? null,
    settings: model.settings ?? null,
    releasedAt: model.releasedAt ?? null,
    knowledgeCutoff: model.knowledgeCutoff ?? null,
    legacy: model.legacy ?? false,
    source: model.source
  }
}

// ============================================================================
// Upsert
// ============================================================================

async function upsertCatalog(catalog: ModelCatalog): Promise<void> {
  const providerRows = dedupeById(catalog.providers.map(toProviderRow))
  const modelRows = dedupeById(catalog.models.map(toModelRow))

  if (providerRows.length > 0) {
    await db
      .insert(aiProviders)
      .values(providerRows)
      .onConflictDoUpdate({
        target: aiProviders.id,
        // Preserve `enabled` and `sort` (curated defaults / display order).
        set: {
          name: sql`excluded.name`,
          docUrl: sql`excluded.doc_url`,
          source: sql`excluded.source`,
          updatedAt: new Date()
        }
      })
  }

  for (const rows of chunk(modelRows, UPSERT_CHUNK_SIZE)) {
    await db
      .insert(aiModels)
      .values(rows)
      .onConflictDoUpdate({
        target: aiModels.id,
        // Deliberately NOT updating `enabled`: refreshes never flip a model's
        // catalog default or a user's opt-in.
        set: {
          displayName: sql`excluded.display_name`,
          abilities: sql`excluded.abilities`,
          contextWindowTokens: sql`excluded.context_window_tokens`,
          maxOutputTokens: sql`excluded.max_output_tokens`,
          pricing: sql`excluded.pricing`,
          settings: sql`excluded.settings`,
          releasedAt: sql`excluded.released_at`,
          knowledgeCutoff: sql`excluded.knowledge_cutoff`,
          legacy: sql`excluded.legacy`,
          source: sql`excluded.source`,
          updatedAt: new Date()
        }
      })
  }
}

// ============================================================================
// Read
// ============================================================================

async function readCatalog(): Promise<ModelCatalog> {
  const [providerRows, modelRows] = await Promise.all([
    db.select().from(aiProviders).orderBy(asc(aiProviders.sort)),
    db.select().from(aiModels)
  ])

  const providers: CatalogProvider[] = providerRows.map((row) => ({
    id: row.id,
    name: row.name,
    logo: row.logo ?? undefined,
    enabled: row.enabled,
    sort: row.sort,
    docUrl: row.docUrl ?? undefined,
    source: row.source as CatalogSource
  }))

  const models: CatalogModel[] = modelRows.map((row) => ({
    id: row.modelId,
    providerId: row.providerId,
    type: row.type as CatalogModel["type"],
    displayName: row.displayName,
    enabled: row.enabled,
    abilities: row.abilities ?? {},
    reasoning: row.abilities?.reasoning,
    contextWindowTokens: row.contextWindowTokens ?? undefined,
    maxOutputTokens: row.maxOutputTokens ?? undefined,
    pricing: row.pricing ?? undefined,
    settings: row.settings ?? undefined,
    releasedAt: row.releasedAt ?? undefined,
    knowledgeCutoff: row.knowledgeCutoff ?? undefined,
    legacy: row.legacy,
    source: row.source as CatalogSource
  }))

  return { providers, models }
}

// ============================================================================
// Seed + refresh lifecycle
// ============================================================================

async function ensureSeeded(): Promise<void> {
  if (seeded) {
    return
  }
  const [existing] = await db
    .select({ id: aiProviders.id })
    .from(aiProviders)
    .limit(1)
  if (existing) {
    seeded = true
    return
  }
  log.info("Seeding model catalog from @folionote/model-list defaults")
  await upsertCatalog(buildSeedCatalog())
  seeded = true
}

async function getSyncMeta() {
  const [row] = await db
    .select()
    .from(aiCatalogSync)
    .where(eq(aiCatalogSync.id, SYNC_SINGLETON_ID))
    .limit(1)
  return row
}

async function markAttempt(): Promise<void> {
  const now = new Date()
  await db
    .insert(aiCatalogSync)
    .values({ id: SYNC_SINGLETON_ID, lastAttemptAt: now })
    .onConflictDoUpdate({
      target: aiCatalogSync.id,
      set: { lastAttemptAt: now }
    })
}

async function markSuccess(source: CatalogSource, modelCount: number): Promise<void> {
  const now = new Date()
  await db
    .insert(aiCatalogSync)
    .values({
      id: SYNC_SINGLETON_ID,
      lastSyncedAt: now,
      lastAttemptAt: now,
      lastSource: source,
      lastError: null,
      modelCount
    })
    .onConflictDoUpdate({
      target: aiCatalogSync.id,
      set: {
        lastSyncedAt: now,
        lastSource: source,
        lastError: null,
        modelCount
      }
    })
}

async function markFailure(error: unknown): Promise<void> {
  const message = errorMessage(error)
  await db
    .insert(aiCatalogSync)
    .values({
      id: SYNC_SINGLETON_ID,
      lastAttemptAt: new Date(),
      lastError: message
    })
    .onConflictDoUpdate({
      target: aiCatalogSync.id,
      set: { lastError: message }
    })
}

async function refreshCatalog(): Promise<void> {
  if (refreshing) {
    return
  }
  refreshing = true
  try {
    await markAttempt()
    const upstream = await fetchUpstreamCatalog()
    await upsertCatalog(upstream)
    await markSuccess(upstream.source, upstream.models.length)
    log.info(
      `Model catalog refreshed from ${upstream.source} (${upstream.models.length} models)`
    )
  } catch (error) {
    await markFailure(error)
    log.warn("Model catalog refresh failed:", errorMessage(error))
  } finally {
    refreshing = false
  }
}

async function ensureFresh(): Promise<void> {
  if (refreshing) {
    return
  }
  const meta = await getSyncMeta()
  const now = Date.now()
  const lastSynced = meta?.lastSyncedAt?.getTime() ?? 0
  const lastAttempt = meta?.lastAttemptAt?.getTime() ?? 0
  const isStale = now - lastSynced > CATALOG_TTL_MS
  const inCooldown = now - lastAttempt < SYNC_COOLDOWN_MS
  if (!isStale || inCooldown) {
    return
  }
  await refreshCatalog()
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Return the full catalog from the database, seeding on first use and triggering
 * a non-blocking background refresh when the data is stale.
 */
export async function getModelCatalog(): Promise<ModelCatalog> {
  await ensureSeeded()
  void ensureFresh().catch((error) => {
    log.warn("Background catalog refresh check failed:", errorMessage(error))
  })
  return await readCatalog()
}

/** Whether a model exists in the catalog (for write-validation). */
export async function catalogModelExists(
  providerId: string,
  modelId: string,
  type: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: aiModels.id })
    .from(aiModels)
    .where(
      and(
        eq(aiModels.providerId, providerId),
        eq(aiModels.modelId, modelId),
        eq(aiModels.type, type)
      )
    )
    .limit(1)
  return Boolean(row)
}

/** Whether a provider exists in the catalog (for write-validation). */
export async function catalogProviderExists(
  providerId: string
): Promise<boolean> {
  const [row] = await db
    .select({ id: aiProviders.id })
    .from(aiProviders)
    .where(eq(aiProviders.id, providerId))
    .limit(1)
  return Boolean(row)
}

/** Catalog default enabled state for a model, or undefined if it is unknown. */
export async function getModelEnabledDefault(
  providerId: string,
  modelId: string,
  type: string
): Promise<boolean | undefined> {
  const [row] = await db
    .select({ enabled: aiModels.enabled })
    .from(aiModels)
    .where(
      and(
        eq(aiModels.providerId, providerId),
        eq(aiModels.modelId, modelId),
        eq(aiModels.type, type)
      )
    )
    .limit(1)
  return row?.enabled
}

/** Catalog default enabled state for a provider, or undefined if it is unknown. */
export async function getProviderEnabledDefault(
  providerId: string
): Promise<boolean | undefined> {
  const [row] = await db
    .select({ enabled: aiProviders.enabled })
    .from(aiProviders)
    .where(eq(aiProviders.id, providerId))
    .limit(1)
  return row?.enabled
}
