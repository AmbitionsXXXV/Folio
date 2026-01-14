import { relations } from 'drizzle-orm'
import {
	boolean,
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from 'drizzle-orm/pg-core'
import { user } from './auth'

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
	'user_ai_model_settings',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		/** model-list provider id（如 openai / google / anthropic / deepseek / qwen / xai） */
		providerId: text('provider_id').notNull(),
		/** model id（如 gpt-4o / claude-sonnet-4-5-20250929 等） */
		modelId: text('model_id').notNull(),
		/** 模型类型（chat / embedding / image / tts / stt / realtime / text2video / text2music） */
		type: text('type').notNull(),
		/** 用户设置的启用状态 */
		enabled: boolean('enabled').notNull(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp('updated_at', { withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date())
			.notNull(),
	},
	(table) => [
		// 唯一约束：每个用户对同一模型（provider + model + type）只能有一条覆盖记录
		uniqueIndex('user_ai_model_settings_unique_idx').on(
			table.userId,
			table.providerId,
			table.modelId,
			table.type
		),
		// 按用户查询索引
		index('user_ai_model_settings_user_id_idx').on(table.userId),
	]
)

export const userAiModelSettingsRelations = relations(
	userAiModelSettings,
	({ one }) => ({
		user: one(user, {
			fields: [userAiModelSettings.userId],
			references: [user.id],
		}),
	})
)
