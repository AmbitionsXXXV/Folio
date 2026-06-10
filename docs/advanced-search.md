# 高级搜索功能

本文档描述 FolioNote 的高级搜索功能，包括 Postgres 全文搜索（FTS）、过滤器和搜索历史。

## 功能概述

### 1. PostgreSQL 全文搜索（FTS）

高级搜索使用 PostgreSQL 的全文搜索功能，提供比 ILIKE 更快、更准确的搜索结果。

**工作原理：**

- 使用 `to_tsvector` 和 `to_tsquery` 进行全文搜索
- 支持前缀匹配（如搜索 "note" 会匹配 "notebook"）
- 按 `updatedAt` 降序排序（确保游标分页一致性）
- 当 FTS 无结果或出错时自动回退到 ILIKE 搜索
- FTS 错误会记录到日志便于调试

**搜索语法：**

```plaintext
# 基础搜索
学习笔记

# 多词搜索（AND 逻辑）
React TypeScript

# 前缀匹配
lear -> 匹配 "learning", "learner" 等
```

### 2. 搜索过滤器

支持以下过滤器：

| 过滤器   | 描述                 | 示例                       |
| -------- | -------------------- | -------------------------- |
| 标签     | 按标签筛选条目       | 选择 "JavaScript", "React" |
| 来源     | 按关联来源筛选       | 选择某本书或文章           |
| 日期范围 | 按创建时间筛选       | 2024-01-01 至 2024-12-31   |
| 收件箱   | 仅显示收件箱中的条目 | isInbox: true              |
| 星标     | 仅显示已加星标的条目 | isStarred: true            |

**过滤器组合逻辑：**

- 同类过滤器内部使用 OR 逻辑（如选择多个标签，匹配任一即可）
- 不同类过滤器之间使用 AND 逻辑

### 3. 搜索历史

搜索历史存储在数据库中，支持跨设备同步。

**功能：**

- 自动记录搜索查询和使用的过滤器
- 显示搜索结果数量
- 支持一键清除全部历史
- 支持删除单条历史记录

### 4. 搜索建议

基于搜索历史提供智能建议：

- 输入时显示匹配的历史搜索
- 无输入时显示热门搜索（按使用频率排序）

## API 参考

### search.entries（基础搜索）

向后兼容的基础搜索 API。

```typescript
// 请求
{
  query: string      // 搜索关键词（必填，1-500 字符）
  cursor?: string    // 分页游标
  limit?: number     // 每页数量（默认 20，最大 100）
}

// 响应
{
  items: Entry[]     // 搜索结果
  nextCursor?: string
  hasMore: boolean
  query: string
  usedFts: boolean   // 是否使用了 FTS
}
```

### search.advanced（高级搜索）

支持过滤器的高级搜索 API。

```typescript
// 请求
{
  query?: string           // 搜索关键词（可选）
  tagIds?: string[]        // 标签 ID 列表
  sourceIds?: string[]     // 来源 ID 列表
  dateRange?: {
    from?: Date
    to?: Date
  }
  isInbox?: boolean
  isStarred?: boolean
  cursor?: string
  limit?: number
  useFts?: boolean         // 是否使用 FTS（默认 true）
  saveToHistory?: boolean  // 是否保存到历史（默认 false）
}

// 响应
{
  items: Entry[]
  nextCursor?: string
  hasMore: boolean
  query: string
  filters: { ... }
  usedFts: boolean
}
```

### search.saveHistory（保存历史）

手动保存搜索到历史。

```typescript
// 请求
{
  query: string
  filters?: { ... }
  resultCount?: number
}
```

### search.getHistory（获取历史）

获取最近的搜索历史。

```typescript
// 请求
{
  limit?: number  // 默认 10，最大 50
}

// 响应
Array<{
  id: string
  query: string
  filters: { ... } | null
  resultCount: number | null
  createdAt: string
}>
```

### search.deleteHistory（删除历史）

删除搜索历史。

```typescript
// 请求
{
  id?: string       // 删除单条
  deleteAll?: boolean  // 删除全部
}
```

### search.getSuggestions（获取建议）

获取搜索建议。

```typescript
// 请求
{
  query?: string   // 输入的查询前缀
  limit?: number   // 默认 5，最大 10
}

// 响应
Array<{
  query: string
  count: number    // 搜索次数
}>
```

## 数据库 Schema

### search_history 表

```sql
CREATE TABLE search_history (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  filters TEXT,                    -- JSON 字符串
  result_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX search_history_user_id_created_at_idx
  ON search_history(user_id, created_at);
CREATE INDEX search_history_user_id_query_idx
  ON search_history(user_id, query);
```

## UI 组件

### AdvancedSearch

主搜索组件，整合所有子组件。

```tsx
import { AdvancedSearch } from "@/components/search"
;<AdvancedSearch
  initialQuery="学习"
  initialFilters={{ tagIds: ["tag-1"] }}
  showHistory={true}
  showSuggestions={true}
  onSearch={(query, filters) => console.log(query, filters)}
/>
```

### SearchFilters

过滤器面板组件。

```tsx
import { SearchFilters, type SearchFiltersValue } from '@/components/search/search-filters'

const [filters, setFilters] = useState<SearchFiltersValue>({})

<SearchFilters value={filters} onChange={setFilters} />
```

### ActiveFilterBadges

显示当前活动的过滤器徽章。

```tsx
import { ActiveFilterBadges } from "@/components/search/search-filters"
;<ActiveFilterBadges value={filters} onChange={setFilters} />
```

### SearchHistory

搜索历史列表。

```tsx
import { SearchHistory } from "@/components/search/search-history"
;<SearchHistory
  onSelect={(query, filters) => handleSelect(query, filters)}
  limit={10}
/>
```

### SearchSuggestions

搜索建议列表。

```tsx
import { SearchSuggestions } from "@/components/search/search-suggestions"
;<SearchSuggestions
  query={inputValue}
  onSelect={(suggestion) => setQuery(suggestion)}
  limit={5}
/>
```

## 使用场景

### 场景 1：快速搜索

1. 按 `Cmd/Ctrl + K` 打开 Command Palette
2. 输入关键词即时搜索
3. 点击结果直接跳转，或点击「高级搜索」进入完整搜索页面

### 场景 2：过滤搜索

1. 进入搜索页面 `/search`
2. 点击「筛选」按钮打开过滤器面板
3. 选择标签、来源或日期范围
4. 查看筛选后的结果

### 场景 3：历史搜索

1. 在搜索输入框聚焦时，查看最近搜索
2. 点击历史记录快速重复搜索
3. 点击删除按钮清除不需要的历史

## 性能优化

### FTS 优化

- 使用 `simple` 配置以支持多语言
- 前缀匹配使用 `:*` 语法
- 运行迁移 `0004_add_fts_gin_index.sql` 后启用 GIN 索引
- 生成列 `search_vector` 自动维护，无需手动更新

### 查询优化

- 标签/来源过滤使用子查询预先获取 entry IDs
- 分页使用游标而非 OFFSET
- 空查询时跳过文本搜索逻辑

### 前端优化

- 搜索输入使用 300ms 防抖
- 历史记录使用 React Query 缓存
- 过滤器使用 Popover 避免页面跳转

## URL 状态同步

搜索页面支持完整的 URL 状态持久化，刷新页面后可恢复搜索状态：

| 参数        | 类型     | 描述              |
| ----------- | -------- | ----------------- |
| `q`         | string   | 搜索关键词        |
| `tags`      | string   | 标签 ID，逗号分隔 |
| `sources`   | string   | 来源 ID，逗号分隔 |
| `from`      | ISO date | 日期范围开始      |
| `to`        | ISO date | 日期范围结束      |
| `isInbox`   | "true"   | 仅收件箱          |
| `isStarred` | "true"   | 仅星标            |

**示例 URL：**

```plaintext
/search?q=React&tags=tag1,tag2&isStarred=true&from=2024-01-01T00:00:00.000Z
```

## 数据库迁移

### 0004_add_fts_gin_index.sql

添加 GIN 索引以提升 FTS 性能：

```sql
-- 添加生成的 tsvector 列
ALTER TABLE "entries" ADD COLUMN IF NOT EXISTS "search_vector" tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce("title", '') || ' ' || coalesce("content_text", ''))
  ) STORED;

-- GIN 索引
CREATE INDEX IF NOT EXISTS "entries_search_vector_idx"
  ON "entries" USING GIN ("search_vector");

-- 分页优化索引
CREATE INDEX IF NOT EXISTS "entries_user_id_updated_at_not_deleted_idx"
  ON "entries" ("user_id", "updated_at" DESC)
  WHERE "deleted_at" IS NULL;
```

运行迁移：

```bash
pnpm db:migrate
```

## 待办事项

- [x] 添加 GIN 索引到 entries 表（迁移文件：`0004_add_fts_gin_index.sql`）
- [x] 修复 FTS 分页游标逻辑（改为只按 `updatedAt` 排序）
- [x] 完善 URL 状态同步（支持所有过滤器参数）
- [x] 添加 FTS 错误日志记录
- [ ] 支持中文分词（需要安装 pg_jieba 或 zhparser 扩展）
- [ ] 添加搜索结果高亮
- [ ] 支持保存搜索过滤器为预设
