# RAG 图片识别增强

本文档描述 FolioNote 中针对图片笔记的 RAG 增强能力，包括图片描述生成、图片描述检索、以及 Vision 模型直传图片上下文。

## 改动目标

1. 让图片进入搜索与 RAG 召回链路，而不是只存储在附件桶中。
2. 在 Knowledge Chat 中，当模型支持 Vision 时，直接传图提升回答准确性。
3. 采用“上传时异步尝试 + 检索时按需补偿”的混合策略，避免上传阻塞。

## 数据结构

`attachments` 表新增字段：

- `description`: 图片描述文本（用于检索）
- `description_model`: 生成描述所用模型 ID
- `description_generated_at`: 描述生成时间

## 核心流程

### 1. 上传后异步触发

`storage.uploadAttachment` 成功后会 fire-and-forget 调用内部接口：

- `POST /api/image/caption/internal`

仅在以下条件满足时触发：

- `IMAGE_CAPTION_INTERNAL_TOKEN` 已配置
- `IMAGE_CAPTION_INTERNAL_URL` 或 `PORT` 可用于构造内部 URL

失败不会影响上传主流程。

#### 文件与参数传递链路

上传后的图片描述流程并不会把二进制文件直接塞进内部接口请求体，而是分成两段传递：

1. Web / Native 端先调用 `storage.uploadAttachment` 上传文件。
2. 服务端把文件写入 Supabase 的 `attachments` 公共桶，并在数据库 `attachments` 表写入一条元数据：
   - `id`
   - `userId`
   - `entryId`
   - `filename`
   - `mimeType`
   - `storageKey`
3. 上传接口返回：
   - `id`：附件 ID
   - `publicUrl`：公开对象 URL
   - `path`：存储路径
4. 随后服务端异步调用 `POST /api/image/caption/internal`，只传递轻量参数：

```json
{
  "userId": "string",
  "attachmentId": "string",
  "model": "optional",
  "force": false
}
```

5. 内部 caption 服务再根据 `attachmentId + userId` 回查数据库，取出 `storageKey / mimeType / filename / entryId`。
6. 最终由服务端拼出：

```text
${S3_PUBLIC_URL}/attachments/${storageKey}
```

7. 这个公开 URL 会作为 `image` 消息片段传给 Vision 模型读取，而不是把图片二进制继续通过内部 JSON 请求体转发。

因此，内部接口只负责“传递附件标识”，真正的图片内容读取发生在：

- Supabase 公共对象 URL
- 第三方 Vision 模型读取该 URL 的阶段

### 2. 按需补偿

在 `prepareNoteContext` 中，RAG 拿到候选笔记后，会调用批量补偿逻辑：

- 对候选笔记关联的图片，尝试为“无描述”的图片生成 caption
- 生成成功后刷新 note context，确保 prompt 与检索使用最新描述

### 3. 图片描述检索路由

`multiRetrieve` 新增一条并行检索路径：

- `attachments.description ILIKE %query%`

并与原有 FTS / title / tag / ilike 结果合并去重，来源标记新增 `image`。

### 4. Vision 直传

在 `ai-stream` 中，当 provider 支持 `vision` 时：

- 从 attached + retrieved notes 收集图片（有限数量）
- 生成一条附带图片与描述的上下文消息
- 与对话消息一起传给 `streamText`

如果 provider 不支持 Vision，仍可使用图片描述文本参与检索与 prompt。

## 新增接口

### 手动生成图片描述

`POST /api/image/caption`

请求体：

```json
{
  "attachmentId": "string",
  "provider": "openai",
  "apiKey": "required",
  "baseUrl": "optional",
  "model": "optional",
  "force": false
}
```

说明：

- 传入 `provider + apiKey` 时，使用该凭证生成描述。
- 手动接口不再回退到服务端环境变量，避免任意已登录用户直接消耗平台侧 AI 配额。

### 内部异步触发接口

`POST /api/image/caption/internal`

请求头：

- `x-caption-internal-token: ${IMAGE_CAPTION_INTERNAL_TOKEN}`

请求体：

```json
{
  "userId": "string",
  "attachmentId": "string",
  "model": "optional",
  "force": false
}
```

## 环境变量

新增（可选）：

- `IMAGE_CAPTION_INTERNAL_TOKEN`: 内部触发接口鉴权 token
- `IMAGE_CAPTION_INTERNAL_URL`: 内部接口完整 URL（未设置时回退 `http://127.0.0.1:${PORT}/api/image/caption/internal`）
- `IMAGE_CAPTION_ALLOW_ENV_FALLBACK`: 是否允许内部异步流程回退到服务端平台凭证，默认 `false`

仅当 `IMAGE_CAPTION_ALLOW_ENV_FALLBACK=true` 时，以下平台凭证才会被内部图片描述流程使用：

- `OPENAI_API_KEY`
- `GOOGLE_GENERATIVE_AI_API_KEY`
- `ANTHROPIC_API_KEY`

### `IMAGE_CAPTION_INTERNAL_TOKEN` 如何生成

推荐使用高熵随机字符串，至少 32 字节。

#### 方式 1：OpenSSL

```bash
openssl rand -hex 32
```

输出示例：

```text
8c7c3e7e2ce3a1df4f5d2d8a9f0b4c8f9f1b1a25d78f3fb4c5ad6c8a7f6e2d11
```

#### 方式 2：Node.js

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

#### 方式 3：Python

```bash
python3 - <<'PY'
import secrets
print(secrets.token_hex(32))
PY
```

### 推荐配置示例

```env
IMAGE_CAPTION_INTERNAL_TOKEN=替换成你生成的随机 token
IMAGE_CAPTION_INTERNAL_URL=https://api.example.com/api/image/caption/internal
IMAGE_CAPTION_ALLOW_ENV_FALLBACK=false
```

本地单进程开发时，也可以不配 `IMAGE_CAPTION_INTERNAL_URL`，让服务端自动回退到：

```text
http://127.0.0.1:${PORT}/api/image/caption/internal
```

但生产环境更推荐显式配置完整 URL，避免容器网络、反向代理或多实例场景下的地址歧义。

## 安全策略

1. 手动 `POST /api/image/caption` 必须显式提供 `provider + apiKey`，不允许默认回退到平台凭证。
2. 内部异步触发与 RAG 补偿流程默认不使用平台凭证；只有在服务端显式开启 `IMAGE_CAPTION_ALLOW_ENV_FALLBACK=true` 时才会启用。
3. 图片 URL 来源固定为 `S3_PUBLIC_URL + /attachments/...`，当前部署使用 Supabase 提供的公共对象存储地址；因此不要把高敏感图片放入 `attachments` 公共桶。

## 测试覆盖

新增或更新测试：

- `apps/server/__tests__/rag/image-captioning.test.ts`
- `apps/server/__tests__/rag/multi-retriever.test.ts`
- `packages/ai/__tests__/knowledge-chat.test.ts`
