// Auth schema

// AI schema
import { userAiModelSettings, userAiModelSettingsRelations } from './schema/ai'
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
	searchHistory,
	searchHistoryRelations,
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
	searchHistory,
	searchHistoryRelations,
	// AI
	userAiModelSettings,
	userAiModelSettingsRelations,
}

// 数据库连接初始化
import { drizzle } from 'drizzle-orm/node-postgres'

export const db = drizzle(process.env.DATABASE_URL || '', { schema })

export {
	userAiModelSettings,
	userAiModelSettingsRelations,
} from './schema/ai'
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
	searchHistory,
	searchHistoryRelations,
	sources,
	sourcesRelations,
	tags,
	tagsRelations,
} from './schema/entries'
