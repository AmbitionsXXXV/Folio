import { relations } from "drizzle-orm"
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex
} from "drizzle-orm/pg-core"

import { user } from "./auth"

/**
 * jsonb column shapes for the model catalog.
 *
 * These mirror the canonical catalog types in `@folionote/model-list`
 * (CatalogModelAbilities / CatalogModelPricing / CatalogModelSettings). They are
 * declared locally to keep `@folionote/db` free of a package dependency just for
 * types; the API layer maps rows to the canonical types, so any drift surfaces
 * there as a type error.
 */
export interface ModelAbilitiesJson {
  reasoning?: boolean
  functionCall?: boolean
  vision?: boolean
  files?: boolean
  structuredOutput?: boolean
  search?: boolean
  imageOutput?: boolean
  video?: boolean
}

export interface ModelPricingJson {
  currency: "USD"
  input?: number
  output?: number
  cacheRead?: number
  cacheWrite?: number
}

export interface ModelSettingsJson {
  extendParams?: string[]
}

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

// =============================================================================
// AI Model Catalog (DB-authoritative, refreshed from upstream models APIs)
// =============================================================================

/**
 * ai_providers - 模型提供商目录
 *
 * 用途：
 * - 持久化 provider 目录（canonical id：openai / anthropic / google / deepseek /
 *   qwen / xai / moonshot），由 seed（@folionote/model-list）引导、由 models.dev /
 *   Vercel AI Gateway 刷新
 *
 * 设计：
 * - `enabled` 为目录默认值；用户级覆盖仍存于 user_ai_provider_settings
 * - 刷新（upsert）只更新元数据，不覆盖 enabled / sort（保留既有默认与排序）
 */
export const aiProviders = pgTable(
  "ai_providers",
  {
    /** Canonical provider id（如 openai / anthropic / google） */
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    logo: text("logo"),
    /** 目录默认启用状态（用户覆盖见 user_ai_provider_settings） */
    enabled: boolean("enabled").notNull().default(true),
    /** 展示排序（越小越靠前） */
    sort: integer("sort").notNull().default(0),
    /** 文档链接（provider models 文档页） */
    docUrl: text("doc_url"),
    /** 数据来源：seed / models.dev / vercel-gateway */
    source: text("source").notNull().default("seed"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull()
  },
  (table) => [index("ai_providers_sort_idx").on(table.sort)]
)

/**
 * ai_models - 模型目录
 *
 * 用途：
 * - 持久化全部模型卡片（chat / embedding / image 等），作为前端渲染的单一数据源
 *
 * 设计：
 * - `id` 为确定性 slug `${providerId}:${type}:${modelId}`，保证 upsert 幂等
 * - `modelId` 为 provider 原生模型 id（用于推理调用）
 * - abilities / pricing / settings 以 jsonb 存储 canonical 形状（与 @folionote/model-list 共用类型）
 * - `enabled` 为目录默认值；刷新时不覆盖（保留 seed 精选默认 + 用户可在设置中开启新模型）
 */
export const aiModels = pgTable(
  "ai_models",
  {
    /** 确定性 slug：`${providerId}:${type}:${modelId}` */
    id: text("id").primaryKey(),
    providerId: text("provider_id")
      .notNull()
      .references(() => aiProviders.id, { onDelete: "cascade" }),
    /** provider 原生模型 id（推理调用使用） */
    modelId: text("model_id").notNull(),
    /** 模型类型（chat / embedding / image / tts / stt / realtime 等） */
    type: text("type").notNull(),
    displayName: text("display_name").notNull().default(""),
    /** 目录默认启用状态（用户覆盖见 user_ai_model_settings） */
    enabled: boolean("enabled").notNull().default(false),
    /** 能力标记（reasoning / functionCall / vision 等） */
    abilities: jsonb("abilities")
      .$type<ModelAbilitiesJson>()
      .notNull()
      .default({}),
    /** 上下文窗口（tokens） */
    contextWindowTokens: integer("context_window_tokens"),
    /** 最大输出（tokens） */
    maxOutputTokens: integer("max_output_tokens"),
    /** 归一化定价（USD / 1M tokens） */
    pricing: jsonb("pricing").$type<ModelPricingJson>(),
    /** 扩展参数设置（extendParams 等） */
    settings: jsonb("settings").$type<ModelSettingsJson>(),
    releasedAt: text("released_at"),
    knowledgeCutoff: text("knowledge_cutoff"),
    legacy: boolean("legacy").notNull().default(false),
    /** 数据来源：seed / models.dev / vercel-gateway */
    source: text("source").notNull().default("seed"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull()
  },
  (table) => [
    index("ai_models_provider_idx").on(table.providerId),
    index("ai_models_provider_type_idx").on(table.providerId, table.type),
    uniqueIndex("ai_models_provider_model_type_unique").on(
      table.providerId,
      table.modelId,
      table.type
    )
  ]
)

/**
 * ai_catalog_sync - 目录同步元信息（单行）
 *
 * 用途：
 * - 支撑 on-demand + TTL 的 stale-while-revalidate：记录最近成功同步时间与来源，
 *   并以 lastAttemptAt 做跨进程的刷新去抖（避免并发风暴）
 */
export const aiCatalogSync = pgTable("ai_catalog_sync", {
  /** 固定单行主键 "singleton" */
  id: text("id").primaryKey(),
  /** 最近一次成功同步时间（null 表示尚未成功同步） */
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  /** 最近一次刷新尝试时间（用于去抖/冷却） */
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  /** 最近成功来源：models.dev / vercel-gateway */
  lastSource: text("last_source"),
  /** 最近一次失败信息（成功时清空） */
  lastError: text("last_error"),
  /** 最近成功写入的模型数 */
  modelCount: integer("model_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => new Date())
    .notNull()
})

export const aiProvidersRelations = relations(aiProviders, ({ many }) => ({
  models: many(aiModels)
}))

export const aiModelsRelations = relations(aiModels, ({ one }) => ({
  provider: one(aiProviders, {
    fields: [aiModels.providerId],
    references: [aiProviders.id]
  })
}))
