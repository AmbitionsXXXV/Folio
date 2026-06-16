import type {
  CatalogModel,
  CatalogProvider,
  ModelCatalog,
  ModelType
} from "@folionote/model-list"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo } from "react"

import { orpc } from "@/utils/orpc"

// Re-export the canonical catalog types so existing importers keep working
// while there is a single source of truth in @folionote/model-list.
export type { CatalogModel, CatalogProvider, ModelCatalog }

const MODEL_CATALOG_QUERY_KEY = ["ai", "modelCatalog"] as const

/**
 * Hook to fetch and manage AI model catalog with user's enabled overrides.
 *
 * The catalog includes:
 * - All providers from model-list
 * - All models from model-list with user's enabled overrides applied
 */
export function useAiModelCatalog() {
  const { data, isLoading, isError, error, refetch } = useQuery<ModelCatalog>({
    queryKey: MODEL_CATALOG_QUERY_KEY,
    queryFn: () => orpc.ai.getModelCatalog.call({}),
    staleTime: 30_000 // Cache for 30 seconds
  })

  const catalog: ModelCatalog = useMemo(() => {
    if (!data) {
      return { providers: [], models: [] }
    }
    return data
  }, [data])

  return {
    catalog,
    providers: catalog.providers,
    models: catalog.models,
    isLoading,
    isLoaded: !isLoading && !!data,
    isError,
    error,
    refetch
  }
}

interface SetModelEnabledInput {
  providerId: string
  id: string
  type: ModelType
  enabled: boolean
}

/**
 * Hook to toggle model enabled status.
 */
export function useSetModelEnabled() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SetModelEnabledInput) =>
      orpc.ai.setModelEnabled.call(input),
    onSuccess: () => {
      // Invalidate model catalog cache to refresh the UI
      queryClient.invalidateQueries({ queryKey: MODEL_CATALOG_QUERY_KEY })
    }
  })
}

interface SetProviderEnabledInput {
  providerId: string
  enabled: boolean
}

/**
 * Hook to toggle provider enabled status.
 */
export function useSetProviderEnabled() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: SetProviderEnabledInput) =>
      orpc.ai.setProviderEnabled.call(input),
    onSuccess: () => {
      // Invalidate model catalog cache to refresh the UI
      queryClient.invalidateQueries({ queryKey: MODEL_CATALOG_QUERY_KEY })
    }
  })
}

/**
 * Get enabled models of a specific type for a specific provider
 */
export function getEnabledModels(
  models: CatalogModel[],
  providerId: string,
  type: string
): CatalogModel[] {
  return models.filter(
    (m) => m.providerId === providerId && m.type === type && m.enabled
  )
}

/**
 * Get all enabled chat models grouped by provider
 */
export function getEnabledChatModelsByProvider(
  models: CatalogModel[],
  providers: CatalogProvider[]
): Map<string, CatalogModel[]> {
  const result = new Map<string, CatalogModel[]>()

  for (const provider of providers) {
    const providerModels = getEnabledModels(models, provider.id, "chat")
    if (providerModels.length > 0) {
      result.set(provider.id, providerModels)
    }
  }

  return result
}
