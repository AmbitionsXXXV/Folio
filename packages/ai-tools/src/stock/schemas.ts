import { z } from "zod"

// =============================================================================
// Tool Input Schemas
// =============================================================================

export const StockPriceInputSchema = z.object({
  symbol: z
    .string()
    .trim()
    .min(1)
    .describe("Stock ticker symbol, e.g. AAPL, GOOGL, MSFT")
})

export const StockTrendInputSchema = z.object({
  symbol: z.string().trim().min(1).describe("Stock ticker symbol, e.g. AAPL"),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe("Start date in YYYY-MM-DD format"),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .describe("End date in YYYY-MM-DD format")
})

// =============================================================================
// Alpha Vantage API Response Schemas
// =============================================================================

export const AlphaVantageGlobalQuoteSchema = z.object({
  "01. symbol": z.string(),
  "05. price": z.string(),
  "10. change percent": z.string()
})

export const AlphaVantageQuoteResponseSchema = z.object({
  "Global Quote": AlphaVantageGlobalQuoteSchema
})

export const AlphaVantageTimeSeriesEntrySchema = z.object({
  "1. open": z.string(),
  "2. high": z.string(),
  "3. low": z.string(),
  "4. close": z.string(),
  "5. volume": z.string()
})

export const AlphaVantageTimeSeriesResponseSchema = z.object({
  "Meta Data": z.object({
    "2. Symbol": z.string()
  }),
  "Time Series (Daily)": z.record(z.string(), AlphaVantageTimeSeriesEntrySchema)
})
