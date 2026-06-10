import type { App } from "../types"

/**
 * Register health check routes
 */
export function registerHealthRoutes(app: App) {
  app.get("/", (c) => c.text("OK"))
  app.get("/health", (c) =>
    c.json({ status: "ok", timestamp: new Date().toISOString() })
  )
}
