import { createContext } from "@folionote/api/context"
import { db, entries } from "@folionote/db"
import { createLogger } from "@folionote/log"
import { and, eq, inArray, isNull, or } from "drizzle-orm"

import { indexQueue } from "../services/rag"
import type { App } from "../types"
import { convertToSupportedLanguage } from "../utils/language"

const log = createLogger({ prefix: "reindex" })

const DEFAULT_BATCH_SIZE = 50
const MAX_LIMIT = 5000

/**
 * Register the admin reindex endpoint.
 *
 * POST /api/admin/reindex
 *   ?limit=100     — max entries to enqueue (default: 5000, capped at 5000)
 *   &status=failed  — filter by embeddingStatus (default: all un-indexed)
 *
 * Requires authentication. Operates on the authenticated user's own entries.
 */
export function registerReindexRoute(app: App) {
  app.post("/api/admin/reindex", async (c) => {
    const locale = convertToSupportedLanguage(c.get("language"))
    const ctx = await createContext({ context: c, locale })
    if (!ctx.session?.user) {
      return c.json({ error: "Unauthorized" }, 401)
    }
    const userId = ctx.session.user.id

    const limitParam = c.req.query("limit")
    const parsed = limitParam ? Number(limitParam) : MAX_LIMIT
    const limit =
      Number.isFinite(parsed) && parsed > 0
        ? Math.min(Math.floor(parsed), MAX_LIMIT)
        : MAX_LIMIT

    const statusFilter = c.req.query("status")
    const validStatuses = ["pending", "failed", "no_provider"] as const
    const filterByStatus =
      statusFilter &&
      validStatuses.includes(statusFilter as (typeof validStatuses)[number])
        ? (statusFilter as (typeof validStatuses)[number])
        : null

    const statusCondition = filterByStatus
      ? eq(entries.embeddingStatus, filterByStatus)
      : or(
          isNull(entries.embeddingStatus),
          inArray(entries.embeddingStatus, ["pending", "failed", "no_provider"])
        )

    const rows = await db
      .select({ id: entries.id })
      .from(entries)
      .where(
        and(
          eq(entries.userId, userId),
          isNull(entries.deletedAt),
          statusCondition
        )
      )
      .limit(limit)

    let enqueued = 0
    for (let i = 0; i < rows.length; i += DEFAULT_BATCH_SIZE) {
      const batch = rows.slice(i, i + DEFAULT_BATCH_SIZE)
      for (const row of batch) {
        indexQueue.enqueue(row.id, userId)
        enqueued += 1
      }
    }

    log.info(
      `Reindex: enqueued ${enqueued} entries for user ${userId}${filterByStatus ? ` (status=${filterByStatus})` : ""}`
    )

    return c.json({
      enqueued,
      queueStats: indexQueue.stats
    })
  })
}
