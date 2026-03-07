# Chat Title Auto Generation

## 目标

为 AI Chat 会话自动生成更稳定的标题，避免会话列表长期显示 `New Chat` / `新对话`。

## 触发时机

1. 用户在空会话中完成一轮流式对话。
2. Web 端 `useKnowledgeChat` 在流结束后自动请求 `POST /api/ai/chat/:chatId/title`。
3. 服务端先确保当前 `UIMessage[]` 已落库，再判断是否需要生成标题。

## 生成规则

### 保底规则

- `saveChat()` 在更新已有会话时，不再保留数据库中的空字符串标题。
- 如果标题为空，会先回填为首条用户消息生成的短标题。

### AI 标题规则

仅当满足以下任一条件时，才触发 AI 标题生成：

1. 当前标题为空。
2. 当前标题是占位标题（例如 `New Chat` / `新对话` / `新しいチャット`）。
3. 当前标题仍等于首条用户消息的启发式标题，说明它还没有被真正总结过。

服务端会截取最多 8 条消息、最多 6000 个字符的会话文本，要求模型返回：

- 仅标题文本
- 最多 8 个词
- 无引号、无 Markdown、无 emoji
- 语言跟随会话本身

## 涉及文件

- `apps/server/src/services/ai-chat-store.ts`
- `apps/server/src/services/chat-title-generator.ts`
- `apps/server/src/routes/ai-stream.ts`
- `apps/web/src/hooks/use-knowledge-chat.ts`

## 返回与刷新

- 若服务端成功生成或确认已有有效标题，Web 端会在本轮流结束后继续执行原有的 `onMessageComplete`。
- `Knowledge` 页面随后刷新会话列表，侧栏即可显示最新标题。

## 验证

```bash
pnpm test -- __tests__/ai-chat-store.test.ts __tests__/chat-title-generator.test.ts
pnpm run check-types
```
