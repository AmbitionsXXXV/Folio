// =============================================================================
// Types
// =============================================================================

export type {
	StockCardProps,
	StockChangeTone,
	StockDataPoint,
	StockPriceInput,
	StockPriceOutput,
	StockTrendCardProps,
	StockTrendInput,
	StockTrendOutput,
} from './types'

// =============================================================================
// Schemas (for validation/parsing in consumers)
// =============================================================================

export { StockPriceInputSchema, StockTrendInputSchema } from './schemas'

// =============================================================================
// Tools (server-side)
// =============================================================================

export { getStockPrice, getStockTrend } from './tools'

// =============================================================================
// Components (client-side)
// =============================================================================

export { StockCard, StockTrendCard } from './components'

// =============================================================================
// API client (for direct use if needed)
// =============================================================================

export { fetchStockPrice, fetchStockTrend } from './api'
