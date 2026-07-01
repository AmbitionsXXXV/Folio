/**
 * Seed catalog — maps the bundled @folionote/model-list defaults into the
 * canonical catalog shape.
 *
 * Used to bootstrap an empty database (so the UI has models before the first
 * upstream fetch) and as the offline fallback when both upstream sources fail.
 *
 * The mapping now lives in @folionote/model-list (`buildDefaultCatalog`) so the
 * exact same default catalog is shared by the server seed and the web/native
 * client placeholder — there is a single source of truth and no drift.
 */

export { buildDefaultCatalog as buildSeedCatalog } from "@folionote/model-list"
