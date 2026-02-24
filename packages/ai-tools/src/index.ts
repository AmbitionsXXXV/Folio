// Note tools

export {
	CreateNoteInputSchema,
	DeleteNoteInputSchema,
	GetNoteInputSchema,
	SearchNotesInputSchema,
	UpdateNoteInputSchema,
} from './note/schemas'
export {
	createNote,
	deleteNote,
	getNote,
	noteTools,
	searchNotes,
	updateNote,
} from './note/tools'
export type {
	NoteCreateData,
	NoteDeleteData,
	NoteGetData,
	NoteSearchData,
	NoteSearchResult,
	NoteToolContext,
	NoteToolResult,
	NoteUpdateData,
} from './note/types'
export { getNoteToolContext } from './note/types'
export { fetchStockPrice, fetchStockTrend } from './stock/api'
export { StockCard, StockTrendCard } from './stock/components'
export { StockPriceInputSchema, StockTrendInputSchema } from './stock/schemas'
export { getStockPrice, getStockTrend } from './stock/tools'
// Stock tools
export type {
	StockCardProps,
	StockChangeTone,
	StockDataPoint,
	StockPriceInput,
	StockPriceOutput,
	StockTrendCardProps,
	StockTrendInput,
	StockTrendOutput,
} from './stock/types'
// Aggregated tools
export { aiTools } from './tools'
export { fetchWeatherOutput } from './weather/api'
export { WeatherCard } from './weather/components'
export { WeatherToolInputSchema } from './weather/schemas'
export { displayWeather } from './weather/tools'
// Weather tools
export type {
	TemperatureUnit,
	WeatherCardProps,
	WeatherToolInput,
	WeatherToolOutput,
} from './weather/types'
export { TEMPERATURE_UNITS } from './weather/types'
// Web fetch tools
export { fetchUrlContent } from './web-fetch/api'
export { WebFetchCard } from './web-fetch/components'
export { WebFetchToolInputSchema } from './web-fetch/schemas'
export { webFetch } from './web-fetch/tools'
export type {
	FetchFormat,
	WebFetchCardProps,
	WebFetchToolInput,
	WebFetchToolOutput,
} from './web-fetch/types'
export { FETCH_FORMATS } from './web-fetch/types'
// Web search tools
export {
	fetchWebSearchResults,
	getTavilyMcpUrl,
	isTavilyConfigured,
} from './web-search/api'
export { WebSearchCard, WebSearchCompactBar } from './web-search/components'
export { WebSearchToolInputSchema } from './web-search/schemas'
export { webSearch } from './web-search/tools'
export type {
	SearchDepth,
	WebSearchCardProps,
	WebSearchCompactBarProps,
	WebSearchResult,
	WebSearchToolInput,
	WebSearchToolOutput,
} from './web-search/types'
export { SEARCH_DEPTHS } from './web-search/types'
