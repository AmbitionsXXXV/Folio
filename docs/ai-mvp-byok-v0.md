# FolioNote AI MVP v0（BYOK：Bring Your Own Key）完整开发计划（Rev: +Usage/Token/Chat Context Telemetry）

---

## 1. 目标与范围（MVP 只做两件事 + BYOK + Usage 记录）

### 1.1 In Scope（必须交付）

* **BYOK 基础设施**
  * 设置页：用户可配置 Provider + API Key
  * 服务端：安全存储（加密）+ 校验 + 删除
  * API：所有 AI 能力默认使用用户自己的 Key
* **AI Summarize Entry**
  * 生成摘要（结构化输出）
  * 缓存（按 sourceHash + promptVersion + locale）
  * 可选 RAG 增强（用户自己的笔记）
* **AI Suggest Review List**
  * 不替代 SM-2 与 dueAt，只做：
    * 对 dueQueue 重排
    * 不足时补齐候选
    * 为每条生成 recall prompts + 推荐原因
  * LangGraph 编排工作流
  * 失败回退到默认队列
* **AI Usage / Token 记录（新增，必须交付）**
  * 记录每次调用的 token 用量（prompt/completion/total，embedding tokens）
  * 记录（可选）估算费用（¥），便于用户自查额度消耗
  * 记录单次调用的上下文使用统计（RAG chunks 数、上下文 token 估算等）
  * 不记录敏感原文（遵守既有日志/审计规则）

### 1.2 Out of Scope（明确不做）

* 全库自由问答/聊天（Chat with notes）功能本身
* 多模态（图/音）
* 端侧本地模型推理（离线 LLM）
* 自动改写/自动打标签（后续迭代）
* 平台 Key 试用模式（MVP 建议不做，避免成本不可控）

> 说明：尽管 Chat 功能不做，但本计划会**预留 Chat Context Usage 的审计结构**，以便后续无缝上线 Chat。

---

## 2. BYOK 的产品与安全设计（强约束）

### 2.1 BYOK 模式定义

* **默认模式：Server-side BYOK（推荐）**
  * 用户把 Key 存到你的服务端（加密存储）
  * 模型调用在服务端完成（便于 RAG、审计、限流、隐藏 prompt）
  * Web 端不暴露 Key；iOS 端也不需要持有 Key
* **可选模式：Ephemeral Key（不落库）**
  * 用户临时粘贴 Key，仅用于当次调用或短期 session（可选）
  * MVP 可先不实现，只在架构上预留

> 说明：Web 端直接调用第三方模型（client-side）会暴露 Key，且 CORS/防滥用困难；因此 MVP 推荐只做 server-side BYOK。

### 2.2 Key 存储与加密

* 数据库只存 **密文**，不存明文
* 使用服务端环境变量提供的主密钥进行 **信封加密/对称加密**
  * `AI_KEY_ENCRYPTION_SECRET`（32 bytes/base64）
* 禁止写日志：
  * 不记录 Key
  * 不记录 Authorization header
  * `ai_runs` 只记录 provider/model/promptVersion、输入引用（entryId/chunkId）、usage 统计，不存原文

### 2.3 权限边界

* `user_ai_credentials` 必须按 `userId` 严格隔离
* 任何 AI 相关请求必须鉴权（复用现有 auth middleware）
* RAG 检索必须 `WHERE userId = ?`，绝不跨用户

---

## 3. 高层架构（BYOK + Vercel AI SDK + RAG + LangGraph + Usage）

### 3.1 组件职责

* **packages/api**
  * AI Gateway（统一模型调用）
  * BYOK：Key 的增删改查 + 校验
  * RAG：chunk/embedding/retriever
  * LangGraph：reviewSuggest 工作流
  * 审计：ai_runs（含 token/成本/上下文统计）
* **packages/db**
  * 新表：user_ai_credentials / entry_chunks / entry_ai_artifacts / ai_runs  
      新增（可选但推荐）：ai_usage_daily / chat_conversations / chat_messages / ai_chat_context_runs
  * pgvector
* **apps/web / apps/native**
  * 设置页：配置 Key
  * Entry 详情：AI Summary 卡片
  * Review：AI Suggested Tab
    *（后续）Chat 入口不在 MVP，但 usage 结构可复用

### 3.2 请求流（Summarize）

1. 客户端调用 `ai.summarizeEntry(entryId, options)`
2. API 获取用户 Provider + 解密 API Key（BYOK）
3. 读取 Entry（contentText + tags + sources），计算 `sourceHash`
4. 命中缓存则直接返回 artifact
5.（可选）RAG：向量检索 Top-K chunks（同用户）
5. 通过 Vercel AI SDK 调用模型（使用用户 Key）
6. 写入 `entry_ai_artifacts` + `ai_runs`（含 token/上下文 usage）

### 3.3 请求流（ReviewSuggest）

1. API 获取用户 Key（BYOK）
2. LangGraph：
    * Node A：加载 dueQueue + 复习统计特征
    * Node B：RAG 检索候选用于补齐
    * Node C：规则过滤（due 优先、去重、限制数量）
    * Node D：LLM rerank + 生成 recall prompts + 推荐原因（结构化输出）
    * Node E：写 `ai_runs` + 缓存结果
3. 失败自动回退为默认 dueQueue 顺序（不影响复习主流程）

---

## 4. 数据库与 Schema 设计（Drizzle + PostgreSQL）

### 4.1 新增表（MVP 最小集合）

| 表                    | 用途                                  | 关键字段                                                                                                                                         |
| --------------------- | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| `user_ai_credentials` | BYOK：存用户的 Provider + 加密 Key    | `userId`, `provider`, `encryptedApiKey`, `keyHint`, `status`, `lastValidatedAt`, `createdAt`, `updatedAt`                                        |
| `entry_ai_artifacts`  | 缓存摘要产物                          | `entryId`, `userId`, `sourceHash`, `summary`, `keyPoints`, `recallPrompts`, `relatedEntries`, `provider`, `model`, `promptVersion`, `updatedAt`  |
| `entry_chunks`        | RAG chunks（含 embedding）            | `id`, `entryId`, `userId`, `chunkIndex`, `text`, `metadata`, `embedding`, `embeddingProvider`, `embeddingModel`, `embeddingVersion`, `createdAt` |
| `ai_runs`             | 审计与可观测（含 token/上下文 usage） | `id`, `userId`, `type`, `provider`, `model`, `promptVersion`, `inputRefs`, `latencyMs`, `status`, `error`, `createdAt`, `usage`                  |

> 说明：本次修订建议将 token 相关字段收敛为一个 `usage` JSON（或拆列均可）。JSON 的好处是适配多 Provider 返回差异。

### 4.2 `ai_runs.usage` 推荐结构（JSONB）

`usage` 示例：

* `tokens`：
  * `prompt`
  * `completion`
  * `total`
  * `embedding`（若本次包含 embedding 调用，或记录为独立 ai_run）
* `cost`（可选估算）：
  * `currency: "CNY"`
  * `estimated: number`
  * `pricingRef?: string`（价格快照版本号）
* `context`（单次上下文使用统计）：
  * `inputTextChars?: number`
  * `inputTextTokensEstimated?: number`
  * `ragTopK?: number`
  * `ragRetrievedChunkIds?: string[]`
  * `ragContextChars?: number`
  * `ragContextTokensEstimated?: number`
  * `conversation`（为后续 chat 预留，可为空）：
    * `conversationId?: string`
    * `messageIdsIncluded?: string[]`
    * `windowStrategy?: "last_n" | "token_budget"`
    * `windowMessagesCount?: number`
    * `windowTokensEstimated?: number`

### 4.3 pgvector

* 启用 `vector` extension
* 向量维度：根据你选的 embedding 模型决定
* 强制：所有检索都按 `userId` filter

---

## 5. 服务端目录与文件规划

AI 能力沉淀在独立 package `@folionote/ai`（`packages/ai`），API 层只做接入与鉴权。

### 5.1 AI 能力层（packages/ai）

```text
packages/ai/src
├── index.ts                 # 统一导出
├── schemas.ts               # 共享 Zod schemas
├── vercel-ai.ts             # Vercel AI SDK model factories（按 BYOK credential 创建模型）
├── providers
│   ├── index.ts
│   └── types.ts             # Provider 枚举、能力声明、配置
├── credentials
│   ├── index.ts
│   └── types.ts             # BYOK 凭证类型、加解密接口
├── prompts
│   ├── index.ts
│   └── versions.ts          # Prompt 版本常量
├── rag
│   ├── index.ts
│   └── types.ts             # Chunker、Embedder、Retriever 接口
├── usage
│   ├── index.ts
│   └── types.ts             # TokenUsage、AiRun、DailyUsage 类型
└── graph
    ├── index.ts
    └── types.ts             # LangGraph 风格的 workflow 类型
```

### 5.2 API 网关层（packages/api）

```text
packages/api/src/routers
├── ai.ts                    # AI 路由（调用 @folionote/ai）
├── ai-credentials.ts        # BYOK 凭证管理（后续实现）
├── ai-usage.ts              # Usage 查询（后续实现）
└── index.ts                 # appRouter 挂载
```

> **设计原则**：`@folionote/api` 只负责 HTTP 路由、鉴权、参数校验；AI 业务逻辑（加解密、RAG、workflow 编排等）全部在 `@folionote/ai` 实现，便于复用与测试。

---

## 6. 环境变量（Server-side BYOK + Usage）

新增（或在你现有 env 体系里加入）：

* `AI_KEY_ENCRYPTION_SECRET`：用于加密用户 Key（必须）
* `AI_PROMPT_VERSION_SUMMARIZE`：默认 `summarize_v0`（可选，若你希望用 env 参与灰度/回滚）
* `AI_PROMPT_VERSION_REVIEW_SUGGEST`：默认 `review_suggest_v0`（可选，若你希望用 env 参与灰度/回滚）

默认 Provider / 默认模型：

* **不通过 env 管理**：默认值由 `@folionote/ai` 的 Provider registry（代码）提供
* 后续可以演进为 **用户级配置**（存到 `user_ai_credentials` 或独立的 user settings 表），从而按用户覆盖默认模型
* 前端切换模型时同步切换 provider 与 baseUrl，确保请求与模型所属 provider 对齐

### 6.1 本地调试（AI SDK DevTools）

DevTools 数据写入当前进程目录的 `.devtools/generations.json`。在本仓库中，server 进程的工作目录是 `apps/server`，因此 viewer 需要在同一目录启动：

```bash
pnpm dev:ai-devtools
# 或
cd apps/server && npx @ai-sdk/devtools
```

当前代码默认值（仅供开发期参考）：

* Gemini 默认 chat 模型：`gemini-2.5-flash-lite`
* Gemini 默认 baseUrl（native）：`https://generativelanguage.googleapis.com/v1beta`
* Gemini baseUrl（OpenAI compatible，可选）：`https://generativelanguage.googleapis.com/v1beta/openai`
* Qwen baseUrl（CN）：`https://dashscope.aliyuncs.com/compatible-mode/v1`
* Qwen baseUrl（INTL，可选）：`https://dashscope-intl.aliyuncs.com/compatible-mode/v1`

> 提示：OpenAI 兼容 Provider（DeepSeek / Qwen / Moonshot / Gemini OpenAI compatible）默认走 `/chat/completions`，不走 `/responses`。

> 注意：Gemini embedding 目前仅支持 native baseUrl（`/v1beta`）；若使用 OpenAI compatible baseUrl（`/v1beta/openai`），embedding 会直接报错。

> 提示：如果出现 `User location is not supported for the API use`，说明 Gemini 官方 API 在当前地区不可用；可切换 Provider，或通过 baseUrl 配置代理 / 网关。

Usage / 成本估算（可选）：

* `AI_PRICING_SNAPSHOT_JSON` 与 `AI_COST_ESTIMATION_ENABLED` 建议迁移到 `config.toml`（便于版本化与审计；也更接近未来“用户级配置”演进方向）
* 示例（`apps/server/config.toml`）：

```toml
[ai]
cost_estimation_enabled = false

# Provider 价格配置快照（JSON 字符串），用于估算 estimatedCost（不用于计费，仅给用户自查）
pricing_snapshot_json = ""
```

> 注意：BYOK 模式下，**你不需要**在服务端放 `AI_API_KEY`，除非你想提供“平台 Key 试用模式”（MVP 建议不做）。

---

## 7. BYOK API 设计（新增 router：ai-credentials）

### 7.1 Router：`aiCredentials.set`

**Input**

* `provider: "openai" | "deepseek" | "qwen"`
* `apiKey: string`

**行为**

* 服务端校验格式（基础校验）
* 调用 provider 的轻量接口验证（例如列模型/最小 completion）
* 加密后写入 `user_ai_credentials`
* 返回 `keyHint`（仅用于 UI 显示，比如 `sk-****abcd`）

**Output**

* `provider`
* `keyHint`
* `status: "valid"`

### 7.2 Router：`aiCredentials.get`

**Output**

* `provider?: string`
* `keyHint?: string`
* `status?: "valid" | "invalid" | "unknown"`
* `lastValidatedAt?: string`

> 不返回明文 key。

### 7.3 Router：`aiCredentials.delete`

* 删除用户存储的凭据（或置空）

### 7.4 Router：`aiCredentials.validate`

* 手动触发校验（便于用户改 key 后测试）

---

## 8. AI API 设计（使用用户 Key + 返回 Usage）

### 8.1 Router：`ai.summarizeEntry`

**Input**

* `entryId: string`
* `mode?: "cached" | "force"`（默认 cached）
* `withRag?: boolean`（默认 true）
* `ragTopK?: number`（默认 5）
* `locale?: string`（默认 ctx.locale）

**输出（结构化）**

* `entryId`
* `sourceHash`
* `summary: string`
* `keyPoints: string[]`
* `recallPrompts: string[]`
* `relatedEntries: Array<{ entryId: string; title?: string; reason?: string }>`
* `provider`
* `model`
* `promptVersion`
* `cached: boolean`
* `usage?: { tokens?: { prompt?: number; completion?: number; total?: number }; cost?: { currency: "CNY"; estimated?: number } }`（新增）

**错误约定（建议）**

* `AI_KEY_MISSING`
* `AI_KEY_INVALID`
* `AI_PROVIDER_ERROR`
* `AI_RATE_LIMITED`

### 8.2 Router：`ai.suggestReviewList`

**Input**

* `mode: "due"`（MVP 只支持 due）
* `limit?: number`（默认 30）
* `withRag?: boolean`（默认 true）
* `ragTopK?: number`（默认 3）
* `locale?: string`

**Output**

* `items: Array<{ entryId: string; title: string; reason: string; recallPrompts: string[]; source: "due" | "ragCandidate" }>`
* `provider`
* `model`
* `promptVersion`
* `cached: boolean`
* `fallback?: boolean`
* `usage?: { tokens?: { prompt?: number; completion?: number; total?: number; embedding?: number }; cost?: { currency: "CNY"; estimated?: number } }`（新增）

---

## 9. 模型 Provider 适配层（BYOK 的关键工程点）

### 9.1 统一接口（packages/api/src/ai/providers/index.ts）

定义一个最小 provider interface：

* `createLLMClient({ apiKey, model })`
* `createEmbeddingClient({ apiKey, model })`
* `validateKey({ apiKey })`
* `extractUsage(response): { promptTokens?; completionTokens?; totalTokens? }`（新增）
* 可选：`defaultModels`

### 9.2 Vercel AI SDK 用法建议

* 生成类任务（summarize / rerank）：
  * 使用结构化输出（zod schema parse）
  * Web 端支持 streaming（先实现 summarize 的 streaming）
  * streaming 场景下 usage 获取策略：
    * 以 provider 最终返回 usage 为准
    * 若 provider 不返回，使用本地 tokenizer 估算并标注 `estimated=true`
* embedding：
  * 可直接用 provider SDK 或 LangChain embeddings wrapper
  * 关键是：embedding 调用也必须使用用户 Key（BYOK）
  * embedding token 记录：
    * 若 provider 返回 usage 则记录
    * 否则做估算（字符数/Tokenizer）

---

## 10. RAG：索引、增量更新、检索（注意 BYOK 影响）

### 10.1 重要约束：embedding 也需要 Key

因为向量是 embedding 的产物，BYOK 下存在两种路线：

#### 路线 A（推荐）：向量索引依赖用户 Key

* 用户配置 key 后，才开始对其笔记做 embedding 索引
* 优点：成本完全由用户承担
* 缺点：不同用户模型不同，向量空间不一致（但每用户隔离检索，没问题）

#### 路线 B（平台 embedding + 用户生成）

* 你用平台 Key 做 embedding，用户 Key 只用于生成
* 优点：用户即使不配 embedding 模型也能用 RAG
* 缺点：平台承担 embedding 成本（不符合“以用户 key 为主”）

**MVP 建议选路线 A**：完全 BYOK，embedding 也 BYOK；用户不配 key 就只能用非 RAG 的 summarize（或直接禁用 AI）。

### 10.2 索引触发（增量）

* 初期（最省事）：按需索引
  * 当 summarize / suggest 调用时，发现缺 chunk/embedding 则补建（受限流保护）
* 后续优化：entry 保存后异步索引
  * 仅当用户已有有效 key 时触发

### 10.3 Chunk 策略（建议）

* chunk size：约 400–800 tokens
* overlap：50–100 tokens
* metadata：title/tagIds/sourceIds/updatedAt

---

## 11. LangGraph：Review Suggest 工作流（BYOK 版）

### 11.1 Graph State（graph/types.ts）

* `userId`
* `locale`
* `limit`
* `provider`
* `model`
* `dueItems`
* `candidates`
* `ranked`
* `errors`

### 11.2 Nodes（MVP）

* `loadDueQueueNode`
* `retrieveCandidatesNode`（需要 embedding client，BYOK）
* `ruleFilterNode`
* `llmRerankNode`（使用用户 Key）
* `persistAndCacheNode`（写入 `ai_runs` 的 usage/context）

### 11.3 回退策略（必须）

* 若 `AI_KEY_MISSING/INVALID`：
  * `fallback = true`
  * 返回默认队列（并提示用户去设置 key）
* 若上游模型错误/超时：
  * `fallback = true`
  * 返回默认队列（reason 写明 fallback）

---

## 12. Web 端实现（apps/web）

### 12.1 设置页：配置 Key

建议新增组件：

* `apps/web/src/components/settings/ai-providers.tsx`

UI 要素：

* Provider 下拉选择
* API Key 输入（password 类型，带 show/hide）
* “保存并校验”
* 显示 `keyHint`、`status`、`lastValidatedAt`
* “删除 Key”

### 12.2 Entry 详情页：AI Summary 卡片

* 组件：`apps/web/src/components/entry-ai-summary.tsx`
* 行为：
  * 未配置 key：展示 CTA “去设置 AI Key”
  * 已配置 key：可 Generate / Regenerate（force）
  * streaming：优先实现
  * 展示 usage（新增）：本次调用 tokens / 估算费用（若启用）

### 12.3 Review 页面：AI Suggested Tab

* 组件：`apps/web/src/components/review/ai-suggested-tab.tsx`
* 行为：
  * 未配置 key：提示去设置
  * 失败：回退展示默认队列
  * 展示 usage（新增）

---

## 13. iOS（apps/native）实现（BYOK 友好）

### 13.1 设置页：配置 Key

* 文件：`apps/native/app/(tabs)/settings/index.tsx`
* 新增区块：AI
  * Provider
  * API Key 输入
  * 保存并校验
  * 删除 Key

> iOS 下依旧通过服务端保存 key（加密），客户端不需要 SecureStore 保存明文 key。

### 13.2 Entry 详情页与 Review

* Entry：`apps/native/app/(tabs)/inbox/[id].tsx` 增加 `AI Summary`
* Review：`apps/native/app/(tabs)/review/index.tsx` 增加 `AI Suggested`
* 离线时：
  * 置灰按钮（复用 `use-network-state`）
  * 文案提示“AI 需要联网与已配置 Key”
* 展示 usage（新增）：tokens / 估算费用

---

## 14. 安全、限流、审计（BYOK 必须更严格）

### 14.1 Rate limit（复用 packages/api 的 rate-limit）

建议默认：

* `aiCredentials.set/validate`：每用户每分钟 5 次
* `ai.summarizeEntry`：每用户每分钟 10 次
* `ai.suggestReviewList`：每用户每分钟 5 次

### 14.2 审计 ai_runs（升级：包含 token/context usage）

* 必写字段：`type/provider/model/promptVersion/status/latencyMs`
* 禁止字段：`apiKey`
* inputRefs：
  * summarize：`{ entryId, chunkIds? }`
  * suggest：`{ dueEntryIds, candidateEntryIds? }`
* usage（新增）：
  * tokens：prompt/completion/total/embedding（可选）
  * cost：estimated（可选）
  * context：RAG/chunkIds、上下文 token 估算、conversation 预留字段

### 14.3 Token 统计与成本估算规则（新增）

* **优先使用 provider 返回的 usage**
  * 例如 promptTokens、completionTokens、totalTokens
* **若 provider 不返回**
  * 使用 tokenizer 估算（按 provider/模型选择 tokenizer）
  * `usage.tokensEstimated = true`
* **成本估算（可选）**
  * 只做“展示给用户的估算”，不做计费
  * 以 `AI_PRICING_SNAPSHOT_JSON` 为价格来源
  * 记录到 `usage.cost.estimated`，货币固定为 `CNY`

---

## 15. 缓存策略（节省用户额度/成本）

### 15.1 Summarize 缓存键

* `entryId + sourceHash + promptVersion + locale + provider + model`
* 命中 `entry_ai_artifacts` 直接返回

### 15.2 ReviewSuggest 缓存键

* `userId + date(按 tz) + limit + promptVersion + locale + provider + model`
* TTL：10–30 分钟（可用 Redis；没有则 DB 简化缓存也行）

---

## 16.（新增）AI Usage 查询 API（面向用户自查）

新增 router：`aiUsage.getSummary`

**Input**

* `range: "today" | "7d" | "30d"`
* `tz?: string`（默认用户 tz）

**Output**

* `totals: { runs: number; tokensTotal?: number; tokensPrompt?: number; tokensCompletion?: number; tokensEmbedding?: number; estimatedCostCny?: number }`
* `byType: Array<{ type: string; runs: number; tokensTotal?: number; estimatedCostCny?: number }>`
* `updatedAt`

> 实现方式：  
>
> * 直接聚合 `ai_runs`（MVP 最省事）  
> * 或引入 `ai_usage_daily` 做增量聚合（后续优化）

---

## 17.（新增）Chat Context Usage 记录（为后续 Chat 预留，不做 Chat 功能）
>
> 目标：将来上线 Chat 时，能追踪“每次回答用了多少历史消息 + 多少 RAG chunks”，并可审计与调优。

### 17.1 最小实现策略（推荐）

* **不新增表也可**：直接写入 `ai_runs.usage.context.conversation` 字段
* 当未来实现 `ai.chatWithNotes` 时：
  * `conversationId`
  * `messageIdsIncluded`
  * `windowStrategy`
  * `windowTokensEstimated`
  * `ragRetrievedChunkIds`

### 17.2 可选：新增专表（若你希望更强分析能力）

新增表：`ai_chat_context_runs`（可选）

| 字段                        | 说明                                   |
| --------------------------- | -------------------------------------- |
| `id`                        | pk                                     |
| `userId`                    | 归属用户                               |
| `conversationId`            | 对话 id                                |
| `aiRunId`                   | 关联 `ai_runs.id`                      |
| `messageIdsIncluded`        | 本次上下文纳入的消息 id 列表（或范围） |
| `windowStrategy`            | `last_n` / `token_budget`              |
| `windowMessagesCount`       | 纳入消息数                             |
| `windowTokensEstimated`     | 上下文 token 估算                      |
| `ragRetrievedChunkIds`      | 本次检索命中的 chunk ids               |
| `ragContextTokensEstimated` | RAG 上下文 token 估算                  |
| `createdAt`                 | 时间                                   |

---

## 18. 测试计划（Vitest）

### 18.1 packages/api 单测新增

* `packages/api/__tests__/routers/ai-credentials.test.ts`
  * set：存储为密文（断言不会等于明文）
  * get：不返回明文
  * validate：无 key/错误 key 的错误码
* `packages/api/__tests__/routers/ai.test.ts`
  * summarize：无 key -> `AI_KEY_MISSING`
  * summarize：缓存命中 -> `cached=true`
  * suggest：provider 抛错 -> fallback 输出
  * usage：成功调用会写入 `ai_runs.usage.tokens.*`
* `packages/api/__tests__/utils/crypto.test.ts`
  * encrypt/decrypt roundtrip
  * secret 缺失时报错
* `packages/api/__tests__/ai/usage.test.ts`（新增）
  * provider 返回 usage -> 正确落库
  * provider 不返回 usage -> 走估算并标记 estimated
  * cost 估算开关关闭时不写 cost（或 cost 为空）

### 18.2 安全回归

* 日志扫描：测试中确保不会输出 `apiKey`（可在 logger mock 中断言）
* `ai_runs` 不含原文内容（仅 inputRefs/usage/context 统计）

---

## 19. 里程碑（2–3 周，含 BYOK + Usage）

| Milestone                     | 预计耗时 | 交付内容                                                    | 验收标准                             |
| ----------------------------- | -------: | ----------------------------------------------------------- | ------------------------------------ |
| M0 BYOK 基建                  |   2–3 天 | user_ai_credentials 表 + 加密存储 + set/get/validate/delete | Web/iOS 可配置 key，服务端不泄露明文 |
| M1 Summarize v0（无 RAG）     |   3–5 天 | 摘要生成 + artifact 缓存 + streaming（Web）                 | 同一内容重复点击不重复消耗           |
| M1.5 Usage/Token 记录（新增） |   1–2 天 | `ai_runs.usage` 落库 + UI 展示 tokens/估算费用（可选）      | 每次调用可查 tokens，日志无敏感数据  |
| M2 RAG（BYOK embedding）      |   3–5 天 | pgvector + chunks + retriever + 按需索引                    | 检索严格 userId 隔离，缺索引可补建   |
| M3 ReviewSuggest（LangGraph） |   5–7 天 | AI Suggested tab + rerank + recall prompts                  | AI 失败自动回退，不影响复习主链路    |
| M4 收敛与可观测               |   2–3 天 | ai_runs 统计、错误码/i18n、限流、缓存 TTL、Usage 汇总 API   | 可追踪、可回滚、可稳定上线           |

---

## 20. 具体任务清单（可直接贴到项目管理）

### 20.1 DB（packages/db）

* [ ] 新增 pgvector extension migration
* [ ] 新增表：`user_ai_credentials`
* [ ] 新增表：`entry_ai_artifacts`, `entry_chunks`, `ai_runs`
* [ ] `entry_chunks` 增加：`embeddingProvider/embeddingModel/embeddingVersion`
* [ ] `ai_runs` 增加：`usage JSONB`（或拆列）
* [ ] 索引：`userId`、`createdAt`、向量索引（可选）
* [ ]（可选）新增表：`ai_chat_context_runs`（后续 chat 用）

### 20.2 API（packages/api）

* [ ] `routers/ai-credentials.ts`：set/get/validate/delete
* [ ] `ai/credentials/crypto.ts`：encrypt/decrypt（AES-GCM 或 libsodium sealed box）
* [ ] `ai/providers/*`：provider 适配（至少 1 个先跑通）
* [ ] provider 适配层补充：`extractUsage()`（不同 provider 兼容）
* [ ] `ai/usage/tokens.ts`：usage 标准化 + 估算兜底
* [ ] `ai/usage/cost.ts`：价格快照解析 + 成本估算（可选开关）
* [ ] `ai/usage/persist.ts`：写入 `ai_runs.usage`
* [ ] `routers/ai.ts`：summarizeEntry / suggestReviewList（返回 usage）
* [ ] `routers/ai-usage.ts`：usage 汇总查询（可选但推荐）
* [ ] `ai/rag/*`：chunker/embeddings/indexer/retriever（embedding 走 BYOK）
* [ ] `ai/graph/review-suggest.graph.ts`：LangGraph 工作流
* [ ] 统一错误码与 i18n message
* [ ] rate limit 接入

### 20.3 Web（apps/web）

* [ ] AI Settings UI（provider/key、保存校验、删除、状态展示）
* [ ] EntryAISummaryCard：无 key CTA + streaming + 缓存展示
* [ ] EntryAISummaryCard：展示 tokens/估算费用（若启用）
* [ ] Review AI Suggested Tab：无 key CTA + fallback 展示
* [ ] Review AI Suggested Tab：展示 tokens/估算费用（若启用）
* [ ] locales 增加 ai 相关 key

### 20.4 Native（apps/native）

* [ ] Settings：AI Key 配置 UI
* [ ] Entry 详情页：AI Summary（在线）
* [ ] Entry 详情页：展示 usage（tokens/费用）
* [ ] Review：AI Suggested（可后置）
* [ ] 离线提示与按钮置灰

---

## 21. i18n 建议 keys（packages/locales）

* `ai.settings.title`
* `ai.settings.provider`
* `ai.settings.apiKey`
* `ai.settings.saveAndValidate`
* `ai.settings.deleteKey`
* `ai.settings.status.valid`
* `ai.settings.status.invalid`
* `ai.settings.status.missing`
* `ai.summary.title`
* `ai.summary.generate`
* `ai.summary.regenerate`
* `ai.summary.cached`
* `ai.reviewSuggest.title`
* `ai.reviewSuggest.loading`
* `ai.reviewSuggest.fallback`
* `ai.usage.title`
* `ai.usage.tokens`
* `ai.usage.estimatedCost`
* `ai.errors.keyMissing`
* `ai.errors.keyInvalid`
* `ai.errors.providerError`
* `ai.errors.rateLimited`

---

## 22. 上线验收清单（BYOK + Usage 专项）

### 22.1 BYOK 功能

* [ ] Web 设置页可保存并校验 key，显示 keyHint 与 lastValidatedAt
* [ ] iOS 设置页同样可用
* [ ] 服务端从不返回明文 key
* [ ] DB 中 apiKey 为密文（抽样检查）

### 22.2 AI 主流程

* [ ] 未配置 key：Summarize/ReviewSuggest 均提示去设置，不崩溃
* [ ] 配置 key 后：Summarize 成功且可缓存
* [ ] ReviewSuggest 成功；失败回退到默认 dueQueue
* [ ] RAG 不串用户（两用户数据验证）

### 22.3 安全与成本

* [ ] rate limit 生效
* [ ] 日志中无 key、无 Authorization
* [ ] ai_runs 每次调用都有记录（成功/失败）
* [ ] ai_runs 中包含 usage（tokens）且不包含原文
* [ ]（若启用成本估算）估算费用显示为 ¥，且标注为 estimated（非计费）

如果你希望我把 `ai_runs.usage` 从 JSONB 改成“拆列方案”（更方便 SQL 聚合、性能更稳定），我也可以给你一版等价的 schema 与迁移写法。

下面把我上次加到计划里的“token 消耗 + 单次 chat context usage 记录”继续往下落到**可直接开工的实现细节**（schema 取舍、迁移、代码骨架、聚合查询）。

## 1) `ai_runs` 的两种落库方案（建议你选其一）

### 方案 A：`usage` 用 `JSONB`（我上版写的）

适合：多 provider、字段经常变、先跑通 MVP。

* 优点：兼容性强、改动小
* 缺点：SQL 聚合稍麻烦，性能要靠表达式索引/离线聚合

### 方案 B：`ai_runs` 拆列 + `usage_json` 兜底（更适合长期）

适合：你确定要做 usage dashboard、账单式统计、需要高性能聚合。

建议字段（最常用的拆出来）：

| 字段               | 类型    | 说明                             |
| ------------------ | ------- | -------------------------------- |
| `promptTokens`     | int     | 生成类输入 tokens                |
| `completionTokens` | int     | 生成类输出 tokens                |
| `totalTokens`      | int     | 总 tokens                        |
| `embeddingTokens`  | int     | embedding tokens（若有）         |
| `estimatedCostCny` | numeric | 估算费用（¥）                    |
| `tokensEstimated`  | boolean | 是否为估算（非 provider 返回）   |
| `usageJson`        | jsonb   | 其余 provider 差异字段 & context |

> 我建议：**MVP 用方案 A**；如果你已经确定要做“用量统计页”，直接上方案 B 会省很多返工。

---

## 2) SQL Migration 示例（给你可直接改成 Drizzle migration）

下面以**方案 B（拆列 + JSONB）**为例（方案 A 你就只保留 `usage` / `usageJson`）：

```sql
ALTER TABLE ai_runs
    ADD COLUMN prompt_tokens integer,
    ADD COLUMN completion_tokens integer,
    ADD COLUMN total_tokens integer,
    ADD COLUMN embedding_tokens integer,
    ADD COLUMN tokens_estimated boolean NOT NULL DEFAULT false,
    ADD COLUMN estimated_cost_cny numeric(12, 6),
    ADD COLUMN usage_json jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX ai_runs_user_created_idx
    ON ai_runs(user_id, created_at DESC);

CREATE INDEX ai_runs_type_created_idx
    ON ai_runs(type, created_at DESC);

-- 可选：如果你保留 JSONB 并需要按字段过滤/聚合，可以加表达式索引
-- CREATE INDEX ai_runs_usage_total_tokens_idx
--     ON ai_runs(((usage_json->'tokens'->>'total')::int));
```

---

## 3) Provider usage 抽取：统一标准化函数（关键点）

你在 `ai/providers/*` 增加 `extractUsage()` 的意义是：**不同 provider 返回结构不一，但你落库结构要统一**。

推荐统一成：

```ts
type NormalizedUsage = {
    tokens?: {
        prompt?: number
        completion?: number
        total?: number
        embedding?: number
    }
    tokensEstimated?: boolean
    cost?: {
        currency: "CNY"
        estimated?: number
        pricingRef?: string
    }
    context?: {
        ragTopK?: number
        ragRetrievedChunkIds?: string[]
        ragContextTokensEstimated?: number
        conversation?: {
            conversationId?: string
            messageIdsIncluded?: string[]
            windowStrategy?: "last_n" | "token_budget"
            windowMessagesCount?: number
            windowTokensEstimated?: number
        }
    }
}
```

落库时：

* **有 provider usage 就用 provider 的**
* 没有就走 tokenizer 估算，并 `tokensEstimated = true`
* embedding 建议**单独一条 `ai_runs`**（type = `embedding.index` / `embedding.query`），或者把 embedding 也合并到同一次 run 的 `embeddingTokens`（两种都行，但统计上“分开更清晰”）

---

## 4) Token 估算（provider 不返 usage 时的兜底）

你可以做一个简单策略，不追求 100% 精确：

* 对生成类：
  * `promptTokensEstimated = estimateTokens(system + messages + retrievedChunksText)`
  * `completionTokensEstimated = estimateTokens(outputText)`（如果你能拿到完整输出）
* 对 embedding：
  * `embeddingTokensEstimated = estimateTokens(inputText)`

实现上：

* Web/Node 里可以用 tokenizer 库（按 provider/model 选择）
* 实在不想引依赖，可以先用 “字符数/4” 粗估，但要标记 `tokensEstimated=true`

---

## 5) “单 chat context usage 记录”怎么写入（即使现在不做 Chat）

你现在不做 Chat 功能，但要做到“以后能记录”，建议在写 `ai_runs` 时预留写入点：

### 5.1 RAG 场景（你现在就能记录）

当 summarize/review-suggest 发生检索：

* `context.ragTopK`
* `context.ragRetrievedChunkIds`
* `context.ragContextTokensEstimated`（把拼接到 prompt 里的 rag 文本估算一下 tokens）

这一步可以立刻用于调参（比如 topK 太大导致成本高）。

### 5.2 未来 Chat 场景（预留字段即可）

等你加 `ai.chatWithNotes` 后，每次回答写入：

* `context.conversation.conversationId`
* `context.conversation.messageIdsIncluded`
* `context.conversation.windowStrategy`
* `context.conversation.windowMessagesCount`
* `context.conversation.windowTokensEstimated`

> 如果你打算落专表 `ai_chat_context_runs`：写入时机就是“chat answer 成功/失败都写一条”，并用 `aiRunId` 关联 `ai_runs.id`。

---

## 6) 成本估算（¥）怎么做才不踩坑

强调：这是**展示给用户自查**，不是计费。

建议规则：

* 成本估算开关 `AI_COST_ESTIMATION_ENABLED=false` 默认关闭
* 开启时用 `AI_PRICING_SNAPSHOT_JSON`（你自己维护的价格快照）
* 估算公式（按百万 tokens 计价时）：

\[
\text{cost} = \frac{\text{promptTokens}}{10^6}\cdot P_{in} + \frac{\text{completionTokens}}{10^6}\cdot P_{out} + \frac{\text{embeddingTokens}}{10^6}\cdot P_{emb}
\]

并落库：

* `estimatedCostCny`
* `pricingRef`（比如 `2026-01-13` 或版本号）

---

## 7) `aiUsage.getSummary` 的聚合查询（不新增日汇总表的 MVP 写法）

直接聚合 `ai_runs`：

```sql
SELECT
    COUNT(*) AS runs,
    COALESCE(SUM(total_tokens), 0) AS total_tokens,
    COALESCE(SUM(prompt_tokens), 0) AS prompt_tokens,
    COALESCE(SUM(completion_tokens), 0) AS completion_tokens,
    COALESCE(SUM(embedding_tokens), 0) AS embedding_tokens,
    COALESCE(SUM(estimated_cost_cny), 0) AS estimated_cost_cny
FROM ai_runs
WHERE user_id = $1
  AND created_at >= $2
  AND created_at < $3;
```

再来一个按 type 分组：

```sql
SELECT
    type,
    COUNT(*) AS runs,
    COALESCE(SUM(total_tokens), 0) AS total_tokens,
    COALESCE(SUM(estimated_cost_cny), 0) AS estimated_cost_cny
FROM ai_runs
WHERE user_id = $1
  AND created_at >= $2
  AND created_at < $3
GROUP BY type
ORDER BY runs DESC;
```

---

如果你愿意，我可以按你项目的实际栈（你文档里是 Drizzle + PostgreSQL + Vercel AI SDK）把下面两块也补齐成“可直接粘贴进仓库的版本”：

* `packages/db` 的 Drizzle table 定义（含 `ai_runs` 新字段/JSONB）
* `packages/api/src/ai/usage/*` 三个文件的最小实现（标准化、估算、persist）


---

## 23. 用户级模型启用开关（全类型 + 全站生效）

**实现日期**：2026-01-14

### 23.1 功能概述

用户可在设置页为每个模型单独启用/禁用，该设置：

1. **持久化存储**：保存到数据库 `user_ai_model_settings` 表
2. **全类型支持**：覆盖 chat / embedding / image / tts / stt / realtime / text2video / text2music
3. **全站生效**：
   - 设置页显示开关状态
   - 模型选择器（ChatInput / ModelSelector）仅展示已启用的模型
   - 服务端 `ai.generateText` 拒绝被禁用的模型

### 23.2 数据库设计

新增表 `user_ai_model_settings`（`packages/db/src/schema/ai.ts`）：

| 字段        | 类型      | 说明                                            |
| ----------- | --------- | ----------------------------------------------- |
| id          | text (PK) | nanoid 主键                                     |
| user_id     | text (FK) | 关联 user.id，级联删除                          |
| provider_id | text      | model-list provider id（openai / anthropic 等） |
| model_id    | text      | 模型 id（gpt-4o / claude-sonnet-4-5 等）        |
| type        | text      | 模型类型（chat / embedding / image 等）         |
| enabled     | boolean   | 用户设置的启用状态                              |
| created_at  | timestamp | 创建时间                                        |
| updated_at  | timestamp | 更新时间（自动更新）                            |

约束：

- 唯一索引：`(user_id, provider_id, model_id, type)`
- 用户查询索引：`(user_id)`

### 23.3 API 设计

在 `packages/api/src/routers/ai.ts` 新增：

#### `ai.getModelCatalog`（protected）

返回合并后的模型目录：

- `providers`：来自 `DEFAULT_MODEL_PROVIDER_LIST`
- `models`：来自 `FOLIO_DEFAULT_MODEL_LIST`，应用用户覆盖后的 `enabled` 状态

#### `ai.setModelEnabled`（protected）

输入：`{ providerId, id, type, enabled }`

- 校验模型存在于 `FOLIO_DEFAULT_MODEL_LIST`
- Upsert 到 `user_ai_model_settings`

#### `ai.generateText` 增强

当传入 `model` 时：

- 映射 API provider（openai/deepseek/gemini/claude/qwen）到 model-list provider（openai/deepseek/google/anthropic/qwen）
- 检查该 model 对用户是否 enabled
- 若禁用则返回 `ORPCError('BAD_REQUEST')`

### 23.4 Web 端实现

#### 新增 Hook：`use-ai-model-catalog.ts`

- `useAiModelCatalog()`：封装 catalog 查询，返回 providers/models
- `useSetModelEnabled()`：封装 mutation，成功后 invalidate cache

#### 设置页 UI：`models.tsx` 新增 "Models" 区块

- 搜索框：按 displayName / id / provider 过滤
- 类型筛选：下拉选择 chat / embedding / all 等
- 模型列表：按 provider 分组，每行显示模型名称 + type badge + Switch 开关
- 状态统计：显示"已启用 X 个模型 / 共 Y 个模型"

#### 模型选择器改造

- `ChatInput`：从 props 接收 `catalogProviders` / `catalogModels`，仅展示 enabled 的 chat 模型
- `ModelSelector`：`createModelSelectorGroups()` 改为运行时基于 catalog 生成
- `knowledge.tsx`：加载 catalog 后校验当前选中模型，若被禁用则自动回退到首个可用模型

### 23.5 i18n Keys

新增 `settings.models.modelList.*`：

- `title`、`description`、`searchPlaceholder`、`noResults`
- `enabledCount`、`totalCount`
- `type.chat`、`type.embedding`、`type.image` 等
- `allTypes`、`enableAll`、`disableAll`

### 23.6 测试

新增 `packages/api/__tests__/routers/ai-model-catalog.test.ts`：

- `mergeModelSettings()`：验证默认 enabled、用户覆盖、类型区分
- `validateModelExists()`：验证模型存在性校验

---

## 24. Knowledge Chat：内置 Prompt + @ 笔记附件 + FTS 检索增强

**实现日期**：2026-01-14

### 24.1 功能概述

Knowledge Chat 功能允许用户与 AI 进行基于个人知识库的对话。核心特性：

1. **内置系统 Prompt**：定义知识库助手行为规则，优先使用用户笔记作为上下文
2. **@ 笔记附件**：用户可通过 `@` 显式引用 Library 中的笔记作为对话上下文
3. **FTS 检索增强**：自动基于用户输入进行全文搜索（FTS/ILIKE fallback），检索相关笔记作为补充上下文

### 24.2 数据流与安全边界

```text
[用户输入] + [@ 附件笔记 IDs]
         ↓
    ┌─────────────────────────┐
    │   Web 端 (ChatInput)     │
    │   - @ 触发 EntryPicker   │
    │   - 维护附件状态          │
    │   - 发送 noteEntryIds    │
    └─────────────────────────┘
         ↓ POST /api/ai/stream
    ┌─────────────────────────┐
    │   Server 端              │
    │   1. 鉴权 (userId)       │
    │   2. 校验 noteEntryIds   │
    │      - 最多 10 条        │
    │      - 必须属于当前用户   │
    │      - 必须是 Library     │
    │      - 未删除             │
    │   3. FTS 检索 Top-K      │
    │      - userId 严格隔离   │
    │      - 排除已附件笔记     │
    │   4. 构建 Prompt         │
    │      - 系统指令           │
    │      - 附件笔记上下文     │
    │      - 检索笔记上下文     │
    │      - 用户问题           │
    │   5. 调用 LLM (BYOK)     │
    └─────────────────────────┘
         ↓
    [Streaming 响应]
```

**安全边界**：

- 所有笔记查询强制 `WHERE userId = ? AND deletedAt IS NULL AND isInbox = false`
- FTS 检索与附件笔记查询均按 userId 严格隔离
- noteEntryIds 最多允许 10 条，防止滥用
- 去重处理：检索结果排除已附件的笔记

### 24.3 Prompt 构建策略

Prompt 由以下四部分组成，按顺序拼接：

1. **System 指令**（`KNOWLEDGE_CHAT_SYSTEM_PROMPT`）
   - 定义助手角色为"知识库助手"
   - 优先使用附件与检索笔记回答
   - 信息不足时明确说明缺口
   - 引用笔记时提及标题
   - 使用 Markdown 格式输出

2. **附件笔记上下文**（用户显式选择）
   - 标记为 "Attached Notes (User Selected)"
   - 优先分配 token 预算

3. **检索笔记上下文**（FTS Top-K）
   - 标记为 "Related Notes (Retrieved)"
   - 使用剩余 token 预算

4. **用户输入**
   - 标记为 "User Question"

**Token 预算控制**：

- 单笔记最大 ~2000 tokens（约 8000 字符）
- 总上下文最大 ~8000 tokens（约 32000 字符）
- 超出预算时截断并标记 `wasTruncated`

### 24.4 实现文件

| 模块          | 文件路径                                             | 功能                            |
| ------------- | ---------------------------------------------------- | ------------------------------- |
| AI Package    | `packages/ai/src/prompts/knowledge-chat.ts`          | Prompt 构建器 + 系统指令常量    |
| AI Package    | `packages/ai/src/prompts/index.ts`                   | 导出 knowledge-chat             |
| AI Tests      | `packages/ai/__tests__/knowledge-chat.test.ts`       | Prompt 构建单测                 |
| Server        | `apps/server/src/index.ts`                           | `/api/ai/stream` 扩展           |
| Web Hook      | `apps/web/src/hooks/use-stream-text.ts`              | 支持 noteEntryIds 参数          |
| Web Component | `apps/web/src/components/ai-elements/chat-input.tsx` | @ 触发 + 附件 chips UI          |
| Web Component | `apps/web/src/components/entry-picker.tsx`           | libraryOnly 过滤支持            |
| Web Page      | `apps/web/src/routes/_app/knowledge.tsx`             | 附件状态管理 + EntryPicker 集成 |
| i18n          | `packages/locales/src/resources/*.json`              | 新增 UI 文案                    |

### 24.5 API 扩展

`POST /api/ai/stream` 新增可选字段：

```typescript
{
  // 现有字段
  provider: string
  apiKey: string
  baseUrl?: string
  model?: string
  prompt: string
  
  // 新增字段
  noteEntryIds?: string[]  // 最多 10 条
  ragTopK?: number         // 默认 5
}
```

### 24.6 i18n Keys

新增键：

- `knowledge.inputPlaceholder`：更新为 "Ask anything… Type @ to attach notes"
- `knowledge.selectNoteToAttach`：选择笔记对话框标题
- `knowledge.removeAttachment`：移除附件按钮 aria-label
- `knowledge.emptyState.description`：更新说明文案

### 24.7 测试验证

- **单测**：`pnpm vitest run --project=packages packages/ai/__tests__/knowledge-chat.test.ts`
  - 覆盖 Prompt 拼接、截断、去重逻辑
- **类型检查**：`pnpm run check-types`
- **Lint**：`pnpm check:fix`

---

## 25. 会话上下文与 @mention 对齐

### 25.1 背景

原有实现存在以下问题：

1. **@mention 渲染不一致**：输入框高亮依赖 `attachedNotes` 的 `title` 列表，但消息气泡渲染时无法获取这些标题，导致用户消息中的 @mention 不会以徽章形式显示。
2. **会话上下文断联**：长对话中发送的历史消息未正确携带给模型，导致多轮对话失去上下文。
3. **请求体格式**：使用简化的 `{ role, content }` 格式，与 Vercel AI SDK 推荐的 `UIMessage[]` + `convertToModelMessages` 模式不一致。

### 25.2 修改点

#### 25.2.1 ChatMessage 类型扩展

在 `features/knowledge/types.ts` 中为 `ChatMessage` 新增 `mentionTitles?: string[]` 字段，在发送消息时将 `attachedNotes` 的标题列表持久化到用户消息：

```typescript
export type ChatMessage = {
  // ... existing fields
  /** Mention titles for rendering @mentions in user messages */
  mentionTitles?: string[]
}
```

#### 25.2.2 MessageBubble 渲染对齐

`UserMessageContent` 组件接收 `mentionTitles` 并传递给 `renderTextWithMentions`，与输入框高亮逻辑保持一致。

#### 25.2.3 前端请求改用 UIMessage[]

`use-stream-text.ts` 的 `ChatMessageInput` 类型改为 `UIMessage`（来自 `ai` 包），前端构造完整的 UIMessage 数组：

```typescript
const conversationHistory: ChatMessageInput[] = [...messages, userMessage].map(
  (msg) => ({
    id: msg.id,
    role: msg.role,
    content: msg.content,
    createdAt: msg.timestamp,
    parts: [{ type: 'text', text: msg.content }],
  })
)
```

#### 25.2.4 服务端转换

`ai-stream.ts` 接收 `UIMessage[]`，使用 `convertToModelMessages` 将其转换为模型可识别的格式。会话模式下使用 `buildKnowledgeChatSystemPrompt` 构造不含 "User Question" 的系统提示，避免重复。

#### 25.2.5 Prompt 构造函数

新增 `buildKnowledgeChatSystemPrompt`（conversation mode）与原有 `buildKnowledgeChatPrompt`（single-turn mode）区分：

- `buildKnowledgeChatPrompt`：返回 `{ prompt }` 包含完整提示（含 User Question 节）
- `buildKnowledgeChatSystemPrompt`：返回 `{ systemPrompt }` 仅含系统指令与笔记上下文

### 25.3 文件变更

| 模块           | 文件路径                                                        | 变更                                    |
| -------------- | --------------------------------------------------------------- | --------------------------------------- |
| Knowledge Type | `apps/web/src/features/knowledge/types.ts`                      | 新增 `mentionTitles` 字段               |
| MessageBubble  | `apps/web/src/features/knowledge/components/message-bubble.tsx` | 传递 `mentionTitles` 给渲染函数         |
| Knowledge Page | `apps/web/src/routes/_app/knowledge.tsx`                        | 发送时捕获 mention 标题，构造 UIMessage |
| Stream Hook    | `apps/web/src/hooks/use-stream-text.ts`                         | `ChatMessageInput` 改为 `UIMessage`     |
| AI Stream      | `apps/server/src/routes/ai-stream.ts`                           | 使用 `convertToModelMessages`           |
| AI Prompt      | `packages/ai/src/prompts/knowledge-chat.ts`                     | 新增 `buildKnowledgeChatSystemPrompt`   |
| Stream Text    | `packages/ai/src/stream-text.ts`                                | 支持 `ModelMessage[]` 类型              |
| Tests          | `packages/ai/__tests__/knowledge-chat.test.ts`                  | 新增会话模式单测                        |
| Server deps    | `apps/server/package.json`                                      | 新增 `ai` 依赖                          |

### 25.4 验证

- 单测：`pnpm vitest run --project=packages packages/ai/__tests__/knowledge-chat.test.ts`
- 类型检查：`pnpm run check-types`

---

## 26. Knowledge Chat 会话持久化与断线恢复

**实现日期**：2026-01-18

### 26.1 功能概述

Knowledge Chat 会话持久化功能使用户可以：

1. **刷新页面后恢复对话**：消息历史通过 localStorage 持久化，重新打开页面时自动加载
2. **断线后恢复**：服务端内存存储支持查询已完成的消息，客户端可在断线后重新获取
3. **多会话支持**：每个会话有唯一的 chatId，"新对话"按钮会生成新 chatId 并清空历史

### 26.2 数据流

```text
[用户发送消息]
      ↓
┌─────────────────────────────────────┐
│   Web 端                            │
│   1. 生成 assistantMessageId        │
│   2. 保存 userMessage 到 localStorage│
│   3. POST /api/ai/stream            │
│      - chatId                       │
│      - assistantMessageId           │
│      - messages (UIMessage[])       │
└─────────────────────────────────────┘
      ↓
┌─────────────────────────────────────┐
│   Server 端                         │
│   1. 保存 messages 到内存存储        │
│   2. 标记 stream 进行中             │
│   3. 流式生成 + 累积文本            │
│   4. 完成后持久化 assistantMessage  │
└─────────────────────────────────────┘
      ↓
[流式响应完成]
      ↓
┌─────────────────────────────────────┐
│   Web 端                            │
│   1. 更新 messages 状态             │
│   2. 保存完整消息到 localStorage    │
└─────────────────────────────────────┘
```

### 26.3 前端实现

#### 26.3.1 消息序列化工具（`features/knowledge/utils.ts`）

新增函数：

- `generateChatId()`：生成新的 chat ID
- `getOrCreateChatId()`：获取或生成 chatId（localStorage）
- `setChatId(chatId)`：设置当前 chatId
- `clearChatId()`：清除当前 chatId
- `serializeMessage(message)`：将 `ChatMessage` 序列化（Date → string）
- `deserializeMessage(message)`：将序列化消息反序列化（string → Date）
- `saveChatMessages(chatId, messages)`：保存消息到 localStorage
- `loadChatMessages(chatId)`：从 localStorage 加载消息
- `clearChatMessages(chatId)`：清除指定 chat 的消息

#### 26.3.2 Knowledge Page 集成（`routes/_app/knowledge.tsx`）

- 初始化时调用 `getOrCreateChatId()` 获取 chatId
- 初始化时调用 `loadChatMessages(chatId)` 加载历史消息（过滤未完成的流式消息）
- 发送消息时先保存 userMessage 到 localStorage
- 流式完成后保存完整消息到 localStorage
- "新对话"按钮：清除旧消息、生成新 chatId、重置状态

#### 26.3.3 Stream Hook 扩展（`hooks/use-stream-text.ts`）

`StreamTextParams` 新增：

- `chatId?: string`：会话 ID
- `assistantMessageId?: string`：预生成的助手消息 ID

### 26.4 服务端实现

#### 26.4.1 内存存储模块（`services/ai-chat-store.ts`）

```typescript
type ChatSession = {
  userId: string
  chatId: string
  messages: UIMessage[]
  updatedAt: Date
  streamInProgress: boolean
  streamingMessageId?: string
}
```

API：

- `getChatMessages(userId, chatId)`：获取消息列表
- `saveChatMessages(userId, chatId, messages)`：保存消息
- `markStreamInProgress(userId, chatId, assistantMessageId)`：标记流式进行中
- `completeStream(userId, chatId, assistantMessageId, assistantMessage)`：完成流式并追加消息
- `isStreamInProgress(userId, chatId)`：检查是否有进行中的流式
- `deleteChatSession(userId, chatId)`：删除会话

安全特性：

- 按 `userId + chatId` 复合键隔离，防止跨用户访问
- 自动清理 24 小时以上的旧会话
- 最大保留 1000 个会话，超出时删除最老的

#### 26.4.2 API 扩展（`routes/ai-stream.ts`）

新增 `GET /api/ai/chat/:chatId`：

- 返回 `{ chatId, messages, streamInProgress }`
- 需要鉴权，按 userId 隔离

`POST /api/ai/stream` 扩展：

- 请求体新增 `chatId`、`assistantMessageId`
- 流式开始前保存 messages 并标记进行中
- 流式完成后持久化 assistantMessage

### 26.5 文件变更

| 模块            | 文件路径                                      | 变更                           |
| --------------- | --------------------------------------------- | ------------------------------ |
| Knowledge Utils | `apps/web/src/features/knowledge/utils.ts`    | 新增序列化与 localStorage 工具 |
| Knowledge Index | `apps/web/src/features/knowledge/index.ts`    | 导出新工具函数                 |
| Stream Hook     | `apps/web/src/hooks/use-stream-text.ts`       | 新增 chatId/assistantMessageId |
| Knowledge Page  | `apps/web/src/routes/_app/knowledge.tsx`      | 集成 chatId 与消息持久化       |
| Chat Store      | `apps/server/src/services/ai-chat-store.ts`   | 新增内存存储模块               |
| AI Stream       | `apps/server/src/routes/ai-stream.ts`         | 新增 GET 接口与持久化逻辑      |
| Tests           | `apps/server/__tests__/ai-chat-store.test.ts` | 新增 11 个单测用例             |

### 26.6 验证

- 单测：`pnpm vitest run --project=server apps/server/__tests__/ai-chat-store.test.ts`
- 类型检查：`pnpm run check-types`
- Lint：`pnpm check`

### 26.7 限制与后续优化

- **内存存储**：当前使用内存存储，服务重启会丢失历史。后续可扩展为数据库持久化（新增 `chat_conversations` 与 `chat_messages` 表）
- **断线续传**：当前仅支持查询已完成消息，未实现真正的 resume stream。后续可参考 Vercel AI SDK 的 `resumeStream` 功能
- **消息同步**：localStorage 与服务端存储独立，无实时同步。后续可通过 WebSocket 或轮询实现

---

## 27. AI SDK v6 消息持久化最佳实践对齐

**实现日期**：2026-01-18

### 27.1 背景

Section 26 的实现虽然实现了基本的会话持久化，但存在以下与 AI SDK v6 最佳实践的偏差：

1. **客户端生成 messageId**：不符合 AI SDK v6 推荐的服务端生成 ID 策略，跨会话一致性难以保证
2. **持久化源分裂**：前端使用 localStorage，服务端使用内存存储，两者独立且不同步
3. **持久化时机分散**：流式开始时保存历史消息，完成时单独追加 assistant 消息，而非在 `onFinish` 统一落库
4. **自定义 streaming 协议**：使用特殊分隔符传递 thinking 和 usage，与 AI SDK 的 `toUIMessageStreamResponse` 格式不兼容
5. **缺少 `consumeStream`**：断线时流可能中止，导致 `onFinish` 不被调用

### 27.2 AI SDK v6 推荐模式

AI SDK v6 的消息持久化遵循以下核心原则：

1. **UIMessage[] 作为标准格式**：数据库直接存储 `UIMessage[]`，包含 `id`、`role`、`parts` 等完整信息
2. **服务端生成 messageId**：使用 `createIdGenerator` 或手动在 `createUIMessageStream` 中设置
3. **onFinish 统一落库**：在 `toUIMessageStreamResponse({ onFinish })` 中一次性保存完整消息数组
4. **consumeStream 断线保护**：确保即使客户端断开，流仍能完成并触发 onFinish
5. **prepareSendMessagesRequest 优化带宽**：可选只发送最新消息，服务端加载历史

### 27.3 实现改动

#### 27.3.1 服务端存储重构（`ai-chat-store.ts`）

新增 API（`UIMessage[]` 为中心）：

```typescript
// 核心 API
createChat(input): ChatSession        // 创建会话
loadChat(userId, chatId): ChatSession // 加载会话
loadChatMessages(userId, chatId): UIMessage[] // 加载消息（用于 useChat initialMessages）
saveChat(input): void                 // 保存完整消息数组（onFinish 调用）
deleteChat(userId, chatId): boolean   // 删除会话
listUserChats(userId): ChatSession[]  // 列出用户会话

// 废弃 API（保留向后兼容）
markStreamInProgress()  // No-op
completeStream()        // No-op
isStreamInProgress()    // 始终返回 false
```

#### 27.3.2 流式路由重构（`ai-stream.ts`）

```typescript
// 使用 AI SDK streamText
const result = aiStreamText({
  model: aiModel,
  system: systemPrompt,
  messages: modelMessages,
  providerOptions,
})

// 断线保护
result.consumeStream()

// 标准 UI 消息响应
return result.toUIMessageStreamResponse({
  originalMessages: messages,
  generateMessageId: createIdGenerator({ prefix: 'msg', size: 16 }),
  onFinish: ({ messages: finalMessages }) => {
    saveChat({ userId, chatId, messages: finalMessages })
  },
  headers: { 'X-Chat-Id': chatId },
})
```

#### 27.3.3 前端 Hook 重构（`use-knowledge-chat.ts`）

新增 `useKnowledgeChat` hook 封装 AI SDK 的 `useChat`：

```typescript
import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'

export function useKnowledgeChat(config: KnowledgeChatConfig) {
  const transport = new DefaultChatTransport({
    api: `${getServerUrl()}/api/ai/stream`,
    credentials: 'include',
    prepareSendMessagesRequest: ({ id, messages }) => ({
      body: {
        chatId: id,
        provider: config.provider,
        apiKey: config.apiKey,
        // ... BYOK 凭证与 RAG 上下文
        messages,
      },
    }),
  })

  const { messages, sendMessage, status, ... } = useChat({
    id: config.chatId,
    messages: config.initialMessages,
    transport,
  })

  return { messages, sendMessage, isStreaming: status === 'streaming', ... }
}
```

### 27.4 数据流（重构后）

```text
[用户发送消息]
      ↓
┌──────────────────────────────────────┐
│   Web 端 (useChat)                   │
│   1. sendMessage({ text })           │
│   2. transport.prepareSendMessages   │
│      - chatId                        │
│      - messages (UIMessage[])        │
│      - provider/apiKey/model (BYOK)  │
│      - noteEntryIds (RAG)            │
└──────────────────────────────────────┘
      ↓
┌──────────────────────────────────────┐
│   Server 端                          │
│   1. convertToModelMessages(messages)│
│   2. aiStreamText({ model, messages })│
│   3. consumeStream() 断线保护        │
│   4. toUIMessageStreamResponse({     │
│        generateMessageId,            │
│        onFinish: saveChat            │
│      })                              │
└──────────────────────────────────────┘
      ↓
[流式响应 → useChat 自动更新 messages]
      ↓
[onFinish 触发 → 服务端统一持久化]
```

### 27.5 文件变更

| 模块             | 文件路径                                      | 变更                                     |
| ---------------- | --------------------------------------------- | ---------------------------------------- |
| Chat Store       | `apps/server/src/services/ai-chat-store.ts`   | 重构为 UIMessage[] 中心 API              |
| Chat Store Tests | `apps/server/__tests__/ai-chat-store.test.ts` | 更新测试覆盖新 API（21 用例）            |
| AI Stream        | `apps/server/src/routes/ai-stream.ts`         | 使用 toUIMessageStreamResponse           |
| Knowledge Chat   | `apps/web/src/hooks/use-knowledge-chat.ts`    | 新增 hook 封装 useChat                   |
| Knowledge Page   | `apps/web/src/routes/_app/knowledge.tsx`      | 使用 useKnowledgeChat 替代 useStreamText |
| Web deps         | `apps/web/package.json`                       | 新增 @ai-sdk/react                       |
| Server deps      | `apps/server/package.json`                    | 新增 nanoid                              |

### 27.6 验证

- 类型检查：`pnpm run check-types`
- Lint：`pnpm check`

### 27.7 后续优化

- ~~**数据库持久化**：将内存存储替换为 PostgreSQL~~ ✅ 已在 Section 28 实现
- ~~**消息历史加载**：页面加载时从服务端 API 获取历史消息作为 `initialMessages`~~ ✅ 已在 Section 28 实现
- **Resume Streams**：实现 AI SDK 的断线续传功能
- **Thinking/Usage 传递**：通过 AI SDK 的 data parts 或自定义 parts 传递 reasoning 和 usage 信息

---

## 28. Knowledge Chat 历史持久化与可视化

**实现日期**：2026-01-19

### 28.1 功能概述

Knowledge Chat 会话历史持久化功能使用户可以：

1. **跨设备共享会话历史**：会话数据存储在服务端数据库，登录后即可访问
2. **刷新后自动恢复**：页面刷新后自动回到最近打开的会话
3. **会话列表可视化**：左侧边栏展示历史会话列表，支持切换、新建、删除

### 28.2 架构设计

```text
┌─────────────────────────────────────────────────────────────────────┐
│                           前端 (Web)                                │
├─────────────────────────────────────────────────────────────────────┤
│  localStorage                                                       │
│  ├── lastChatId         # 最近打开的 chatId（轻量缓存）            │
│  └── (无完整消息存储)   # 避免 localStorage 容量限制问题            │
│                                                                     │
│  Hooks                                                              │
│  ├── useChatSessions()  # 会话列表管理                              │
│  └── useKnowledgeChat() # 消息与流式响应                            │
└─────────────────────────────────────────────────────────────────────┘
                              ↓ HTTP
┌─────────────────────────────────────────────────────────────────────┐
│                           服务端 (Server)                            │
├─────────────────────────────────────────────────────────────────────┤
│  API Routes                                                          │
│  ├── GET  /api/ai/chats              # 会话列表                      │
│  ├── GET  /api/ai/chat/:chatId       # 获取消息 + 更新 lastOpenedAt  │
│  ├── POST /api/ai/chat               # 创建新会话                    │
│  ├── DELETE /api/ai/chat/:chatId     # 删除会话                      │
│  ├── POST /api/ai/chat/:chatId/touch # 更新 lastOpenedAt             │
│  └── POST /api/ai/stream             # 流式响应 + onFinish 落库      │
│                                                                      │
│  Services                                                            │
│  └── ai-chat-store.ts   # DB + Redis 存储层                          │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│                           存储层                                     │
├─────────────────────────────────────────────────────────────────────┤
│  PostgreSQL (主存储)                                                 │
│  └── ai_chat_sessions 表                                             │
│      ├── id (chatId)                                                 │
│      ├── userId                                                      │
│      ├── title                                                       │
│      ├── messagesJson (UIMessage[] JSON)                             │
│      ├── messageCount                                                │
│      ├── lastMessagePreview                                          │
│      ├── lastMessageAt                                               │
│      ├── lastOpenedAt   # 刷新后恢复最近会话的关键字段               │
│      ├── createdAt                                                   │
│      └── updatedAt                                                   │
│                                                                      │
│  Redis (读缓存)                                                      │
│  ├── ai:chat:{userId}:{chatId}  # 单个会话缓存 (TTL 1h)              │
│  └── ai:chatlist:{userId}       # 会话列表缓存 (TTL 1h)              │
└─────────────────────────────────────────────────────────────────────┘
```

### 28.3 数据库表设计

```sql
CREATE TABLE ai_chat_sessions (
  id TEXT PRIMARY KEY,           -- chatId (nanoid)
  user_id TEXT NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  messages_json TEXT NOT NULL DEFAULT '[]',  -- UIMessage[] JSON
  message_count INTEGER NOT NULL DEFAULT 0,
  last_message_preview TEXT NOT NULL DEFAULT '',
  last_message_at TIMESTAMP WITH TIME ZONE,
  last_opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX ai_chat_sessions_user_last_opened_idx ON ai_chat_sessions(user_id, last_opened_at);
CREATE INDEX ai_chat_sessions_user_updated_idx ON ai_chat_sessions(user_id, updated_at);
CREATE INDEX ai_chat_sessions_user_id_idx ON ai_chat_sessions(user_id);
```

### 28.4 前端缓存策略

为避免 localStorage 容量限制（通常 5-10MB）：

- **仅缓存元数据**：`lastChatId` 存储最近打开的会话 ID
- **不缓存完整消息**：消息从服务端获取，避免大量文本占用 localStorage
- **按需评估 IndexedDB**：若需离线大缓存可后续迁移，当前服务端存储已足够

### 28.5 文件变更

| 模块 | 文件路径 | 变更 |
| ---- | -------- | ---- |
| DB Schema | `packages/db/src/schema/ai.ts` | 新增 `ai_chat_sessions` 表 |
| DB Index | `packages/db/src/index.ts` | 导出新 schema |
| DB Index Lazy | `packages/db/src/index.lazy.ts` | 导出新 schema |
| Server Redis | `apps/server/src/utils/redis.ts` | 新增 Redis 客户端封装 |
| Chat Store | `apps/server/src/services/ai-chat-store.ts` | 重构为 DB + Redis |
| AI Stream | `apps/server/src/routes/ai-stream.ts` | 新增会话列表与删除 API |
| Knowledge Types | `apps/web/src/features/knowledge/types.ts` | 新增 `ChatSessionSummary` |
| Knowledge Utils | `apps/web/src/features/knowledge/utils.ts` | 新增 `getLastChatId` / `setLastChatId` |
| Chat Sessions Hook | `apps/web/src/hooks/use-chat-sessions.ts` | 新增会话列表管理 hook |
| Knowledge Chat Hook | `apps/web/src/hooks/use-knowledge-chat.ts` | 新增 `switchChat` / `loadMessages` |
| Chat History Panel | `apps/web/src/features/knowledge/components/chat-history-panel.tsx` | 新增会话列表 UI |
| Knowledge Page | `apps/web/src/routes/_app/knowledge.tsx` | 集成会话列表与切换 |
| i18n zh-CN | `packages/locales/src/resources/zh-CN.json` | 新增 i18n keys |
| i18n en-US | `packages/locales/src/resources/en-US.json` | 新增 i18n keys |
| i18n ja-JP | `packages/locales/src/resources/ja-JP.json` | 新增 i18n keys |
| Chat Store Tests | `apps/server/__tests__/ai-chat-store.test.ts` | 更新测试（26 用例） |

### 28.6 验证

- 类型检查：`pnpm run check-types`
- 单测：`pnpm vitest run --project=server apps/server/__tests__/ai-chat-store.test.ts`
- Lint：`pnpm check`

### 28.7 后续优化

- **会话搜索**：在会话列表中支持搜索
- **会话重命名**：允许用户自定义会话标题
- **会话导出**：支持导出会话为 Markdown / JSON
- **离线缓存**：使用 IndexedDB 实现离线消息缓存（可选）

### 28.8 质量修复记录（2026-01-19）

- 修复 ai-chat-store 测试的非空断言与多余 async，避免 lint 报错。
- 抽取 lastOpenedAt 更新逻辑，降低 loadChat 复杂度并保持 Redis 缓存一致。
- ChatHistoryPanel 改为显式条件渲染，避免嵌套三元表达式。
