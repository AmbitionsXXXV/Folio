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

## 单测建议

为 Note Tools 编写单测时，优先使用模块 mock，避免引入真实数据库连接。

- Mock `@folionote/db` 的 `db` 与 `entries`，只保留必要字段。
- Mock `drizzle-orm` 的 `eq`、`and`、`isNull`、`desc`、`sql`，避免依赖内部实现。
- 校验 `contentJson` 与 `contentText` 生成逻辑，确保与存储策略一致。

```typescript
const mockDb = {
	insert: vi.fn(),
	update: vi.fn(),
	select: vi.fn(),
}

vi.mock('@folionote/db', () => ({
	db: mockDb,
	entries: mockEntries,
}))
```

## Tool Approval（工具确认机制）

AI SDK 6 支持 `needsApproval` 选项，用于标记敏感操作（如删除）需要用户确认后才执行。

### 服务端配置

在工具定义中添加 `needsApproval: true`：

```typescript
export const deleteNote = tool({
	description: 'Soft delete a note by ID',
	strict: true,
	inputSchema: DeleteNoteInputSchema,
	needsApproval: true, // 需要用户确认
	execute: async ({ id }, { experimental_context }) => {
		// 执行删除逻辑
	},
})
```

当模型调用带有 `needsApproval` 的工具时，流会产生 `tool-approval-request` 事件而非直接执行，工具状态变为 `approval-requested`。

### 客户端处理

1. **暴露 `addToolApprovalResponse`**：从 `useChat` hook 中解构该函数。

```typescript
const { addToolApprovalResponse } = useChat({ ... })
```

2. **检测 approval-requested 状态**：在渲染 tool parts 时检查 `part.state === 'approval-requested'`。

```typescript
function isApprovalRequested(part: ToolMessagePart): boolean {
	return (
		'state' in part &&
		part.state === 'approval-requested' &&
		'approval' in part &&
		typeof part.approval === 'object' &&
		part.approval !== null &&
		'id' in part.approval
	)
}
```

3. **渲染确认按钮**：为用户提供 Approve / Reject 按钮。

```tsx
<ToolApprovalButtons
	approvalId={approval.id}
	toolName={toolName}
	input={input}
	onApprovalResponse={addToolApprovalResponse}
/>
```

4. **处理用户响应**：点击按钮时调用 `addToolApprovalResponse`。

```typescript
// 批准
await addToolApprovalResponse({ id: approvalId, approved: true })

// 拒绝
await addToolApprovalResponse({
	id: approvalId,
	approved: false,
	reason: 'User rejected',
})
```

### 流程总结

```
模型请求调用 deleteNote
    ↓
服务端检测 needsApproval: true
    ↓
发送 tool-approval-request 事件
    ↓
客户端渲染确认按钮
    ↓
用户点击 Approve / Reject
    ↓
调用 addToolApprovalResponse
    ↓
服务端执行或取消工具
```

### 注意事项

- `ToolApprovalHandler` 类型应兼容 AI SDK 的 `ChatAddToolApproveResponseFunction`，返回 `void | PromiseLike<void>`。
- 破坏性操作（如删除）应在 UI 上额外警示用户。
- `approval.id` 是服务端生成的唯一标识，必须原样传回。
