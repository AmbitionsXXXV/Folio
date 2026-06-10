// =============================================================================
// Input/Output Types for Tools
// =============================================================================

export interface StockPriceInput {
  symbol: string
}

export interface StockPriceOutput {
  symbol: string
  price: number
  currency: string
  changePercent: number
}

export interface StockTrendInput {
  symbol: string
  startDate: string // ISO date string (YYYY-MM-DD)
  endDate: string // ISO date string (YYYY-MM-DD)
}

export interface StockDataPoint {
  date: string // ISO date string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface StockTrendOutput {
  symbol: string
  currency: string
  startDate: string
  endDate: string
  dataPoints: StockDataPoint[]
  periodChangePercent: number // Overall change from start to end
}

// =============================================================================
// UI Component Types
// =============================================================================

export type StockChangeTone = "up" | "down" | "flat"

export interface StockCardProps {
  title: string
  symbol: string
  priceLabel: string
  priceValue: string
  changeLabel: string
  changeValue: string
  changeTone: StockChangeTone
  chartData?: { time: string; price: number }[]
  className?: string
}

export interface StockTrendCardProps {
  title: string
  symbol: string
  dateRange: string
  currentPrice: string
  periodChange: string
  changeTone: StockChangeTone
  dataPoints: StockDataPoint[]
  className?: string
}
