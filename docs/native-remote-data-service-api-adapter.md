# Native 远程 DataService 与 API 路由适配说明

本文件用于记录 `apps/native` 里 `DataService`（远程实现）与 `packages/api` 路由之间的字段与分页适配关系，避免两边 schema 演进后出现类型与运行时不一致。

## 分页 cursor 语义

- **远程模式**：`cursor` 统一使用服务端返回的 `nextCursor`，语义是「上一页最后一条记录的 `id`」。
- **本地模式**：部分列表实现可能使用不同的 cursor 语义（例如时间戳）。因此，`cursor` 应被视为不透明字符串，仅由同一实现产生并消费。

## Entries 列表与搜索

- **`entries.list`**：

  - 服务端入参不包含 `search`，返回结构为 `{ items, nextCursor?, hasMore }`。
  - `DataService` 的 `filter: 'library'` 会被适配为服务端 `filter: 'all'`，并在客户端按 `isInbox === false` 进行二次过滤。

- **`search.entries`**：

  - `DataService` 的 `ListEntriesInput.search` 在 `tagId` 为空时优先走 `search.entries`（入参字段为 `query`）。
  - 当 `tagId` 存在时，服务端没有「按 tag 搜索」路由，因此退化为 `entries.list` 拉取后在客户端做 `title/contentText` 的包含匹配。

## Tags 列表

- **`tags.list`**：

  - 服务端 `tags.list` 无入参，直接返回 `Tag[]`。
  - `DataService.tags.list` 的 `search/limit/cursor` 会在客户端对全量结果做过滤与分页（`cursor` 使用上一页最后一个 tag 的 `id`）。

## Sources 列表与条目关联

- **`sources.list`**：

  - 服务端入参不包含 `search`，返回结构为 `{ items, nextCursor?, hasMore }`。
  - `DataService.sources.list` 的 `search` 会在客户端对拉取结果做过滤与分页。

- **条目关联 sources**：

  - 获取条目的 sources：使用 `sources.getEntrySources({ entryId })`。
  - 绑定/解绑 sources：使用 `sources.addToEntry` 与 `sources.removeFromEntry`。

## Review 队列

- **`review.getQueue`**：

  - 服务端入参字段名为 `rule`（对应 `ReviewMode` 的取值集合）。
  - 服务端返回结构为 `{ items, rule, reviewedTodayCount }`，远程 `DataService` 仅透传 `items`。
