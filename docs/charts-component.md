# Charts 组件类型说明

本文件记录 `packages/ui/src/components/charts.tsx` 的 Recharts 组件类型约束。

## 说明

- `ChartTooltipContent` 使用显式的 `ChartPayload` 类型，包含 `payload.fill` 等字段，避免隐式 `any`。
- `ChartLegendContent` 使用独立的 `ChartLegendPayload` 类型，保证 `key` 类型为 `string | number`。

