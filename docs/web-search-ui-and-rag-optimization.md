# Web Search UI 改造 & RAG 召回率优化

## 概览

本次变更包含两个独立改进：

1. **Web Search UI 改造**：将内联搜索结果卡片替换为紧凑状态条 + 右侧 slide-in panel
2. **RAG 召回率优化（Phase 1）**：引入 query 改写 + 多路召回 + LLM rerank 管线

## Part 1: Web Search UI

### 变更前

- `WebSearchToolCard` 在聊天流中直接渲染完整的 `WebSearchCard`
- 搜索结果占据大量空间，推挤后续 AI 回复内容
- 无法同时查看回复内容和搜索来源

### 变更后

- **紧凑状态条 (`WebSearchCompactBar`)**：仅显示搜索图标 + query 文本 + 结果数量 badge
- **右侧 Panel (`WebSearchPanel`)**：点击状态条弹出，展示完整结果列表（favicon + 标题 + 域名 + snippet）
- Panel 使用 `Sheet` 组件（side="right"），支持关闭按钮和点击外部关闭

### 涉及文件

| 文件 | 变更说明 |
| --- | --- |
| `packages/ai-tools/src/web-search/types.ts` | 新增 `WebSearchCompactBarProps` 类型 |
| `packages/ai-tools/src/web-search/components/web-search-compact-bar.tsx` | 新增紧凑状态条组件 |
| `packages/ai-tools/src/web-search/components/index.ts` | 导出新组件 |
| `packages/ai-tools/src/index.ts` | 包级别导出 |
| `apps/web/src/features/knowledge/components/web-search-panel.tsx` | 新增右侧结果 Panel |
| `apps/web/src/features/knowledge/components/tool-cards.tsx` | `WebSearchToolCard` 改为渲染 `CompactBar` |
| `apps/web/src/features/knowledge/components/chat-message-item.tsx` | 透传 `onOpenWebSearchPanel` 回调 |
| `apps/web/src/routes/_app/knowledge.tsx` | 集成 panel 状态管理 |
| `packages/locales/src/resources/en-US.json` | 新增 panel i18n key |
| `packages/locales/src/resources/zh-CN.json` | 新增 panel i18n key |

### 布局定位

CompactBar 和 Reference 的渲染位置遵循以下规则：

1. **CompactBar**：固定在 AI 回复内容正上方（紧跟在 reasoning/tool-calls 之后、正文之前），而非消息列表底部
2. **Reference 链接**：在 AI 回复正文下方展示搜索来源引用（favicon + hostname），最多显示 3 个，剩余折叠为 "+N Reference" 按钮
3. Web search 数据通过 `extractWebSearchData()` 从 message parts 中提取，不再作为 tool card 渲染

### 数据流

```
User 点击 CompactBar
  → ChatMessageItem.onOpenWebSearchPanel(query, results)
  → KnowledgePage.setWebSearchPanelData / setWebSearchPanelOpen
  → WebSearchPanel 右侧 slide-in 展示

User 点击 Reference 链接
  → 直接跳转到外部链接（target="_blank"）

User 点击 "+N Reference" 按钮
  → 打开 WebSearchPanel 展示完整结果列表
```

## Part 2: RAG 召回率优化

### 变更前

- 单路检索：PostgreSQL FTS (`to_tsvector` + `to_tsquery`)，FTS 失败回退 ILIKE
- 无 query 改写，用户自然语言直接切分为 FTS terms
- 无 rerank，结果按 `updatedAt DESC` 排序
- 语义相关但用词不同的笔记无法召回

### 变更后 (Phase 1)

#### 架构

```
User Query
  → [Query Rewriter] LLM 改写为 2-3 个 FTS 友好 query
  → [Multi-Retriever] 并行执行:
      - FTS (原始 query)
      - FTS (每个改写 query)
      - 标题 ILIKE 匹配
      - Tag 名称匹配
      - ILIKE fallback (原始 query)
  → [Merge & Dedup] 合并去重，按来源数排序
  → [LLM Reranker] 对候选笔记按 0-10 相关性评分
  → [Top-K] 取前 K 个结果
```

#### 新增模块

| 文件 | 说明 |
| --- | --- |
| `apps/server/src/services/rag/query-rewriter.ts` | LLM query 改写（AI SDK `generateObject`） |
| `apps/server/src/services/rag/multi-retriever.ts` | 多路召回 + 合并去重 |
| `apps/server/src/services/rag/reranker.ts` | LLM 相关性评分 rerank |
| `apps/server/src/services/rag/pipeline.ts` | 完整 RAG 管线编排 |
| `apps/server/src/services/rag/index.ts` | 统一导出 |

#### 集成方式

`ai-stream.ts` 中 `prepareNoteContext` 新增可选 `model` 参数：

- 提供 model 时：使用新 RAG pipeline（rewrite → multi-retrieve → rerank）
- 不提供 model 或 pipeline 失败时：自动回退到原有 FTS 检索

#### 配置开关

通过 `RagPipelineConfig` 控制：

- `enableQueryRewrite`：是否启用 LLM query 改写（默认 `true`）
- `enableRerank`：是否启用 LLM rerank（默认 `true`）

#### 测试

测试文件位于 `apps/server/__tests__/rag/`：

- `query-rewriter.test.ts`：验证改写输出、空输入、LLM 失败处理
- `reranker.test.ts`：验证重排序、单条笔记、LLM 失败回退
- `pipeline.test.ts`：验证完整管线、topK 限制、开关控制、fallback

### Phase 2 规划（后续）

- 在 `entries` 表添加 `embedding vector` 列（pgvector）
- 使用 BYOK embedding model 生成向量
- Hybrid search：FTS score + vector similarity 加权合并
