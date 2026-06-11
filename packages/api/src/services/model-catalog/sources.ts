/**
 * Upstream model catalog sources.
 *
 * Primary: models.dev (rich, normalized catalog across all providers).
 * Fallback: Vercel AI Gateway `/v1/models` (sparser, but pricing + context).
 *
 * Both are normalized into the single canonical catalog shape. The fetcher is
 * fault-tolerant: if models.dev is unavailable it transparently falls back to
 * the gateway, so a single channel outage never breaks the refresh.
 */

import { createLogger } from "@folionote/log"
import type {
  CatalogModel,
  CatalogProvider,
  CatalogSource,
  ModelCatalog
} from "@folionote/model-list"

const log = createLogger({ prefix: "model-catalog:sources" })

const MODELS_DEV_URL = "https://models.dev/api.json"
const VERCEL_GATEWAY_URL = "https://ai-gateway.vercel.sh/v1/models"
const FETCH_TIMEOUT_MS = 12_000
const TOKENS_PER_MILLION = 1_000_000

/** Canonical providers we ingest; upstream rows outside this set are dropped. */
const SUPPORTED_PROVIDERS = new Set([
  "openai",
  "anthropic",
  "google",
  "deepseek",
  "qwen",
  "xai",
  "moonshot"
])

/** Upstream provider key → our canonical provider id. */
const UPSTREAM_PROVIDER_ALIASES: Record<string, string> = {
  openai: "openai",
  anthropic: "anthropic",
  google: "google",
  "google-vertex": "google",
  "google-vertex-anthropic": "anthropic",
  deepseek: "deepseek",
  xai: "xai",
  qwen: "qwen",
  alibaba: "qwen",
  moonshot: "moonshot",
  moonshotai: "moonshot"
}

const PROVIDER_DISPLAY_NAMES: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  deepseek: "DeepSeek",
  qwen: "Qwen",
  xai: "xAI",
  moonshot: "Moonshot"
}

export interface UpstreamCatalog extends ModelCatalog {
  source: CatalogSource
}

function toCanonicalProvider(upstreamKey: string): string | null {
  const key = upstreamKey.trim().toLowerCase()
  const canonical = UPSTREAM_PROVIDER_ALIASES[key] ?? key
  return SUPPORTED_PROVIDERS.has(canonical) ? canonical : null
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

async function fetchJson(url: string): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { accept: "application/json" }
    })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} from ${url}`)
    }
    return await response.json()
  } finally {
    clearTimeout(timer)
  }
}

// ============================================================================
// models.dev
// ============================================================================

interface RawModelsDevModel {
  id?: string
  name?: string
  reasoning?: boolean
  tool_call?: boolean
  attachment?: boolean
  structured_output?: boolean
  knowledge?: string
  release_date?: string
  modalities?: { input?: string[]; output?: string[] }
  limit?: { context?: number; output?: number }
  cost?: {
    input?: number
    output?: number
    cache_read?: number
    cache_write?: number
  }
}

interface RawModelsDevProvider {
  id?: string
  name?: string
  doc?: string
  models?: Record<string, RawModelsDevModel>
}

function inferModelsDevType(model: RawModelsDevModel): CatalogModel["type"] {
  const output = model.modalities?.output ?? []
  if (output.includes("image")) {
    return "image"
  }
  if (output.includes("audio")) {
    return "tts"
  }
  if (output.includes("embedding")) {
    return "embedding"
  }
  return "chat"
}

function normalizeModelsDev(raw: unknown): ModelCatalog {
  const providers: CatalogProvider[] = []
  const models: CatalogModel[] = []

  if (!raw || typeof raw !== "object") {
    return { providers, models }
  }

  for (const [upstreamKey, value] of Object.entries(
    raw as Record<string, RawModelsDevProvider>
  )) {
    const providerId = toCanonicalProvider(upstreamKey)
    if (!(providerId && value && typeof value === "object")) {
      continue
    }

    providers.push({
      id: providerId,
      name: value.name ?? PROVIDER_DISPLAY_NAMES[providerId] ?? providerId,
      enabled: true,
      docUrl: value.doc,
      source: "models.dev"
    })

    for (const [modelKey, model] of Object.entries(value.models ?? {})) {
      const id = model.id ?? modelKey
      const cost = model.cost
      models.push({
        id,
        providerId,
        type: inferModelsDevType(model),
        displayName: model.name ?? id,
        enabled: false,
        abilities: {
          reasoning: model.reasoning,
          functionCall: model.tool_call,
          vision: model.modalities?.input?.includes("image"),
          files: model.attachment,
          structuredOutput: model.structured_output,
          imageOutput: model.modalities?.output?.includes("image"),
          video: model.modalities?.input?.includes("video")
        },
        reasoning: model.reasoning,
        contextWindowTokens: model.limit?.context,
        maxOutputTokens: model.limit?.output,
        pricing: cost
          ? {
              currency: "USD",
              input: cost.input,
              output: cost.output,
              cacheRead: cost.cache_read,
              cacheWrite: cost.cache_write
            }
          : undefined,
        releasedAt: model.release_date,
        knowledgeCutoff: model.knowledge,
        source: "models.dev"
      })
    }
  }

  return { providers, models }
}

// ============================================================================
// Vercel AI Gateway
// ============================================================================

interface RawGatewayModel {
  id?: string
  name?: string
  type?: string
  context_window?: number
  max_tokens?: number
  pricing?: {
    input?: string | number
    output?: string | number
    cachedInputTokens?: string | number
    cacheCreationInputTokens?: string | number
  }
}

function mapGatewayType(type?: string): CatalogModel["type"] {
  switch (type) {
    case "embedding":
      return "embedding"
    case "image":
      return "image"
    default:
      return "chat"
  }
}

function toNumber(value: unknown): number | undefined {
  const parsed =
    typeof value === "string"
      ? Number.parseFloat(value)
      : typeof value === "number"
        ? value
        : Number.NaN
  return Number.isFinite(parsed) ? parsed : undefined
}

/** Gateway pricing is per-token; the canonical shape is per 1M tokens. */
function toPerMillion(value: unknown): number | undefined {
  const perToken = toNumber(value)
  return perToken === undefined ? undefined : perToken * TOKENS_PER_MILLION
}

function normalizeGateway(raw: unknown): ModelCatalog {
  const data =
    raw && typeof raw === "object" && Array.isArray((raw as { data?: unknown }).data)
      ? ((raw as { data: RawGatewayModel[] }).data)
      : []

  const providerMap = new Map<string, CatalogProvider>()
  const models: CatalogModel[] = []

  for (const model of data) {
    const slashIndex = model.id?.indexOf("/") ?? -1
    if (!model.id || slashIndex <= 0) {
      continue
    }
    const creator = model.id.slice(0, slashIndex)
    const modelId = model.id.slice(slashIndex + 1)
    const providerId = toCanonicalProvider(creator)
    if (!(providerId && modelId)) {
      continue
    }

    if (!providerMap.has(providerId)) {
      providerMap.set(providerId, {
        id: providerId,
        name: PROVIDER_DISPLAY_NAMES[providerId] ?? providerId,
        enabled: true,
        source: "vercel-gateway"
      })
    }

    models.push({
      id: modelId,
      providerId,
      type: mapGatewayType(model.type),
      displayName: model.name ?? modelId,
      enabled: false,
      abilities: {},
      contextWindowTokens:
        toNumber(model.context_window) ?? toNumber(model.max_tokens),
      pricing: model.pricing
        ? {
            currency: "USD",
            input: toPerMillion(model.pricing.input),
            output: toPerMillion(model.pricing.output),
            cacheRead: toPerMillion(model.pricing.cachedInputTokens),
            cacheWrite: toPerMillion(model.pricing.cacheCreationInputTokens)
          }
        : undefined,
      source: "vercel-gateway"
    })
  }

  return { providers: [...providerMap.values()], models }
}

// ============================================================================
// Public fetch with fault-tolerant fallback
// ============================================================================

/**
 * Fetch the latest catalog from models.dev, transparently falling back to the
 * Vercel AI Gateway if the primary source is unavailable or empty.
 *
 * @throws if BOTH sources fail.
 */
export async function fetchUpstreamCatalog(): Promise<UpstreamCatalog> {
  try {
    const catalog = normalizeModelsDev(await fetchJson(MODELS_DEV_URL))
    if (catalog.models.length === 0) {
      throw new Error("models.dev returned no usable models")
    }
    log.info(`Fetched ${catalog.models.length} models from models.dev`)
    return { source: "models.dev", ...catalog }
  } catch (primaryError) {
    log.warn(
      "models.dev fetch failed; falling back to Vercel AI Gateway:",
      errorMessage(primaryError)
    )
    try {
      const catalog = normalizeGateway(await fetchJson(VERCEL_GATEWAY_URL))
      if (catalog.models.length === 0) {
        throw new Error("Vercel AI Gateway returned no usable models")
      }
      log.info(`Fetched ${catalog.models.length} models from Vercel AI Gateway`)
      return { source: "vercel-gateway", ...catalog }
    } catch (fallbackError) {
      throw new Error(
        `All model sources failed — models.dev: ${errorMessage(primaryError)}; vercel-gateway: ${errorMessage(fallbackError)}`
      )
    }
  }
}
