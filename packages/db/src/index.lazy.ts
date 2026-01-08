// Auth schema
import {
	account,
	accountRelations,
	session,
	sessionRelations,
	user,
	userRelations,
	verification,
} from './schema/auth'

// Business schema
import {
	attachments,
	attachmentsRelations,
	dailyLogs,
	dailyLogsRelations,
	entries,
	entriesRelations,
	entryReviewState,
	entryReviewStateRelations,
	entryShares,
	entrySharesRelations,
	entrySources,
	entrySourcesRelations,
	entryTags,
	entryTagsRelations,
	reviewEvents,
	reviewEventsRelations,
	sources,
	sourcesRelations,
	tags,
	tagsRelations,
} from './schema/entries'

// Schema configuration for drizzle
const schema = {
	// Auth
	user,
	userRelations,
	session,
	sessionRelations,
	account,
	accountRelations,
	verification,
	// Business
	entries,
	entriesRelations,
	tags,
	tagsRelations,
	entryTags,
	entryTagsRelations,
	sources,
	sourcesRelations,
	entrySources,
	entrySourcesRelations,
	attachments,
	attachmentsRelations,
	reviewEvents,
	reviewEventsRelations,
	entryReviewState,
	entryReviewStateRelations,
	dailyLogs,
	dailyLogsRelations,
	entryShares,
	entrySharesRelations,
}

// 延迟初始化数据库连接，避免模块循环依赖导致的初始化问题
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

type DrizzleNodePostgresModule = typeof import('drizzle-orm/node-postgres')
type DbType = ReturnType<DrizzleNodePostgresModule['drizzle']>

let dbInstance: DbType | null = null

export const db = new Proxy({} as DbType, {
	get(_target, prop) {
		if (!dbInstance) {
			const { drizzle } =
				require('drizzle-orm/node-postgres') as DrizzleNodePostgresModule
			dbInstance = drizzle(process.env.DATABASE_URL || '', { schema })
		}

		return (dbInstance as unknown as Record<string | symbol, unknown>)[prop]
	},
}) as DbType

// Re-export schema for external use
export {
	account,
	accountRelations,
	session,
	sessionRelations,
	user,
	userRelations,
	verification,
} from './schema/auth'

export {
	attachments,
	attachmentsRelations,
	dailyLogs,
	dailyLogsRelations,
	entries,
	entriesRelations,
	entryReviewState,
	entryReviewStateRelations,
	entryShares,
	entrySharesRelations,
	entrySources,
	entrySourcesRelations,
	entryTags,
	entryTagsRelations,
	reviewEvents,
	reviewEventsRelations,
	sources,
	sourcesRelations,
	tags,
	tagsRelations,
} from './schema/entries'
