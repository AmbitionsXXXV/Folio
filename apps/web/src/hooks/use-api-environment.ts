import { useCallback, useSyncExternalStore } from "react"

import type { ApiEnvironment } from "@/utils/api-environment"
import {
  getServerUrl,
  getStoredApiEnvironment,
  setApiEnvironment as setApiEnv
} from "@/utils/api-environment"

// Create a simple store for environment changes
const listeners = new Set<() => void>()

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getSnapshot(): ApiEnvironment {
  return getStoredApiEnvironment()
}

function getServerSnapshot(): ApiEnvironment {
  return "local" // Default for SSR
}

/**
 * Hook to manage API environment switching (local/remote)
 * Allows runtime switching between local development server and remote production server
 */
export function useApiEnvironment() {
  const environment = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot
  )

  const setApiEnvironment = useCallback((env: ApiEnvironment) => {
    setApiEnv(env)
  }, [])

  const serverUrl = getServerUrl()
  const isLocal = environment === "local"
  const isRemote = environment === "remote"

  return {
    environment,
    setApiEnvironment,
    serverUrl,
    isLocal,
    isRemote
  }
}
