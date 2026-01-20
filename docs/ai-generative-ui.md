# Generative UI for Knowledge Chat

This document describes the Generative UI tool cards used in the Knowledge Chat.

## Overview

Generative UI uses AI SDK tool calling to render structured cards alongside assistant messages.

## Server Setup

1. Define tools in `apps/server/src/services/ai-tools.ts`.
2. Inject tools in `apps/server/src/routes/ai-stream.ts` when the provider supports `function_calling`.
3. Add tool usage guidance in `packages/ai/src/prompts/knowledge-chat.ts`.

## 实时数据源

1. 天气数据来自 WeatherAPI，服务端使用 `WEATHER_API_KEY` 发起请求。
2. 股票数据来自 Alpha Vantage，服务端使用 `STOCK_API_KEY` 发起请求。
3. 环境变量模板位于 `apps/server/.env.example`。

## UI Rendering

1. Preserve `UIMessage.parts` in `apps/web/src/hooks/use-knowledge-chat.ts`.
2. Render tool parts (`tool-displayWeather`, `tool-getStockPrice`) in `apps/web/src/features/knowledge/components/tool-cards.tsx`.
3. Display tool cards in `apps/web/src/features/knowledge/components/message-bubble.tsx`.

## Example Prompts

- "What's the weather in Tokyo?"
- "Show AAPL stock price."
