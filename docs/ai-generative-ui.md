# Generative UI for Knowledge Chat

This document describes the Generative UI tool cards used in the Knowledge Chat.

## Overview

Generative UI uses AI SDK tool calling to render structured cards alongside assistant messages.

## Server Setup

1. Define tools in `packages/stock-tool` and `packages/weather-tool`, then re-export in `apps/server/src/services/ai-tools.ts`.
2. Inject tools in `apps/server/src/routes/ai-stream.ts` when the provider supports `function_calling`.
3. Add tool usage guidance in `packages/ai/src/prompts/knowledge-chat.ts`.
4. Prompt 需要覆盖相对时间表达（比如 最近一周/过去一周/近 7 天），以及公司名称到 ticker 的明确映射（Apple -> AAPL）。

## 实时数据源

1. 天气数据来自 WeatherAPI，服务端使用 `WEATHER_API_KEY` 发起请求。
2. 股票数据来自 Alpha Vantage，服务端使用 `STOCK_API_KEY` 发起请求。
3. 环境变量模板位于 `apps/server/.env.example`。
4. Alpha Vantage 在异常情况下会返回 `Information` 或 `Note` 字段，服务端会转为可读错误。
5. Alpha Vantage 免费层 `TIME_SERIES_DAILY` 使用 `outputsize=compact`，仅返回最近 100 个交易日的数据；超出可用区间会返回提示。
6. 股票历史走势查询不支持未来日期；请求包含未来日期时，服务端会返回提示信息，引导用户提供过去的日期范围。
7. 系统提示会注入当前日期（ YYYY-MM-DD ），用于判断历史 / 未来区间，避免模型使用训练时间线拒绝请求。

## UI Rendering

1. Preserve `UIMessage.parts` in `apps/web/src/hooks/use-knowledge-chat.ts`.
2. Render tool parts (`tool-displayWeather`, `tool-getStockPrice`, `tool-getStockTrend`) in `apps/web/src/features/knowledge/components/tool-cards.tsx`.
3. Render reasoning and tool call process rows in `apps/web/src/features/knowledge/components/message-list.tsx` with `Reasoning` and `ChainOfThought` (tool calls are nested under Reasoning when thinking is available).
4. Display tool cards and main message content in `apps/web/src/features/knowledge/components/message-bubble.tsx`.
5. Use `Reasoning` for the waiting state in `apps/web/src/features/knowledge/components/message-list.tsx`.

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
