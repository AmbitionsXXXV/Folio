import { relations } from "drizzle-orm"
import {
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core"

import { user } from "./auth"
import { entries } from "./entries"

/**
 * entry_links - 笔记之间的拓扑关系
 *
 * 存储 entries 之间的有向链接，支撑知识图谱可视化与 AI 拓扑上下文。
 *
 * linkType:
 * - 'ref'     : 通过 /ref 命令或 ProseMirror 内联引用自动提取
 * - 'manual'  : 用户在 Graph View 中手动拖拽建立
 */
export const entryLinks = pgTable(
  "entry_links",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    sourceEntryId: text("source_entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    targetEntryId: text("target_entry_id")
      .notNull()
      .references(() => entries.id, { onDelete: "cascade" }),
    linkType: text("link_type").notNull().default("ref"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull()
  },
  (table) => [
    index("entry_links_source_idx").on(table.sourceEntryId),
    index("entry_links_target_idx").on(table.targetEntryId),
    index("entry_links_user_idx").on(table.userId),
    uniqueIndex("entry_links_source_target_type_idx").on(
      table.sourceEntryId,
      table.targetEntryId,
      table.linkType
    )
  ]
)

export const entryLinksRelations = relations(entryLinks, ({ one }) => ({
  user: one(user, {
    fields: [entryLinks.userId],
    references: [user.id]
  }),
  sourceEntry: one(entries, {
    fields: [entryLinks.sourceEntryId],
    references: [entries.id],
    relationName: "outgoingLinks"
  }),
  targetEntry: one(entries, {
    fields: [entryLinks.targetEntryId],
    references: [entries.id],
    relationName: "incomingLinks"
  })
}))
