import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { aiTools } from '../src/services/ai-tools'

const WEATHER_API_KEY = 'test-weather-key'
const STOCK_API_KEY = 'test-stock-key'

const WEATHER_LOCATION_NAME = 'Tokyo'
const WEATHER_CONDITION = 'Partly cloudy'
const WEATHER_TEMPERATURE_C = 22
const WEATHER_TEMPERATURE_F = 72
const WEATHER_HUMIDITY_PERCENT = 55
const WEATHER_WIND_KPH = 14

const WEATHER_API_RESPONSE = {
	location: {
		name: WEATHER_LOCATION_NAME,
	},
	current: {
		temp_c: WEATHER_TEMPERATURE_C,
		temp_f: WEATHER_TEMPERATURE_F,
		humidity: WEATHER_HUMIDITY_PERCENT,
		wind_kph: WEATHER_WIND_KPH,
		condition: {
			text: WEATHER_CONDITION,
		},
	},
}

const STOCK_SYMBOL = 'AAPL'
const STOCK_PRICE = 192.5
const STOCK_CHANGE_PERCENT = -1.23
const STOCK_CHANGE_PERCENT_TEXT = '-1.23%'
const STOCK_CURRENCY = 'USD'

const STOCK_API_RESPONSE = {
	'Global Quote': {
		'01. symbol': STOCK_SYMBOL,
		'05. price': STOCK_PRICE.toString(),
		'10. change percent': STOCK_CHANGE_PERCENT_TEXT,
	},
}

const ALT_STOCK_SYMBOL = 'MSFT'
const ALT_STOCK_PRICE = 418.2
const ALT_STOCK_CHANGE_PERCENT = 0.8
const ALT_STOCK_CHANGE_PERCENT_TEXT = '0.8%'

const ALT_STOCK_API_RESPONSE = {
	'Global Quote': {
		'01. symbol': ALT_STOCK_SYMBOL,
		'05. price': ALT_STOCK_PRICE.toString(),
		'10. change percent': ALT_STOCK_CHANGE_PERCENT_TEXT,
	},
}

type FetchResponse = {
	ok: boolean
	status: number
	statusText: string
	json: () => Promise<unknown>
}

function createFetchResponse(payload: unknown): FetchResponse {
	return {
		ok: true,
		status: 200,
		statusText: 'OK',
		json: async () => payload,
	}
}

function isAsyncIterable<T>(value: T | AsyncIterable<T>): value is AsyncIterable<T> {
	return typeof value === 'object' && value !== null && Symbol.asyncIterator in value
}

async function resolveToolOutput<T>(value: T | AsyncIterable<T>): Promise<T> {
	if (isAsyncIterable(value)) {
		const iterator = value[Symbol.asyncIterator]()
		const { value: nextValue } = await iterator.next()
		return nextValue
	}

	return value
}

describe('ai-tools', () => {
	const originalWeatherApiKey = process.env.WEATHER_API_KEY
	const originalStockApiKey = process.env.STOCK_API_KEY

	beforeEach(() => {
		process.env.WEATHER_API_KEY = WEATHER_API_KEY
		process.env.STOCK_API_KEY = STOCK_API_KEY
	})

	afterEach(() => {
		process.env.WEATHER_API_KEY = originalWeatherApiKey
		process.env.STOCK_API_KEY = originalStockApiKey
		vi.unstubAllGlobals()
		vi.restoreAllMocks()
	})

	it('returns weather output with normalized location', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(createFetchResponse(WEATHER_API_RESPONSE))
		vi.stubGlobal('fetch', fetchMock)

		const result = await aiTools.displayWeather.execute(
			{
				location: '  Tokyo  ',
				unit: 'c',
			},
			{
				toolCallId: 'test-call-1',
				messages: [],
			}
		)
		const output = await resolveToolOutput(result)

		expect(output).toEqual({
			location: WEATHER_LOCATION_NAME,
			condition: WEATHER_CONDITION,
			temperature: WEATHER_TEMPERATURE_C,
			unit: 'c',
			humidityPercent: WEATHER_HUMIDITY_PERCENT,
			windKph: WEATHER_WIND_KPH,
		})
	})

	it('returns weather output in Fahrenheit when requested', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(createFetchResponse(WEATHER_API_RESPONSE))
		vi.stubGlobal('fetch', fetchMock)

		const result = await aiTools.displayWeather.execute(
			{
				location: 'Seattle',
				unit: 'f',
			},
			{
				toolCallId: 'test-call-2',
				messages: [],
			}
		)
		const output = await resolveToolOutput(result)

		expect(output.temperature).toBe(WEATHER_TEMPERATURE_F)
		expect(output.unit).toBe('f')
	})

	it('returns stock output with normalized symbol', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(createFetchResponse(STOCK_API_RESPONSE))
		vi.stubGlobal('fetch', fetchMock)

		const result = await aiTools.getStockPrice.execute(
			{
				symbol: 'aapl',
			},
			{
				toolCallId: 'test-call-3',
				messages: [],
			}
		)
		const output = await resolveToolOutput(result)

		expect(output).toEqual({
			symbol: STOCK_SYMBOL,
			price: STOCK_PRICE,
			currency: STOCK_CURRENCY,
			changePercent: STOCK_CHANGE_PERCENT,
		})
	})

	it('parses stock change percent from Alpha Vantage', async () => {
		const fetchMock = vi
			.fn()
			.mockResolvedValue(createFetchResponse(ALT_STOCK_API_RESPONSE))
		vi.stubGlobal('fetch', fetchMock)

		const result = await aiTools.getStockPrice.execute(
			{
				symbol: '  msft ',
			},
			{
				toolCallId: 'test-call-4',
				messages: [],
			}
		)
		const output = await resolveToolOutput(result)

		expect(output.symbol).toBe(ALT_STOCK_SYMBOL)
		expect(output.price).toBe(ALT_STOCK_PRICE)
		expect(output.changePercent).toBe(ALT_STOCK_CHANGE_PERCENT)
	})
})
