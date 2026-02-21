import { noteTools } from './note/tools'
import { getStockPrice, getStockTrend } from './stock/tools'
import { displayWeather } from './weather/tools'

export const aiTools = {
	displayWeather,
	getStockPrice,
	getStockTrend,
	...noteTools,
}

export { noteTools } from './note/tools'
export { getStockPrice, getStockTrend } from './stock/tools'
export { displayWeather } from './weather/tools'
