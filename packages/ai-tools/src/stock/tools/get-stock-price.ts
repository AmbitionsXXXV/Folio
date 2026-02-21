import { tool } from 'ai'
import { fetchStockPrice } from '../api/alpha-vantage'
import { StockPriceInputSchema } from '../schemas'

export const getStockPrice = tool({
	description: 'Get the current price for a stock symbol',
	strict: true,
	inputSchema: StockPriceInputSchema,
	execute: async ({ symbol }, { abortSignal }) => {
		return await fetchStockPrice(symbol, abortSignal)
	},
})
