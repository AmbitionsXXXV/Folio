import type { NoteContext } from "@folionote/ai"
import { db, entries, entryChunks } from "@folionote/db"
import { createLogger } from "@folionote/log"
import {
  and,
  cosineDistance,
  desc,
  eq,
  gt,
  isNotNull,
  isNull,
  notInArray,
  sql
} from "drizzle-orm"

const log = createLogger({ prefix: "rag:vector-retriever" })

const DEFAULT_MIN_SIMILARITY = 0.3

/**
 * Search entries by vector cosine similarity against the entry_chunks table.
 *
 * Returns distinct entries ranked by the best-matching chunk similarity.
 * Relies on the HNSW index on entry_chunks.embedding for fast ANN lookup.
 */
export async function searchByVectorSimilarity(
  userId: string,
  queryEmbedding: number[],
  excludeIds: string[],
  limit: number,
  minSimilarity = DEFAULT_MIN_SIMILARITY
): Promise<NoteContext[]> {
  try {
    const similarity = sql<number>`1 - ${cosineDistance(entryChunks.embedding, queryEmbedding)}`

    const baseConditions = [
      eq(entryChunks.userId, userId),
      isNotNull(entryChunks.embedding),
      isNull(entries.deletedAt),
      eq(entries.isInbox, false),
      gt(similarity, minSimilarity)
    ]

    if (excludeIds.length > 0) {
      baseConditions.push(notInArray(entries.id, excludeIds))
    }

    const rows = await db
      .selectDistinctOn([entries.id], {
        id: entries.id,
        title: entries.title,
        contentText: entries.contentText,
        similarity
      })
      .from(entryChunks)
      .innerJoin(entries, eq(entryChunks.entryId, entries.id))
      .where(and(...baseConditions))
      .orderBy(entries.id, desc(similarity))
      .limit(limit * 2)

    const sorted = rows
      .toSorted((a, b) => b.similarity - a.similarity)
      .slice(0, limit)

    log.debug(
      `Vector search: ${sorted.length} results (top similarity: ${sorted[0]?.similarity.toFixed(3) ?? "N/A"})`
    )

    return sorted.map((row) => ({
      id: row.id,
      title: row.title,
      contentText: row.contentText ?? ""
    }))
  } catch (error) {
    log.warn("Vector similarity search failed:", error)
    return []
  }
}
