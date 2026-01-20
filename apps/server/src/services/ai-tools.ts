import { tool } from 'ai'
import { z } from 'zod'

// =============================================================================
// Constants
// =============================================================================

const TEMPERATURE_UNITS = ['c', 'f'] as const
const DEFAULT_TEMPERATURE_UNIT = 'c'
const CELSIUS_TO_FAHRENHEIT_MULTIPLIER = 9 / 5
const FAHRENHEIT_OFFSET = 32

const DEFAULT_WEATHER_CONDITION = 'Sunny'
const DEFAULT_TEMPERATURE_C = 24
const DEFAULT_HUMIDITY_PERCENT = 40
const DEFAULT_WIND_KPH = 12

const DEFAULT_STOCK_CURRENCY = 'USD'
const DEFAULT_STOCK_CHANGE_PERCENT = 0.8
const DEFAULT_STOCK_PRICE = 100

const STOCK_PRICE_MAP: Record<string, number> = {
	AAPL: 192.5,
	MSFT: 418.2,
	NVDA: 121.4,
	TSLA: 248.1,
}

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
// Helpers
// =============================================================================

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

function celsiusToFahrenheit(celsius: number): number {
	return Math.round(celsius * CELSIUS_TO_FAHRENHEIT_MULTIPLIER + FAHRENHEIT_OFFSET)
}

function buildWeatherOutput(
	location: string,
	unit: TemperatureUnit
): WeatherToolOutput {
	const temperatureC = DEFAULT_TEMPERATURE_C
	const temperature = unit === 'f' ? celsiusToFahrenheit(temperatureC) : temperatureC

	return {
		location,
		condition: DEFAULT_WEATHER_CONDITION,
		temperature,
		unit,
		humidityPercent: DEFAULT_HUMIDITY_PERCENT,
		windKph: DEFAULT_WIND_KPH,
	}
}

function buildStockOutput(symbol: string): StockToolOutput {
	const price = STOCK_PRICE_MAP[symbol] ?? DEFAULT_STOCK_PRICE
	if (!Number.isFinite(price)) {
		throw new Error('Invalid price')
	}

	return {
		symbol,
		price,
		currency: DEFAULT_STOCK_CURRENCY,
		changePercent: DEFAULT_STOCK_CHANGE_PERCENT,
	}
}

// =============================================================================
// Tools
// =============================================================================

export const aiTools = {
	displayWeather: tool({
		description: 'Display the weather for a location',
		inputSchema: z.object({
			location: z.string().min(1),
			unit: z.enum(TEMPERATURE_UNITS).optional(),
		}),
		execute: ({ location, unit }) => {
			const normalizedLocation = normalizeLocation(location)
			const resolvedUnit = unit ?? DEFAULT_TEMPERATURE_UNIT
			return buildWeatherOutput(normalizedLocation, resolvedUnit)
		},
	}),
	getStockPrice: tool({
		description: 'Get the current price for a stock symbol',
		inputSchema: z.object({
			symbol: z.string().min(1),
		}),
		execute: ({ symbol }) => {
			const normalizedSymbol = normalizeSymbol(symbol)
			return buildStockOutput(normalizedSymbol)
		},
	}),
}
