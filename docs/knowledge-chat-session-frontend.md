# Knowledge Chat Session 前端集成说明

## 1. 目标

本次改动把已有的后端会话能力完整接入到 `Knowledge` 页面，覆盖会话的创建、切换、删除、历史展示，并补上首次加载性能优化与移动端交互。

## 2. 关键改动

1. 会话状态管理从固定 `chatId` 改为 `useChatSessions` 驱动。  
2. `KnowledgePage` 接入 `ChatHistoryPanel`，实现历史会话选择、新建会话、删除会话。  
3. `useKnowledgeChat` 支持动态 `chatId` 与 `onMessageComplete`，流式完成后刷新会话列表。  
4. 桌面端增加可折叠会话侧栏，移动端使用 `Sheet` 作为会话抽屉。  
5. 会话项增加 `content-visibility` 优化长列表首屏渲染。

## 3. 性能策略（基于 Vercel React Best Practices）

- `bundle-dynamic-imports`：`ChatHistoryPanel` 使用 `React.lazy` 动态加载。  
- `bundle-preload`：在历史按钮 `hover/focus` 时预加载会话面板模块。  
- `async-defer-await`：仅在选中会话后才拉取该会话消息，不做全量预取。  
- `rendering-content-visibility`：会话列表项启用内容可见性优化。

## 4. 主要文件

- `apps/web/src/routes/_app/knowledge.tsx`
- `apps/web/src/hooks/use-chat-sessions.ts`
- `apps/web/src/hooks/use-knowledge-chat.ts`
- `apps/web/src/features/knowledge/components/chat-history-panel.tsx`

## 5. 关键行为

```ts
// 会话为空时首次自动创建，避免进入页面无可用 chatId
const { selectedChatId, createChat } = useChatSessions({
  autoLoad: true,
  autoCreateIfEmpty: true,
})
```

```ts
// 会话切换后按需加载消息
useEffect(() => {
  if (!selectedChatId) return
  loadMessages(selectedChatId)
}, [selectedChatId, loadMessages])
```

```ts
// 流式完成后刷新会话摘要（messageCount / preview / updatedAt）
useKnowledgeChat({
  chatId: selectedChatId ?? '',
  onMessageComplete: refreshSessions,
  // ...
})
```

## 6. 验证

```bash
pnpm run check-types
```

类型检查通过后，核心流程可用：

- 打开 `Knowledge` 页面自动恢复最近会话。  
- 新建会话后立即可发送消息。  
- 删除当前会话后可自动切换到其他会话。  
- 移动端可通过抽屉查看与切换历史。  

## 7. 圆角 Token 一致性

`Knowledge` 顶部的 `Chat History` 按钮使用 `Button size="sm"`。
为确保全站主题圆角与 `--radius` 保持一致，`Button` 的 `xs/sm/icon-xs/icon-sm` 尺寸已移除 `min(var(--radius-md), px)` 的像素上限，改为纯 Token 圆角。

这样在调整 `packages/ui/src/styles/index.css` 的 `--radius` 后，`Knowledge` 页与其他共享按钮会同步生效，避免局部圆角被硬编码截断。
