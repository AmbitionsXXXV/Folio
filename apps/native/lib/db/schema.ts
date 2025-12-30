import { relations } from 'drizzle-orm'
import { index, int, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

/**
 * Local SQLite schema for FolioNote
 * Mirrors the server-side PostgreSQL schema with SQLite-compatible types
 *
 * Key differences from PostgreSQL:
 * - Uses INTEGER for timestamps (Unix epoch in milliseconds)
 * - Uses INTEGER for booleans (0 = false, 1 = true)
 * - Uses TEXT for JSON fields (serialized)
 */

/**
 * entries - 学习笔记/知识条目
 * 核心内容表，存储用户的学习笔记
 */
export const entries = sqliteTable(
	'entries',
	{
		id: text('id').primaryKey(),
		userId: text('user_id').notNull(),
		title: text('title').notNull().default(''),
		/** ProseMirror JSON 格式内容（Tiptap doc），存储为 JSON 字符串 */
		contentJson: text('content_json'),
		/** 纯文本内容，用于搜索和预览 */
		contentText: text('content_text'),
		/** 是否在 inbox 中（未处理的快速捕获）- SQLite uses 0/1 for boolean */
		isInbox: int('is_inbox', { mode: 'boolean' }).notNull().default(true),
		/** 是否星标/收藏 */
		isStarred: int('is_starred', { mode: 'boolean' }).notNull().default(false),
		/** 是否置顶 */
		isPinned: int('is_pinned', { mode: 'boolean' }).notNull().default(false),
		/** 创建时间 (Unix timestamp in milliseconds) */
		createdAt: int('created_at', { mode: 'timestamp_ms' }).notNull(),
		/** 更新时间 (Unix timestamp in milliseconds) */
		updatedAt: int('updated_at', { mode: 'timestamp_ms' }).notNull(),
		/** 版本号，用于乐观锁并发控制 */
		version: text('version').notNull().default('1'),
		/** soft-delete 字段 (Unix timestamp in milliseconds) */
		deletedAt: int('deleted_at', { mode: 'timestamp_ms' }),
		/** 同步状态: 'synced' | 'pending' | 'conflict' */
		syncStatus: text('sync_status').default('pending'),
		/** 服务端最后同步时间 */
		lastSyncedAt: int('last_synced_at', { mode: 'timestamp_ms' }),
	},
	(table) => [
		index('entries_user_id_updated_at_idx').on(table.userId, table.updatedAt),
		index('entries_user_id_is_inbox_idx').on(table.userId, table.isInbox),
		index('entries_user_id_is_starred_idx').on(table.userId, table.isStarred),
		index('entries_user_id_deleted_at_idx').on(table.userId, table.deletedAt),
		index('entries_sync_status_idx').on(table.syncStatus),
	]
)

export const entriesRelations = relations(entries, ({ many, one }) => ({
	entryTags: many(entryTags),
	entrySources: many(entrySources),
	reviewEvents: many(reviewEvents),
	reviewState: one(entryReviewState, {
		fields: [entries.id],
		references: [entryReviewState.entryId],
	}),
}))

/**
 * tags - 标签
 * 用于分类和组织学习笔记
 */
export const tags = sqliteTable(
	'tags',
	{
		id: text('id').primaryKey(),
		userId: text('user_id').notNull(),
		name: text('name').notNull(),
		/** 标签颜色（可选，用于 UI 显示） */
		color: text('color'),
		createdAt: int('created_at', { mode: 'timestamp_ms' }).notNull(),
		updatedAt: int('updated_at', { mode: 'timestamp_ms' }).notNull(),
		syncStatus: text('sync_status').default('pending'),
		lastSyncedAt: int('last_synced_at', { mode: 'timestamp_ms' }),
	},
	(table) => [
		index('tags_user_id_name_idx').on(table.userId, table.name),
		index('tags_sync_status_idx').on(table.syncStatus),
	]
)

export const tagsRelations = relations(tags, ({ many }) => ({
	entryTags: many(entryTags),
}))

/**
 * entry_tags - 笔记与标签的多对多关系
 */
export const entryTags = sqliteTable(
	'entry_tags',
	{
		id: text('id').primaryKey(),
		entryId: text('entry_id').notNull(),
		tagId: text('tag_id').notNull(),
		createdAt: int('created_at', { mode: 'timestamp_ms' }).notNull(),
		syncStatus: text('sync_status').default('pending'),
	},
	(table) => [
		index('entry_tags_entry_id_tag_id_idx').on(table.entryId, table.tagId),
		index('entry_tags_tag_id_idx').on(table.tagId),
	]
)

export const entryTagsRelations = relations(entryTags, ({ one }) => ({
	entry: one(entries, {
		fields: [entryTags.entryId],
		references: [entries.id],
	}),
	tag: one(tags, {
		fields: [entryTags.tagId],
		references: [tags.id],
	}),
}))

/**
 * sources - 来源
 * 可以是链接、PDF、书籍、章节等
 */
export const sources = sqliteTable(
	'sources',
	{
		id: text('id').primaryKey(),
		userId: text('user_id').notNull(),
		/** 来源类型：link, pdf, book, article, video, podcast, other */
		type: text('type').notNull().default('link'),
		title: text('title').notNull(),
		/** URL 链接（如果适用） */
		url: text('url'),
		/** 作者 */
		author: text('author'),
		/** 出版/发布日期 (Unix timestamp in milliseconds) */
		publishedAt: int('published_at', { mode: 'timestamp_ms' }),
		/** 额外元数据（JSON 字符串） */
		metadata: text('metadata'),
		createdAt: int('created_at', { mode: 'timestamp_ms' }).notNull(),
		updatedAt: int('updated_at', { mode: 'timestamp_ms' }).notNull(),
		/** soft-delete 字段 */
		deletedAt: int('deleted_at', { mode: 'timestamp_ms' }),
		syncStatus: text('sync_status').default('pending'),
		lastSyncedAt: int('last_synced_at', { mode: 'timestamp_ms' }),
	},
	(table) => [
		index('sources_user_id_idx').on(table.userId),
		index('sources_user_id_type_idx').on(table.userId, table.type),
		index('sources_user_id_deleted_at_idx').on(table.userId, table.deletedAt),
		index('sources_sync_status_idx').on(table.syncStatus),
	]
)

export const sourcesRelations = relations(sources, ({ many }) => ({
	entrySources: many(entrySources),
}))

/**
 * entry_sources - 笔记与来源的多对多关系
 */
export const entrySources = sqliteTable(
	'entry_sources',
	{
		id: text('id').primaryKey(),
		entryId: text('entry_id').notNull(),
		sourceId: text('source_id').notNull(),
		/** 笔记在来源中的位置（如页码、章节等） */
		position: text('position'),
		createdAt: int('created_at', { mode: 'timestamp_ms' }).notNull(),
		syncStatus: text('sync_status').default('pending'),
	},
	(table) => [
		index('entry_sources_entry_id_source_id_idx').on(table.entryId, table.sourceId),
		index('entry_sources_source_id_idx').on(table.sourceId),
	]
)

export const entrySourcesRelations = relations(entrySources, ({ one }) => ({
	entry: one(entries, {
		fields: [entrySources.entryId],
		references: [entries.id],
	}),
	source: one(sources, {
		fields: [entrySources.sourceId],
		references: [sources.id],
	}),
}))

/**
 * entry_review_state - 条目复习调度状态（快照）
 * 每个 entry 最多一条记录，懒创建（首次复习时创建）
 */
export const entryReviewState = sqliteTable(
	'entry_review_state',
	{
		// 使用 entryId 作为主键
		entryId: text('entry_id').primaryKey(),
		userId: text('user_id').notNull(),
		/** 下次到期时间（首次创建时 = now，后续由算法计算） */
		dueAt: int('due_at', { mode: 'timestamp_ms' }).notNull(),
		/** 上次复习时间 */
		lastReviewedAt: int('last_reviewed_at', { mode: 'timestamp_ms' }),
		/** 当前间隔天数（首次 = 0，复习后 >= 1） */
		intervalDays: int('interval_days').notNull().default(0),
		/** SM-2 ease factor，范围 [1.3, 3.0]，默认 2.5 */
		ease: real('ease').notNull().default(2.5),
		/** 连续正确复习次数 */
		reps: int('reps').notNull().default(0),
		/** 遗忘次数（again 计数） */
		lapses: int('lapses').notNull().default(0),
		createdAt: int('created_at', { mode: 'timestamp_ms' }).notNull(),
		updatedAt: int('updated_at', { mode: 'timestamp_ms' }).notNull(),
		syncStatus: text('sync_status').default('pending'),
	},
	(table) => [
		// 核心查询索引：getQueue / getDueStats 按用户 + 到期时间查询
		index('entry_review_state_user_due_idx').on(table.userId, table.dueAt),
	]
)

export const entryReviewStateRelations = relations(entryReviewState, ({ one }) => ({
	entry: one(entries, {
		fields: [entryReviewState.entryId],
		references: [entries.id],
	}),
}))

/**
 * review_events - 复习事件
 * 记录每次复习的时间戳和评分
 */
export const reviewEvents = sqliteTable(
	'review_events',
	{
		id: text('id').primaryKey(),
		userId: text('user_id').notNull(),
		entryId: text('entry_id').notNull(),
		/** 复习时的备注（可选） */
		note: text('note'),
		/** 评分：again | hard | good | easy */
		rating: text('rating').notNull().default('good'),
		/** 本次复习后计算的下次到期时间（便于调参/回放） */
		scheduledDueAt: int('scheduled_due_at', { mode: 'timestamp_ms' }),
		/** 复习时间 */
		reviewedAt: int('reviewed_at', { mode: 'timestamp_ms' }).notNull(),
		createdAt: int('created_at', { mode: 'timestamp_ms' }).notNull(),
		syncStatus: text('sync_status').default('pending'),
	},
	(table) => [
		index('review_events_user_id_idx').on(table.userId),
		index('review_events_entry_id_idx').on(table.entryId),
		index('review_events_reviewed_at_idx').on(table.reviewedAt),
	]
)

export const reviewEventsRelations = relations(reviewEvents, ({ one }) => ({
	entry: one(entries, {
		fields: [reviewEvents.entryId],
		references: [entries.id],
	}),
}))

// Type exports for use in repositories
export type Entry = typeof entries.$inferSelect
export type NewEntry = typeof entries.$inferInsert
export type Tag = typeof tags.$inferSelect
export type NewTag = typeof tags.$inferInsert
export type EntryTag = typeof entryTags.$inferSelect
export type NewEntryTag = typeof entryTags.$inferInsert
export type Source = typeof sources.$inferSelect
export type NewSource = typeof sources.$inferInsert
export type EntrySource = typeof entrySources.$inferSelect
export type NewEntrySource = typeof entrySources.$inferInsert
export type EntryReviewState = typeof entryReviewState.$inferSelect
export type NewEntryReviewState = typeof entryReviewState.$inferInsert
export type ReviewEvent = typeof reviewEvents.$inferSelect
export type NewReviewEvent = typeof reviewEvents.$inferInsert
