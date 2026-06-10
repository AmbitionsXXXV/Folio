import { relations } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core"

import { user } from "./auth"

/**
 * user_ai_model_settings - 用户 AI 模型启用/禁用覆盖
 *
 * 用途：
 * - 记录用户对 model-list 默认模型列表的 enabled 覆盖
 * - 支持所有模型类型（chat / embedding / image / tts / stt / realtime 等）
 * - 全站生效：设置页开关 + 模型选择器过滤 + 服务端校验
 *
 * 设计：
 * - 仅存储用户显式修改过的模型配置
 * - 若用户未修改，则使用 model-list 包中的默认 enabled 值
 */
export const userAiModelSettings = pgTable(
  "user_ai_model_settings",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** model-list provider id（如 openai / google / anthropic / deepseek / qwen / xai） */
    providerId: text("provider_id").notNull(),
    /** model id（如 gpt-4o / claude-sonnet-4-5-20250929 等） */
    modelId: text("model_id").notNull(),
    /** 模型类型（chat / embedding / image / tts / stt / realtime / text2video / text2music） */
    type: text("type").notNull(),
    /** 用户设置的启用状态 */
    enabled: boolean("enabled").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull()
  },
  (table) => [
    // 唯一约束：每个用户对同一模型（provider + model + type）只能有一条覆盖记录
    uniqueIndex("user_ai_model_settings_unique_idx").on(
      table.userId,
      table.providerId,
      table.modelId,
      table.type
    ),
    // 按用户查询索引
    index("user_ai_model_settings_user_id_idx").on(table.userId)
  ]
)

export const userAiModelSettingsRelations = relations(
  userAiModelSettings,
  ({ one }) => ({
    user: one(user, {
      fields: [userAiModelSettings.userId],
      references: [user.id]
    })
  })
)

/**
 * user_ai_provider_settings - 用户 AI Provider 启用/禁用覆盖
 *
 * 用途：
 * - 记录用户对 provider 的 enabled 覆盖
 * - 用于设置页展示与服务端校验
 *
 * 设计：
 * - 仅存储用户显式修改过的 provider 配置
 * - 若用户未修改，则使用 model-list 包中的默认 enabled 值
 */
export const userAiProviderSettings = pgTable(
  "user_ai_provider_settings",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** model-list provider id（如 openai / google / anthropic / deepseek / qwen / xai / moonshot） */
    providerId: text("provider_id").notNull(),
    /** 用户设置的启用状态 */
    enabled: boolean("enabled").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull()
  },
  (table) => [
    // 唯一约束：每个用户对同一 provider 只能有一条覆盖记录
    uniqueIndex("user_ai_provider_settings_unique_idx").on(
      table.userId,
      table.providerId
    ),
    // 按用户查询索引
    index("user_ai_provider_settings_user_id_idx").on(table.userId)
  ]
)

export const userAiProviderSettingsRelations = relations(
  userAiProviderSettings,
  ({ one }) => ({
    user: one(user, {
      fields: [userAiProviderSettings.userId],
      references: [user.id]
    })
  })
)

// =============================================================================
// AI Chat Sessions
// =============================================================================

/**
 * ai_chat_sessions - AI 聊天会话
 *
 * 用途：
 * - 存储 Knowledge Chat 会话与完整消息历史
 * - 支持会话列表展示、会话切换、刷新后恢复
 *
 * 设计：
 * - messagesJson 存储 UIMessage[] 的 JSON 字符串（AI SDK v6 格式）
 * - lastOpenedAt 用于记录最近打开时间，实现"刷新后回到最近会话"
 * - lastMessagePreview 存储最后一条消息摘要，用于列表展示
 */
export const aiChatSessions = pgTable(
  "ai_chat_sessions",
  {
    /** 会话 ID（nanoid 生成） */
    id: text("id").primaryKey(),
    /** 用户 ID */
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    /** 会话标题（可由首条消息自动生成或用户自定义） */
    title: text("title").notNull().default(""),
    /** 消息数组的 JSON 字符串（UIMessage[] 格式） */
    messagesJson: text("messages_json").notNull().default("[]"),
    /** 消息数量 */
    messageCount: integer("message_count").notNull().default(0),
    /** 最后一条消息摘要（用于列表展示，截断至 100 字符） */
    lastMessagePreview: text("last_message_preview").notNull().default(""),
    /** 最后一条消息时间 */
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    /** 最近打开时间（用于刷新后恢复最近会话） */
    lastOpenedAt: timestamp("last_opened_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull()
  },
  (table) => [
    // 按用户 + 最近打开时间查询（刷新后恢复）
    index("ai_chat_sessions_user_last_opened_idx").on(
      table.userId,
      table.lastOpenedAt
    ),
    // 按用户 + 更新时间查询（会话列表排序）
    index("ai_chat_sessions_user_updated_idx").on(
      table.userId,
      table.updatedAt
    ),
    // 按用户查询索引
    index("ai_chat_sessions_user_id_idx").on(table.userId)
  ]
)

export const aiChatSessionsRelations = relations(aiChatSessions, ({ one }) => ({
  user: one(user, {
    fields: [aiChatSessions.userId],
    references: [user.id]
  })
}))
