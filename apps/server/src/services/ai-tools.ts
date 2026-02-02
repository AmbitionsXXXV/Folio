import { noteTools } from '@folionote/note-tool/tools'
import { getStockPrice, getStockTrend } from '@folionote/stock-tool/tools'
import { displayWeather } from '@folionote/weather-tool/tools'

export const aiTools = {
	displayWeather,
	getStockPrice,
	getStockTrend,
	...noteTools,
}
