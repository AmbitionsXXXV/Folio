

下面是基于你贴的两篇 AI SDK 文档（Tool Calling + Generative UI）对你这份 `ai-tools.ts` 的实现做的 review。整体结论：**实现是对的、能用**，但有几处会影响“模型生成工具入参的稳定性 / 自动修复能力 / UI 渲染对齐”的细节，建议调整。

## 做得好的点（符合文档）
* **使用 `tool({ description, inputSchema, execute })`**：结构完全符合 AI SDK Core tools 的约定。
* **`inputSchema` 用 Zod**：符合文档建议，且类型推导可用。
* **工具命名方式**：`displayWeather` / `getStockPrice` 作为 tools object 的 key，符合 UI 侧 `tool-${toolName}` 的约定（例如 `tool-displayWeather`、`tool-getStockPrice`）。
* **`execute` 返回普通对象**：AI SDK 支持返回值或 Promise；这里同步返回也没问题。
* **输出结构清晰**：你把 Weather/Stock 输出类型独立出来，利于 UI 组件 props 对齐。

## 主要问题 1：空白字符串校验在 `execute` 里做，会降低“可修复性”
你在 schema 里用的是：

```ts
location: z.string().min(1)
symbol: z.string().min(1)
```

这会让 `"   "`（全空格）**通过 schema 校验**，然后在 `normalizeLocation/normalizeSymbol` 里抛错。这个错误属于**工具执行错误**（tool-error），而不是 `InvalidToolInputError`（入参 schema 错误）。差别在于：

* **schema 错误**：更容易触发模型的“修复工具调用”（以及 strict tool calling 下更少发生）。
* **execute 抛错**：模型只能看到 tool-error（多步场景会把错误作为 tool-error part 回传），修复效果通常更不稳定。

### 建议改法：把 trim + min(1) 放进 schema
这样模型更容易生成合格参数，也更容易被自动修复。

```ts
inputSchema: z.object({
    location: z.string().trim().min(1).describe('City name, e.g. "Shanghai"'),
    unit: z.enum(TEMPERATURE_UNITS).optional().describe('c or f'),
})
```

Stock 同理：

```ts
symbol: z.string().trim().min(1).describe('Stock ticker, e.g. AAPL')
```

> 这样你甚至可以把 `normalizeLocation/normalizeSymbol` 简化很多（比如只做 `toUpperCase`）。

## 主要问题 2：缺少 `.describe()` / `inputExamples`，会让模型更容易“乱填”
文档里强调 `description` + schema 的 `describe` 对 tool picking 和 tool input 都很关键；你目前只在 tool-level 有 description，字段级别没有描述，也没有 examples。

### 建议
* 给关键字段加 `.describe(...)`
* 如有使用 Anthropic，建议加 `inputExamples`（其他 provider 会忽略，但不影响）

示例：

```ts
displayWeather: tool({
    description: 'Display current weather metrics for a given location',
    inputSchema: z.object({
        location: z.string().trim().min(1).describe('Location name, e.g. "Beijing"'),
        unit: z.enum(TEMPERATURE_UNITS).optional().describe('Temperature unit: c or f'),
    }),
    inputExamples: [
        { input: { location: 'Shanghai', unit: 'c' } },
        { input: { location: 'San Francisco', unit: 'f' } },
    ],
    execute: async ({ location, unit }) => { ... },
})
```

## 建议项 3：可以开启 `strict: true`（按 tool 粒度）
文档里提到 strict tool calling 能提高可靠性（provider 支持时生效，不支持就忽略）。你的 schema 很简单，通常比较适合 strict。

```ts
displayWeather: tool({
    strict: true,
    ...
})
```

Stock 也一样。

## 建议项 4：`execute` 最好写成 `async`，并支持 `abortSignal`（可选但更“文档范式”）
虽然同步返回没问题，但如果你未来接真实 API（天气/股票）就会变成网络请求。提前把签名写成 async + 支持 abortSignal，会更贴合文档里“工具执行选项”的模式：

```ts
execute: async ({ location, unit }, { abortSignal }) => {
    // fetch(url, { signal: abortSignal })
    return buildWeatherOutput(location, unit ?? DEFAULT_TEMPERATURE_UNIT)
}
```

## 建议项 5：输出字段要和 UI 组件 props 对齐（Generative UI 里很关键）
文档的 Generative UI 示例里，UI 组件直接 `Weather {...part.output}`，所以**tool output 的 shape 就是组件 props**。

你现在 Weather 输出是：

```ts
{ location, condition, temperature, unit, humidityPercent, windKph }
```

这当然没问题，但你需要确保 UI 组件用的是这些字段名（比如 `condition` vs 文档示例里的 `weather`）。否则 UI 渲染层会很容易“拿不到字段”。

## 一个更推荐的精简版本（保留你现有逻辑）
下面只改关键点：trim 校验、describe、strict、async：

```ts
export const aiTools = {
    displayWeather: tool({
        description: 'Display current weather for a location',
        strict: true,
        inputSchema: z.object({
            location: z.string().trim().min(1).describe('Location, e.g. "Beijing"'),
            unit: z.enum(TEMPERATURE_UNITS).optional().describe('c or f'),
        }),
        execute: async ({ location, unit }) => {
            const resolvedUnit = unit ?? DEFAULT_TEMPERATURE_UNIT
            return buildWeatherOutput(location, resolvedUnit)
        },
    }),

    getStockPrice: tool({
        description: 'Get the current price for a stock symbol',
        strict: true,
        inputSchema: z.object({
            symbol: z.string().trim().min(1).describe('Ticker symbol, e.g. "AAPL"'),
        }),
        execute: async ({ symbol }) => {
            const normalizedSymbol = symbol.toUpperCase()
            return buildStockOutput(normalizedSymbol)
        },
    }),
} as const
```

如果你把 UI 侧（`tool-displayWeather` / `tool-getStockPrice` 的渲染）代码也贴出来，我可以再帮你检查 **tool 输出字段与组件 props**、以及 **tool part state 处理** 是否完全符合 AI SDK UI 的最佳实践。

