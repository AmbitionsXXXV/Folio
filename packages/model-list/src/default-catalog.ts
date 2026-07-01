/**
 * Default catalog — maps the bundled model-list defaults into the canonical
 * {@link ModelCatalog} shape.
 *
 * This is the single source of truth for the offline/default catalog, shared by:
 * - the server, to bootstrap an empty database (so the UI has models before the
 *   first upstream fetch) and as the offline fallback when upstream sources fail,
 * - the web/native clients, as instant `placeholderData` so the model selector
 *   and settings render without waiting on the network round-trip.
 *
 * It is intentionally pure (no DB, no network), so it is safe to evaluate on the
 * client at module load.
 */

import { FOLIO_DEFAULT_MODEL_LIST } from "./ai-models"
import type {
  CatalogModel,
  CatalogModelAbilities,
  CatalogModelPricing,
  CatalogProvider,
  ModelCatalog
} from "./catalog"
import { DEFAULT_MODEL_PROVIDER_LIST } from "./model-providers"
import type { ModelAbilities, Pricing } from "./types"

function toAbilities(abilities?: ModelAbilities): CatalogModelAbilities {
  if (!abilities) {
    return {}
  }
  return {
    reasoning: abilities.reasoning,
    functionCall: abilities.functionCall,
    vision: abilities.vision,
    files: abilities.files,
    structuredOutput: abilities.structuredOutput,
    search: abilities.search,
    imageOutput: abilities.imageOutput,
    video: abilities.video
  }
}

/**
 * Best-effort extraction of flat USD pricing from the legacy unit-based pricing.
 * Only fixed USD units are mapped; tiered/lookup or CNY pricing yields undefined
 * and is later filled by the upstream refresh.
 */
function toPricing(pricing?: Pricing): CatalogModelPricing | undefined {
  if (!pricing || pricing.currency === "CNY") {
    return undefined
  }
  const fixedRate = (name: string): number | undefined => {
    const unit = pricing.units.find(
      (candidate) => candidate.name === name && candidate.strategy === "fixed"
    )
    return unit && "rate" in unit ? unit.rate : undefined
  }
  const input = fixedRate("textInput")
  const output = fixedRate("textOutput")
  const cacheRead = fixedRate("textInput_cacheRead")
  const cacheWrite = fixedRate("textInput_cacheWrite")
  if (
    input === undefined &&
    output === undefined &&
    cacheRead === undefined &&
    cacheWrite === undefined
  ) {
    return undefined
  }
  return { currency: "USD", input, output, cacheRead, cacheWrite }
}

/** Build the canonical default catalog from the bundled model-list defaults. */
export function buildDefaultCatalog(): ModelCatalog {
  const providers: CatalogProvider[] = DEFAULT_MODEL_PROVIDER_LIST.map(
    (provider, index) => ({
      id: provider.id,
      name: provider.name,
      logo: provider.logo,
      enabled: provider.enabled ?? true,
      sort: index,
      docUrl: provider.modelsUrl,
      source: "seed"
    })
  )

  const models: CatalogModel[] = FOLIO_DEFAULT_MODEL_LIST.map((model) => ({
    id: model.id,
    providerId: model.providerId,
    type: model.type,
    displayName: model.displayName ?? model.id,
    enabled: model.enabled ?? false,
    abilities: toAbilities(model.abilities),
    reasoning: model.abilities?.reasoning,
    contextWindowTokens: model.contextWindowTokens,
    maxOutputTokens: model.maxOutput,
    pricing: toPricing(model.pricing),
    settings: model.settings?.extendParams
      ? { extendParams: model.settings.extendParams }
      : undefined,
    releasedAt: model.releasedAt,
    legacy: model.legacy,
    source: "seed"
  }))

  return { providers, models }
}
