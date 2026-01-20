import { tool } from 'ai'
import { z } from 'zod'

// =============================================================================
// Constants
// =============================================================================

const TEMPERATURE_UNITS = ['c', 'f'] as const
const DEFAULT_TEMPERATURE_UNIT = 'c'
const DEFAULT_STOCK_CURRENCY = 'USD'

const WEATHER_API_BASE_URL = 'https://api.weatherapi.com/v1/current.json'
const WEATHER_API_AQI = 'no'
const WEATHER_API_KEY_ENV = 'WEATHER_API_KEY'

const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query'
const ALPHA_VANTAGE_FUNCTION = 'GLOBAL_QUOTE'
const STOCK_API_KEY_ENV = 'STOCK_API_KEY'

// =============================================================================
// Types
// =============================================================================

type TemperatureUnit = (typeof TEMPERATURE_UNITS)[number]

export type WeatherToolOutput = {
	location: string
	condition: string
	temperature: number
	unit: TemperatureUnit
	humidityPercent: number
	windKph: number
}

export type StockToolOutput = {
	symbol: string
	price: number
	currency: string
	changePercent: number
}

// =============================================================================
// Schemas
// =============================================================================

const WeatherApiResponseSchema = z.object({
	location: z.object({
		name: z.string(),
	}),
	current: z.object({
		temp_c: z.coerce.number(),
		temp_f: z.coerce.number(),
		humidity: z.coerce.number(),
		wind_kph: z.coerce.number(),
		condition: z.object({
			text: z.string(),
		}),
	}),
})

const WeatherApiErrorSchema = z.object({
	error: z.object({
		message: z.string(),
	}),
})

const AlphaVantageGlobalQuoteSchema = z.object({
	'01. symbol': z.string(),
	'05. price': z.string(),
	'10. change percent': z.string(),
})

const AlphaVantageResponseSchema = z.object({
	'Global Quote': AlphaVantageGlobalQuoteSchema,
})

// =============================================================================
// Helpers
// =============================================================================

function getRequiredEnvValue(envName: string): string {
	const rawValue = process.env[envName]
	const trimmedValue = rawValue?.trim()
	if (!trimmedValue) {
		throw new Error(`${envName} is required`)
	}
	return trimmedValue
}

function normalizeLocation(location: string): string {
	const normalizedLocation = location.trim()
	if (normalizedLocation.length === 0) {
		throw new Error('Location is required')
	}
	return normalizedLocation
}

function normalizeSymbol(symbol: string): string {
	const normalizedSymbol = symbol.trim().toUpperCase()
	if (normalizedSymbol.length === 0) {
		throw new Error('Symbol is required')
	}
	return normalizedSymbol
}

function parsePercentValue(value: string): number {
	const normalizedValue = value.replace('%', '')
	const percentValue = Number.parseFloat(normalizedValue)
	if (!Number.isFinite(percentValue)) {
		throw new Error('Invalid change percent')
	}
	return percentValue
}

function getWeatherApiErrorMessage(payload: unknown): string | undefined {
	const parsed = WeatherApiErrorSchema.safeParse(payload)
	return parsed.success ? parsed.data.error.message : undefined
}

function getAlphaVantageErrorMessage(payload: unknown): string | undefined {
	if (!payload || typeof payload !== 'object') {
		return undefined
	}

	const record = payload as Record<string, unknown>
	const errorMessage = record['Error Message']
	if (typeof errorMessage === 'string') {
		return errorMessage
	}

	const noteMessage = record.Note
	if (typeof noteMessage === 'string') {
		return noteMessage
	}

	return undefined
}

async function fetchWeatherOutput(
	location: string,
	unit: TemperatureUnit,
	abortSignal?: AbortSignal
): Promise<WeatherToolOutput> {
	const weatherApiKey = getRequiredEnvValue(WEATHER_API_KEY_ENV)
	const weatherUrl = new URL(WEATHER_API_BASE_URL)
	weatherUrl.search = new URLSearchParams({
		key: weatherApiKey,
		q: location,
		aqi: WEATHER_API_AQI,
	}).toString()

	const weatherResponse = await fetch(weatherUrl.toString(), {
		signal: abortSignal,
	})
	const weatherPayload: unknown = await weatherResponse.json()
	const weatherErrorMessage = getWeatherApiErrorMessage(weatherPayload)

	if (!weatherResponse.ok) {
		const statusLabel = weatherResponse.status
			? ` (status ${weatherResponse.status})`
			: ''
		throw new Error(
			weatherErrorMessage ?? `Weather API request failed${statusLabel}`
		)
	}

	if (weatherErrorMessage) {
		throw new Error(weatherErrorMessage)
	}

	const weatherData = WeatherApiResponseSchema.parse(weatherPayload)
	const temperature =
		unit === 'f' ? weatherData.current.temp_f : weatherData.current.temp_c

	return {
		location: weatherData.location.name,
		condition: weatherData.current.condition.text,
		temperature,
		unit,
		humidityPercent: weatherData.current.humidity,
		windKph: weatherData.current.wind_kph,
	}
}

async function fetchStockOutput(
	symbol: string,
	abortSignal?: AbortSignal
): Promise<StockToolOutput> {
	const stockApiKey = getRequiredEnvValue(STOCK_API_KEY_ENV)
	const stockUrl = new URL(ALPHA_VANTAGE_BASE_URL)
	stockUrl.search = new URLSearchParams({
		function: ALPHA_VANTAGE_FUNCTION,
		symbol,
		apikey: stockApiKey,
	}).toString()

	const stockResponse = await fetch(stockUrl.toString(), {
		signal: abortSignal,
	})
	const stockPayload: unknown = await stockResponse.json()

	if (!stockResponse.ok) {
		const statusLabel = stockResponse.status
			? ` (status ${stockResponse.status})`
			: ''
		throw new Error(`Stock API request failed${statusLabel}`)
	}

	const stockErrorMessage = getAlphaVantageErrorMessage(stockPayload)
	if (stockErrorMessage) {
		throw new Error(stockErrorMessage)
	}

	const stockData = AlphaVantageResponseSchema.parse(stockPayload)
	const globalQuote = stockData['Global Quote']
	const priceValue = Number.parseFloat(globalQuote['05. price'])

	if (!Number.isFinite(priceValue)) {
		throw new Error('Invalid price')
	}

	const changePercentValue = parsePercentValue(globalQuote['10. change percent'])

	return {
		symbol,
		price: priceValue,
		currency: DEFAULT_STOCK_CURRENCY,
		changePercent: changePercentValue,
	}
}

// =============================================================================
// Tools
// =============================================================================

export const aiTools = {
	displayWeather: tool({
		description: 'Display the weather for a location',
		strict: true,
		inputSchema: z.object({
			location: z.string().trim().min(1).describe('Location name, e.g. "Beijing"'),
			unit: z.enum(TEMPERATURE_UNITS).optional().describe('c or f'),
		}),
		execute: async ({ location, unit }, { abortSignal }) => {
			const normalizedLocation = normalizeLocation(location)
			const resolvedUnit = unit ?? DEFAULT_TEMPERATURE_UNIT
			return await fetchWeatherOutput(normalizedLocation, resolvedUnit, abortSignal)
		},
	}),
	getStockPrice: tool({
		description: 'Get the current price for a stock symbol',
		strict: true,
		inputSchema: z.object({
			symbol: z.string().trim().min(1).describe('Ticker symbol, e.g. AAPL'),
		}),
		execute: async ({ symbol }, { abortSignal }) => {
			const normalizedSymbol = normalizeSymbol(symbol)
			return await fetchStockOutput(normalizedSymbol, abortSignal)
		},
	}),
}
