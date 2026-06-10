import { noteTools } from "./note/tools"
import { getStockPrice, getStockTrend } from "./stock/tools"
import { displayWeather } from "./weather/tools"
import { webFetch } from "./web-fetch/tools"
import { webSearch } from "./web-search/tools"

export const aiTools = {
  displayWeather,
  getStockPrice,
  getStockTrend,
  webFetch,
  webSearch,
  ...noteTools
}

export { noteTools } from "./note/tools"
export { getStockPrice, getStockTrend } from "./stock/tools"
export { displayWeather } from "./weather/tools"
export { webFetch } from "./web-fetch/tools"
export { webSearch } from "./web-search/tools"
