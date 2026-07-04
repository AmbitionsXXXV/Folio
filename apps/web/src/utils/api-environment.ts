const STORAGE_KEY = "folionote:api-environment"

export type ApiEnvironment = "local" | "remote"

interface ApiEnvironmentConfig {
  local: string
  remote: string
}

const DEFAULT_CONFIG: ApiEnvironmentConfig = {
  local: "http://localhost:3000",
  remote: "https://api.folionote.xyz"
}

/**
 * The collab process is a separate port in dev (see apps/server/src/collab)
 * and a path on the same domain in production (Caddy's `handle_path
 * /collab*`, see apps/server/Caddyfile) — not a separate host, so it can't
 * just reuse DEFAULT_CONFIG.remote as-is.
 */
const DEFAULT_COLLAB_CONFIG: ApiEnvironmentConfig = {
  local: "ws://localhost:3002",
  remote: "wss://api.folionote.xyz/collab"
}

/**
 * Get the API environment from localStorage (non-React utility)
 */
export function getStoredApiEnvironment(): ApiEnvironment {
  if (typeof window === "undefined") {
    return "local"
  }

  // Check if we're in production build
  const isProduction = import.meta.env.MODE === "production"
  if (isProduction) {
    return "remote"
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === "local" || stored === "remote") {
      return stored
    }
  } catch (error) {
    console.error("Failed to load API environment from localStorage:", error)
  }

  return "local"
}

/**
 * Get the server URL based on environment configuration
 */
export function getServerUrl(): string {
  const isProduction = import.meta.env.MODE === "production"

  // In production always target the real API. Prefer the build-time
  // VITE_SERVER_URL, but fall back to the production API URL rather than
  // localhost: `.env.production` is gitignored, so VITE_SERVER_URL is absent in
  // Vercel/CI builds, and SSR has no window/localStorage to fall back on. The
  // old localhost fallback made the auth client call http://localhost:3000
  // during SSR, which threw an HTTPError and 500'd the page.
  if (isProduction) {
    return (import.meta.env.VITE_SERVER_URL as string) || DEFAULT_CONFIG.remote
  }

  // In development, use stored environment preference
  const environment = getStoredApiEnvironment()
  return DEFAULT_CONFIG[environment]
}

/**
 * Get the collab (Hocuspocus) WebSocket URL, mirroring getServerUrl()'s
 * environment logic.
 */
export function getCollabUrl(): string {
  const isProduction = import.meta.env.MODE === "production"

  if (isProduction) {
    const explicit = import.meta.env.VITE_COLLAB_URL as string | undefined
    if (explicit) {
      return explicit
    }
    const serverUrl =
      (import.meta.env.VITE_SERVER_URL as string) || DEFAULT_CONFIG.remote
    return `${serverUrl.replace(/^http/, "ws")}/collab`
  }

  const environment = getStoredApiEnvironment()
  return DEFAULT_COLLAB_CONFIG[environment]
}

/**
 * Save API environment to localStorage and reload page
 */
export function setApiEnvironment(env: ApiEnvironment): void {
  if (typeof window === "undefined") {
    return
  }

  try {
    localStorage.setItem(STORAGE_KEY, env)
    // Force page reload to apply new API URL
    window.location.reload()
  } catch (error) {
    console.error("Failed to save API environment to localStorage:", error)
  }
}
