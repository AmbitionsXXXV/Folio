# AI Tools 开发笔记

## AI SDK 6 Tool 基础

AI SDK 6 使用 `tool()` 帮助函数推断 `execute` 入参类型，核心组成如下。

- `description`：工具用途描述，帮助模型选择工具。
- `inputSchema`：使用 Zod 或 JSON Schema 描述输入结构。
- `execute`：执行函数，签名为 `async (input, options) => result`。
- `strict`：启用严格输入校验，提升工具调用可靠性。

```typescript
import { tool } from 'ai'
import { z } from 'zod'

export const exampleTool = tool({
	description: 'Describe what the tool does',
	strict: true,
	inputSchema: z.object({
		id: z.string().describe('Resource ID'),
	}),
	execute: async ({ id }, { abortSignal }) => {
		if (abortSignal?.aborted) {
			throw new Error('Tool execution aborted.')
		}
		return { id }
	},
})
```

## Context 传递（experimental_context）

当工具需要用户上下文时，通过 `experimental_context` 注入数据，并在 `execute` 读取。

```typescript
// 调用 streamText 时传递 context
const result = streamText({
	tools: aiTools,
	experimental_context: {
		userId,
	},
})

// 在工具内读取 context
execute: async (input, { experimental_context }) => {
	const { userId } = getNoteToolContext(experimental_context)
	// 使用 userId 进行权限隔离
}
```

## Note Tools 设计约定

Note Tools 使用纯文本输入，内部转换为 ProseMirror JSON，并生成 `contentText` 便于搜索。

- `contentJson`：以 ProseMirror JSON 存储富文本结构。
- `contentText`：由纯文本输入派生，便于全文搜索。
- `deletedAt`：删除操作使用软删除，避免物理删除。

```typescript
const payload = buildContentPayload(content)
await db.insert(entries).values({
	contentJson: payload.contentJson,
	contentText: payload.contentText,
})
```

## 错误处理与安全

工具执行中出现异常时应抛出 `Error`，AI SDK 会将其转为 `tool-error` 内容块。

- 缺少 `userId` 时直接抛错，避免越权访问。
- 使用 `abortSignal` 处理取消。
- 写操作仅在用户明确请求时执行，避免无意改动。

## 接入步骤参考

结合 `docs/ai-generative-ui.md` 的流程，新增工具时保持以下顺序。

1. 在 `packages/*-tool` 中定义工具与输入 schema。
2. 在 `apps/server/src/services/ai-tools.ts` 合并工具集合。
3. 在 `apps/server/src/routes/ai-stream.ts` 注入 `experimental_context`。
4. 在 `packages/ai/src/prompts/knowledge-chat.ts` 补充工具使用提示。
