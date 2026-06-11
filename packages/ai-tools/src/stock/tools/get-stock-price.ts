import { createTool } from "@mastra/core/tools"
import type { z } from "zod"

import { fetchStockPrice } from "../api/alpha-vantage"
import { StockPriceInputSchema } from "../schemas"

export const getStockPrice = createTool({
  id: "getStockPrice",
  description: "Get the current price for a stock symbol",
  strict: true,
  inputSchema: StockPriceInputSchema,
  execute: async ({ symbol }: z.infer<typeof StockPriceInputSchema>, context) =>
    await fetchStockPrice(symbol, context?.abortSignal)
})
