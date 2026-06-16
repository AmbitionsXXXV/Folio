// Auth schema

// AI schema
import {
  aiCatalogSync,
  aiChatSessions,
  aiChatSessionsRelations,
  aiModels,
  aiModelsRelations,
  aiProviders,
  aiProvidersRelations,
  userAiModelSettings,
  userAiModelSettingsRelations,
  userAiProviderSettings,
  userAiProviderSettingsRelations
} from "./schema/ai"
import {
  account,
  accountRelations,
  session,
  sessionRelations,
  user,
  userRelations,
  verification
} from "./schema/auth"
import {
  attachments,
  attachmentsRelations,
  dailyLogs,
  dailyLogsRelations,
  entries,
  entriesRelations,
  entryChunks,
  entryChunksRelations,
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
  tagsRelations
} from "./schema/entries"
// Business schema
import { entryLinks, entryLinksRelations } from "./schema/graph"

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
  entryChunks,
  entryChunksRelations,
  searchHistory,
  searchHistoryRelations,
  // Graph
  entryLinks,
  entryLinksRelations,
  // AI
  userAiModelSettings,
  userAiModelSettingsRelations,
  userAiProviderSettings,
  userAiProviderSettingsRelations,
  aiChatSessions,
  aiChatSessionsRelations,
  aiProviders,
  aiProvidersRelations,
  aiModels,
  aiModelsRelations,
  aiCatalogSync
}

// 数据库连接初始化
import { drizzle } from "drizzle-orm/node-postgres"

export const db = drizzle(process.env.DATABASE_URL || "", { schema })

export {
  aiCatalogSync,
  aiChatSessions,
  aiChatSessionsRelations,
  aiModels,
  aiModelsRelations,
  aiProviders,
  aiProvidersRelations,
  userAiModelSettings,
  userAiModelSettingsRelations,
  userAiProviderSettings,
  userAiProviderSettingsRelations
} from "./schema/ai"
// Re-export schema for external use
export {
  account,
  accountRelations,
  session,
  sessionRelations,
  user,
  userRelations,
  verification
} from "./schema/auth"
export {
  attachments,
  attachmentsRelations,
  dailyLogs,
  dailyLogsRelations,
  entries,
  entriesRelations,
  entryChunks,
  entryChunksRelations,
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
  tagsRelations
} from "./schema/entries"
export { entryLinks, entryLinksRelations } from "./schema/graph"
