import { tool } from "ai"

import { fetchStockTrend } from "../api/alpha-vantage"
import { StockTrendInputSchema } from "../schemas"

export const getStockTrend = tool({
  description:
    "Get historical stock price data over a date range for trend analysis. Returns daily OHLCV data.",
  strict: true,
  inputSchema: StockTrendInputSchema,
  execute: async ({ symbol, startDate, endDate }, { abortSignal }) =>
    await fetchStockTrend(symbol, startDate, endDate, abortSignal)
})
