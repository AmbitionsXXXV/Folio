import { createTool } from "@mastra/core/tools"
import type { z } from "zod"

import { fetchStockTrend } from "../api/alpha-vantage"
import { StockTrendInputSchema } from "../schemas"

export const getStockTrend = createTool({
  id: "getStockTrend",
  description:
    "Get historical stock price data over a date range for trend analysis. Returns daily OHLCV data.",
  strict: true,
  inputSchema: StockTrendInputSchema,
  execute: async (
    { symbol, startDate, endDate }: z.infer<typeof StockTrendInputSchema>,
    context
  ) => await fetchStockTrend(symbol, startDate, endDate, context?.abortSignal)
})
