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
