# Generative UI for Knowledge Chat

This document describes the Generative UI tool cards used in the Knowledge Chat.

## Overview

Generative UI uses AI SDK tool calling to render structured cards alongside assistant messages.

## Server Setup

1. Define tools in `packages/ai-tools` (under `src/stock/`, `src/weather/`, `src/note/`), then re-export via `@folionote/ai-tools/tools` in `apps/server/src/services/ai-tools.ts`.
2. Inject tools in `apps/server/src/routes/ai-stream.ts` when the provider supports `function_calling`.
3. Add tool usage guidance in `packages/ai/src/prompts/knowledge-chat.ts`.
4. Prompt 需要覆盖相对时间表达（比如 最近一周/过去一周/近 7 天），以及公司名称到 ticker 的明确映射（Apple -> AAPL）。
5. 在 `apps/server/src/routes/ai-stream.ts` 为 `toUIMessageStreamResponse` 启用 `sendSources` 与 `sendReasoning`，用于前端渲染来源与思考过程。

## 实时数据源

1. 天气数据来自 WeatherAPI，服务端使用 `WEATHER_API_KEY` 发起请求。
2. 股票数据来自 Alpha Vantage，服务端使用 `STOCK_API_KEY` 发起请求。
3. 环境变量模板位于 `apps/server/.env.example`。
4. Alpha Vantage 在异常情况下会返回 `Information` 或 `Note` 字段，服务端会转为可读错误。
5. Alpha Vantage 免费层 `TIME_SERIES_DAILY` 使用 `outputsize=compact`，仅返回最近 100 个交易日的数据；超出可用区间会返回提示。
6. 股票历史走势查询不支持未来日期；请求包含未来日期时，服务端会返回提示信息，引导用户提供过去的日期范围。
7. 系统提示会注入当前日期（ YYYY-MM-DD ），用于判断历史 / 未来区间，避免模型使用训练时间线拒绝请求。

## 工具安全约束

1. note 写操作（create / update / delete）全部要求用户审批后才会真正执行。
2. `webFetch` 仅允许访问公网 `http(s)` 目标；回环、本机、私网、link-local 与跳转到这些地址的重定向都会被服务端拒绝。
3. 图片描述手动接口必须提供用户自己的 `provider + apiKey`；平台侧 AI 凭证回退仅允许内部异步流程在显式配置后启用。

## UI Rendering

1. Preserve `UIMessage.parts` in `apps/web/src/hooks/use-knowledge-chat.ts`.
2. Render tool parts (`tool-displayWeather`, `tool-getStockPrice`, `tool-getStockTrend`) in `apps/web/src/features/knowledge/components/tool-cards.tsx`.
3. Render reasoning and tool call process rows in `apps/web/src/features/knowledge/components/message-list.tsx` with `Reasoning` and `Tool` (tool calls are nested under `Reasoning` when thinking is available).
4. Display tool cards and main message content in `apps/web/src/features/knowledge/components/message-bubble.tsx`.
5. Use `Reasoning` for the waiting state in `apps/web/src/features/knowledge/components/message-list.tsx`.
6. Use `Sources` in `apps/web/src/components/ai-elements/sources.tsx` and render `source-url` parts in `message-bubble.tsx`.
7. Use `Tool` in `apps/web/src/components/ai-elements/tool.tsx` to render tool input/output details and status badges.
8. Add message actions (retry, copy) in `apps/web/src/features/knowledge/components/message-bubble.tsx`.
9. Use `Loader` in `apps/web/src/components/ai-elements/loader.tsx` for streaming feedback in `message-list.tsx`.
10. 当模型标记为 reasoning 且不支持开关（`enableReasoning` 不在 `extendParams`）时，Knowledge 页面会自动开启 thinking 展示，确保 reasoning 先于 tool calls 显示。

## UI 交互与可访问性

- 消息气泡进入时使用 `animate-in` 相关类，并同步添加 `motion-reduce:animate-none`，确保减少动态效果时不触发动画。
- 流式回复容器设置 `aria-live="polite"` 与 `aria-busy`，避免无状态更新导致的朗读噪音。
- 等待态 shimmer 通过 `duration` 与 `spread` 控制节奏，避免过快闪烁。
- 空状态图标使用 `animate-float`（定义在 `apps/web/src/styles/animate.css`），并加上 `motion-reduce:animate-none`。
- 输入区容器通过 `focus-within:ring-2 focus-within:ring-primary/20` 提示焦点状态。
- 输入区富文本编辑器保持 `w-full`，避免在 flex 容器中出现水平居中。

## Attachments

1. 文件附件由 `apps/web/src/components/ai-elements/prompt-input.tsx` 处理，`ChatInput` 通过 `PromptInputActionAddAttachments` 添加文件。
2. 校验规则在 `ChatInput` 中配置：`accept="image/*,application/pdf"`、`maxFiles=5`、`maxFileSize=5 MB`。
3. 粘贴文件和拖拽文件会进入相同的校验与预览流程，失败时通过 toast 提示错误原因。

## Tool Card 组件

WeatherCard 与 StockCard 在 Web 端完成渲染，不依赖 RSC。工具输出字段与组件 props 的映射如下：

1. WeatherCard 对应字段：`location`、`condition`、`temperature`、`unit`、`humidityPercent`、`windKph`
2. StockCard 对应字段：`symbol`、`price`、`currency`、`changePercent`
3. StockTrendCard 对应字段：`symbol`、`currency`、`startDate`、`endDate`、`dataPoints`、`periodChangePercent`

## Example Prompts

- "What's the weather in Tokyo?"
- "Show AAPL stock price."
- "Show AAPL trend from 2026-01-01 to 2026-01-15."
- "最近一周 Apple 的股价走势。"
