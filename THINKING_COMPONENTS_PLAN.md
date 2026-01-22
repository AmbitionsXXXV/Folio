# 集成 Thinking 组件到 Chat UI

## 目标
将 `chain-of-thoughts.tsx` 和 `resoning.tsx` 组件集成到 Knowledge Chat 页面，完善 thinking 模型的 UI 交互体验。

## 当前状态分析

### 现有组件
- **`Reasoning`** (`resoning.tsx`): 完整的推理展示组件
  - 支持流式显示 (`isStreaming`)
  - 自动折叠功能（流结束后 1 秒自动折叠）
  - 时长统计 (`duration`)
  - 使用 `Streamdown` 渲染 markdown

- **`ChainOfThought`** (`chain-of-thoughts.tsx`): 多步骤思维链组件
  - 支持步骤展示 (`ChainOfThoughtStep`)
  - 状态标记 (complete/active/pending)
  - 搜索结果展示
  - 图片展示

### 当前实现
- `message-bubble.tsx` 中的 `ThinkingCollapse` 组件功能较简单
- 缺少：流式动画、自动折叠、时长统计

## 实施方案

### 方案一：使用 Reasoning 组件替换 ThinkingCollapse

**修改文件**: `apps/web/src/features/knowledge/components/message-bubble.tsx`

#### 步骤 1: 添加导入
```tsx
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from '@/components/ai-elements/resoning'
```

#### 步骤 2: 替换 ThinkingCollapse 实现

将现有的 `ThinkingCollapse` 组件（第 43-112 行）替换为使用 `Reasoning` 组件：

```tsx
type ThinkingCollapseProps = {
  thinking: string
  isStreaming: boolean
  isThinkingOnly: boolean
  reasoningTokens: string | null
  duration?: number
}

const ThinkingCollapse = memo(function ThinkingCollapse({
  thinking,
  isStreaming,
  isThinkingOnly,
  reasoningTokens,
  duration,
}: ThinkingCollapseProps) {
  return (
    <Reasoning
      className="mb-2"
      duration={duration}
      isStreaming={isStreaming && isThinkingOnly}
    >
      <ReasoningTrigger />
      <ReasoningContent>{thinking}</ReasoningContent>
    </Reasoning>
  )
})
```

#### 步骤 3: 更新 MessageBubble 调用

在 `MessageBubble` 组件中传递 `duration` 属性（如果后端支持）

### 方案二：集成 ChainOfThought 展示工具调用步骤

当 AI 使用工具时，使用 ChainOfThought 组件展示调用过程：

**修改位置**: `MessageBubble` 组件中的工具渲染部分（第 309-334 行）

```tsx
import {
  ChainOfThought,
  ChainOfThoughtContent,
  ChainOfThoughtHeader,
  ChainOfThoughtStep,
} from '@/components/ai-elements/chain-of-thoughts'
```

**实现逻辑**:
1. 过滤 `message.parts` 中的 `tool-invocation` 类型
2. 将工具调用包装在 `ChainOfThought` 组件中
3. 每个工具调用用 `ChainOfThoughtStep` 渲染
4. 根据工具状态设置 step status (pending/active/complete)

```tsx
// 在 MessageBubble 中添加工具步骤渲染
const toolInvocations = message.parts?.filter(
  (p) => p.type === 'tool-invocation'
) ?? []

{toolInvocations.length > 0 && (
  <ChainOfThought className="mt-2">
    <ChainOfThoughtHeader>Tool Calls</ChainOfThoughtHeader>
    <ChainOfThoughtContent>
      {toolInvocations.map((tool) => (
        <ChainOfThoughtStep
          key={tool.toolCallId}
          label={tool.toolName}
          status={tool.state === 'result' ? 'complete' : 'active'}
          description={/* 工具参数摘要 */}
        />
      ))}
    </ChainOfThoughtContent>
  </ChainOfThought>
)}
```

## 修改文件清单

| 文件 | 修改内容 |
|------|---------|
| `apps/web/src/features/knowledge/components/message-bubble.tsx` | 1. 替换 ThinkingCollapse 使用 Reasoning 组件<br>2. 添加 ChainOfThought 展示工具调用步骤 |

## 验证方案

1. **Reasoning 流式显示测试**：
   - 启用 thinking 模式发送消息
   - 确认 "Thinking..." 动画正确显示
   - 确认内容流式渲染

2. **Reasoning 自动折叠测试**：
   - 等待思考完成
   - 确认 1 秒后自动折叠
   - 确认显示 "Thought for X seconds"

3. **手动展开/折叠测试**：
   - 点击折叠面板
   - 确认可以手动控制展开/折叠状态

4. **ChainOfThought 工具调用测试**：
   - 发送需要工具调用的请求（如天气、股票查询）
   - 确认工具调用步骤正确展示
   - 确认步骤状态正确切换 (active → complete)
   - 确认可折叠/展开工具调用详情
