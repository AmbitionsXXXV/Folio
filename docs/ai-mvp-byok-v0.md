
# FolioNote AI MVP v0（BYOK：Bring Your Own Key）完整开发计划

> 核心变化：**模型对接以用户提供的 API Key 为主（BYOK）**。  
> 用户在设置页配置 Key（按 Provider），服务端使用该 Key 调用模型。  
> 目标：既满足“用户自带 Key”的学习/成本控制诉求，又保持 **安全、可审计、可回退** 的工程质量。

---

## 1. 目标与范围（MVP 只做两件事 + BYOK）

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

### 1.2 Out of Scope（明确不做）

* 全库自由问答/聊天（Chat with notes）
* 多模态（图/音）
* 端侧本地模型推理（离线 LLM）
* 自动改写/自动打标签（后续迭代）

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
  * ai_runs 只记录 provider/model/promptVersion、输入引用（entryId/chunkId），不存原文

### 2.3 权限边界

* `user_ai_credentials` 必须按 `userId` 严格隔离
* 任何 AI 相关请求必须鉴权（复用现有 auth middleware）
* RAG 检索必须 `WHERE userId = ?`，绝不跨用户

---

## 3. 高层架构（BYOK + Vercel AI SDK + RAG + LangGraph）

### 3.1 组件职责

* **packages/api**
  * AI Gateway（统一模型调用）
  * BYOK：Key 的增删改查 + 校验
  * RAG：chunk/embedding/retriever
  * LangGraph：reviewSuggest 工作流
  * 审计：ai_runs
* **packages/db**
  * 新表：user_ai_credentials / entry_chunks / entry_ai_artifacts / ai_runs
  * pgvector
* **apps/web / apps/native**
  * 设置页：配置 Key
  * Entry 详情：AI Summary 卡片
  * Review：AI Suggested Tab

### 3.2 请求流（Summarize）

1. 客户端调用 `ai.summarizeEntry(entryId, options)`
2. API 获取用户 Provider + 解密 API Key（BYOK）
3. 读取 Entry（contentText + tags + sources），计算 `sourceHash`
4. 命中缓存则直接返回 artifact
5. （可选）RAG：向量检索 Top-K chunks（同用户）
6. 通过 Vercel AI SDK 调用模型（使用用户 Key）
7. 写入 `entry_ai_artifacts` + `ai_runs`

### 3.3 请求流（ReviewSuggest）

1. API 获取用户 Key（BYOK）
2. LangGraph：
    * Node A：加载 dueQueue + 复习统计特征
    * Node B：RAG 检索候选用于补齐
    * Node C：规则过滤（due 优先、去重、限制数量）
    * Node D：LLM rerank + 生成 recall prompts + 推荐原因（结构化输出）
    * Node E：写 ai_runs + 缓存结果
3. 失败自动回退为默认 dueQueue 顺序（不影响复习主流程）

---

## 4. 数据库与 Schema 设计（Drizzle + PostgreSQL）

### 4.1 新增表（MVP 最小集合）

| 表 | 用途 | 关键字段 |
|---|---|---|
| `user_ai_credentials` | BYOK：存用户的 Provider + 加密 Key | `userId`, `provider`, `encryptedApiKey`, `keyHint`, `status`, `lastValidatedAt`, `createdAt`, `updatedAt` |
| `entry_ai_artifacts` | 缓存摘要产物 | `entryId`, `userId`, `sourceHash`, `summary`, `keyPoints`, `recallPrompts`, `relatedEntries`, `provider`, `model`, `promptVersion`, `updatedAt` |
| `entry_chunks` | RAG chunks（含 embedding） | `id`, `entryId`, `userId`, `chunkIndex`, `text`, `metadata`, `embedding`, `createdAt` |
| `ai_runs` | 审计与可观测 | `id`, `userId`, `type`, `provider`, `model`, `promptVersion`, `inputRefs`, `latencyMs`, `tokenIn`, `tokenOut`, `status`, `error`, `createdAt` |

### 4.2 pgvector

* 启用 `vector` extension
* 向量维度：根据你选的 embedding 模型决定（示例用 1536）
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
│   ├── graph
│   │   ├── review-suggest.graph.ts
│   │   └── types.ts
│   └── schemas.ts
└── routers
    ├── ai.ts
    ├── ai-credentials.ts
    └── index.ts
```

---

## 6. 环境变量（Server-side BYOK 必备）

新增（或在你现有 env 体系里加入）：

* `AI_KEY_ENCRYPTION_SECRET`：用于加密用户 Key（必须）
* `AI_PROMPT_VERSION_SUMMARIZE`：默认 `summarize_v0`
* `AI_PROMPT_VERSION_REVIEW_SUGGEST`：默认 `review_suggest_v0`

可选（若你希望提供默认模型名，但不提供 Key）：

* `AI_DEFAULT_PROVIDER`（如 `openai`/`deepseek`/`qwen`）
* `AI_DEFAULT_MODEL_SUMMARIZE`
* `AI_DEFAULT_MODEL_RERANK`
* `AI_DEFAULT_EMBEDDING_MODEL`

> 注意：BYOK 模式下，**你不需要**在服务端放 `AI_API_KEY`，除非你想提供“平台 Key 试用模式”（MVP 建议不做，避免成本不可控）。

---

## 7. BYOK API 设计（新增 router：ai-credentials）

### 7.1 Router：`aiCredentials.set`

**Input**

* `provider: "openai" | "deepseek" | "qwen"`（MVP 先支持 1–2 个也可以）
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

## 8. AI API 设计（使用用户 Key）

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

**错误约定（建议）**

* `AI_KEY_MISSING`：用户未配置 key
* `AI_KEY_INVALID`：校验失败或 provider 返回认证错误
* `AI_PROVIDER_ERROR`：上游错误
* `AI_RATE_LIMITED`：本地限流

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

---

## 9. 模型 Provider 适配层（BYOK 的关键工程点）

### 9.1 统一接口（packages/api/src/ai/providers/index.ts）

定义一个最小 provider interface：

* `createLLMClient({ apiKey, model })`
* `createEmbeddingClient({ apiKey, model })`
* `validateKey({ apiKey })`：用于 `aiCredentials.validate`
* 可选：`defaultModels`

### 9.2 Vercel AI SDK 用法建议

* 生成类任务（summarize / rerank）：
  * 使用结构化输出（zod schema parse）
  * Web 端支持 streaming（先实现 summarize 的 streaming）
* embedding：
  * 可直接用 provider SDK 或 LangChain embeddings wrapper
  * 关键是：embedding 调用也必须使用用户 Key（BYOK）

---

## 10. RAG：索引、增量更新、检索（注意 BYOK 影响）

### 10.1 重要约束：embedding 也需要 Key

因为向量是 embedding 的产物，BYOK 下存在两种路线：

#### 路线 A（推荐）：向量索引依赖用户 Key

* 用户配置 key 后，才开始对其笔记做 embedding 索引
* 优点：成本完全由用户承担（如果 provider 计费）
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
* `persistAndCacheNode`

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

优先落点（按你现有结构二选一）：

* `apps/web/apps/web/src/routes/_app/settings`（如果这是你的设置入口）
* 或在 `apps/web/src/components/profile/*` 的设置对话框里增加一块 “AI”

建议新增组件：

* `apps/web/src/components/profile/ai-settings.tsx`（或 `apps/web/src/components/settings/ai-settings.tsx`）

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
  * streaming：优先实现（Vercel AI SDK）

### 12.3 Review 页面：AI Suggested Tab

* 组件：`apps/web/src/components/review/ai-suggested-tab.tsx`
* 行为：
  * 未配置 key：提示去设置
  * 失败：回退展示默认队列

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

---

## 14. 安全、限流、审计（BYOK 必须更严格）

### 14.1 Rate limit（复用 packages/api 的 rate-limit）

建议默认：

* `aiCredentials.set/validate`：每用户每分钟 5 次
* `ai.summarizeEntry`：每用户每分钟 10 次
* `ai.suggestReviewList`：每用户每分钟 5 次

### 14.2 审计 ai_runs

* 必写字段：`type/provider/model/promptVersion/status/latencyMs`
* 禁止字段：`apiKey`
* inputRefs：
  * summarize：`{ entryId, chunkIds? }`
  * suggest：`{ dueEntryIds, candidateEntryIds? }`

---

## 15. 缓存策略（节省用户额度/成本）

### 15.1 Summarize 缓存键

* `entryId + sourceHash + promptVersion + locale + provider + model`
* 命中 `entry_ai_artifacts` 直接返回

### 15.2 ReviewSuggest 缓存键

* `userId + date(按 tz) + limit + promptVersion + locale + provider + model`
* TTL：10–30 分钟（可用 Redis；没有则 DB 简化缓存也行）

---

## 16. 测试计划（Vitest）

### 16.1 packages/api 单测新增

* `packages/api/__tests__/routers/ai-credentials.test.ts`
  * set：存储为密文（断言不会等于明文）
  * get：不返回明文
  * validate：无 key/错误 key 的错误码
* `packages/api/__tests__/routers/ai.test.ts`
  * summarize：无 key -> `AI_KEY_MISSING`
  * summarize：缓存命中 -> `cached=true`
  * suggest：provider 抛错 -> fallback 输出
* `packages/api/__tests__/utils/crypto.test.ts`
  * encrypt/decrypt roundtrip
  * secret 缺失时报错

### 16.2 安全回归

* 日志扫描：测试中确保不会输出 `apiKey`（可在 logger mock 中断言）

---

## 17. 里程碑（2–3 周，含 BYOK）

| Milestone | 预计耗时 | 交付内容 | 验收标准 |
|---|---:|---|---|
| M0 BYOK 基建 | 2–3 天 | user_ai_credentials 表 + 加密存储 + set/get/validate/delete | Web/iOS 可配置 key，服务端不泄露明文 |
| M1 Summarize v0（无 RAG） | 3–5 天 | 摘要生成 + artifact 缓存 + streaming（Web） | 同一内容重复点击不重复消耗 |
| M2 RAG（BYOK embedding） | 3–5 天 | pgvector + chunks + retriever + 按需索引 | 检索严格 userId 隔离，缺索引可补建 |
| M3 ReviewSuggest（LangGraph） | 5–7 天 | AI Suggested tab + rerank + recall prompts | AI 失败自动回退，不影响复习主链路 |
| M4 收敛与可观测 | 2–3 天 | ai_runs 统计、错误码/i18n、限流、缓存 TTL | 可追踪、可回滚、可稳定上线 |

---

## 18. 具体任务清单（可直接贴到项目管理）

### 18.1 DB（packages/db）

* [ ] 新增 pgvector extension migration
* [ ] 新增表：`user_ai_credentials`
* [ ] 新增表：`entry_ai_artifacts`, `entry_chunks`, `ai_runs`
* [ ] 索引：`userId`、`createdAt`、向量索引（可选）

### 18.2 API（packages/api）

* [ ] `routers/ai-credentials.ts`：set/get/validate/delete
* [ ] `ai/credentials/crypto.ts`：encrypt/decrypt（AES-GCM 或 libsodium sealed box）
* [ ] `ai/providers/*`：provider 适配（至少 1 个先跑通）
* [ ] `routers/ai.ts`：summarizeEntry / suggestReviewList
* [ ] `ai/rag/*`：chunker/embeddings/indexer/retriever（embedding 走 BYOK）
* [ ] `ai/graph/review-suggest.graph.ts`：LangGraph 工作流
* [ ] 统一错误码与 i18n message
* [ ] rate limit 接入

### 18.3 Web（apps/web）

* [ ] AI Settings UI（provider/key、保存校验、删除、状态展示）
* [ ] EntryAISummaryCard：无 key CTA + streaming + 缓存展示
* [ ] Review AI Suggested Tab：无 key CTA + fallback 展示
* [ ] locales 增加 ai 相关 key

### 18.4 Native（apps/native）

* [ ] Settings：AI Key 配置 UI
* [ ] Entry 详情页：AI Summary（在线）
* [ ] Review：AI Suggested（可后置）
* [ ] 离线提示与按钮置灰

---

## 19. i18n 建议 keys（packages/locales）

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
* `ai.errors.keyMissing`
* `ai.errors.keyInvalid`
* `ai.errors.providerError`
* `ai.errors.rateLimited`

---

## 20. 上线验收清单（BYOK 专项）

### 20.1 BYOK 功能

* [ ] Web 设置页可保存并校验 key，显示 keyHint 与 lastValidatedAt
* [ ] iOS 设置页同样可用
* [ ] 服务端从不返回明文 key
* [ ] DB 中 apiKey 为密文（抽样检查）

### 20.2 AI 主流程

* [ ] 未配置 key：Summarize/ReviewSuggest 均提示去设置，不崩溃
* [ ] 配置 key 后：Summarize 成功且可缓存
* [ ] ReviewSuggest 成功；失败回退到默认 dueQueue
* [ ] RAG 不串用户（两用户数据验证）

### 20.3 安全与成本

* [ ] rate limit 生效
* [ ] 日志中无 key、无 Authorization
* [ ] ai_runs 每次调用都有记录（成功/失败）
