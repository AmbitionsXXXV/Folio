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

## 5. 服务端目录与文件规划（packages/api）

在 `packages/api/src` 新增：

```text
packages/api/src
├── ai
│   ├── index.ts
│   ├── providers
│   │   ├── index.ts
│   │   ├── openai.ts
│   │   ├── deepseek.ts
│   │   ├── gemini.ts
│   │   ├── claude.ts
│   │   └── qwen.ts
│   ├── credentials
│   │   ├── crypto.ts
│   │   ├── store.ts
│   │   └── validate.ts
│   ├── prompts
│   │   ├── summarize.ts
│   │   └── review-suggest.ts
│   ├── rag
│   │   ├── chunker.ts
│   │   ├── embeddings.ts
│   │   ├── indexer.ts
│   │   └── retriever.ts
│   ├── usage
│   │   ├── tokens.ts
│   │   ├── cost.ts
│   │   └── persist.ts
│   ├── graph
│   │   ├── review-suggest.graph.ts
│   │   └── types.ts
│   └── schemas.ts
└── routers
    ├── ai.ts
    ├── ai-credentials.ts
    ├── ai-usage.ts
    └── index.ts
```

---

## 6. 环境变量（Server-side BYOK + Usage）

新增（或在你现有 env 体系里加入）：

* `AI_KEY_ENCRYPTION_SECRET`：用于加密用户 Key（必须）
* `AI_PROMPT_VERSION_SUMMARIZE`：默认 `summarize_v0`
* `AI_PROMPT_VERSION_REVIEW_SUGGEST`：默认 `review_suggest_v0`

可选（默认模型名，不提供 Key）：

* `AI_DEFAULT_PROVIDER`（如 `openai`/`deepseek`/`qwen`）
* `AI_DEFAULT_MODEL_SUMMARIZE`
* `AI_DEFAULT_MODEL_RERANK`
* `AI_DEFAULT_EMBEDDING_MODEL`

Usage/成本估算（可选）：

* `AI_PRICING_SNAPSHOT_JSON`：Provider 价格配置快照（JSON 字符串）  
  用于估算 `estimatedCost`（不用于计费，仅给用户自查）
* `AI_COST_ESTIMATION_ENABLED`：`true|false`（默认 false）

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
