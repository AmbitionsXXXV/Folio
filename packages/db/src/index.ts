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
// 使用 getter 确保 drizzle 和 pg 模块在实际使用时才被加载
type DbType = ReturnType<typeof import('drizzle-orm/node-postgres').drizzle>
let _db: DbType | null = null

export const db = new Proxy({} as object, {
	get(_, prop) {
		if (!_db) {
			// 动态导入，避免模块初始化时的循环依赖
			const { drizzle } = require('drizzle-orm/node-postgres')
			_db = drizzle(process.env.DATABASE_URL || '', { schema })
		}
		return (_db as unknown as Record<string | symbol, unknown>)[prop]
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
