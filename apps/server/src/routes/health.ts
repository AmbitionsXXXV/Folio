import { db } from "@folionote/db"
import { sql } from "drizzle-orm"

import type { App } from "../types"

/**
 * Register health check routes.
 *
 * - GET /health  liveness: the process is up. Used by Caddy's active health
 *   check — kept dependency-free so a transient DB blip doesn't flap routing.
 * - GET /ready   readiness: critical dependencies (DB) are reachable. Used by
 *   the deploy pipeline to confirm a release actually serves traffic.
 */
export function registerHealthRoutes(app: App) {
  app.get("/", (c) => c.text("OK"))
  app.get("/health", (c) =>
    c.json({ status: "ok", timestamp: new Date().toISOString() })
  )
  app.get("/ready", async (c) => {
    let dbOk = false
    try {
      await db.execute(sql`select 1`)
      dbOk = true
    } catch {
      dbOk = false
    }
    return c.json(
      {
        status: dbOk ? "ready" : "degraded",
        checks: { db: dbOk },
        timestamp: new Date().toISOString()
      },
      dbOk ? 200 : 503
    )
  })
}
