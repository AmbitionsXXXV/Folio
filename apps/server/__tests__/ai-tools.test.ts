import { describe, expect, it } from 'vitest'
import { aiTools } from '../src/services/ai-tools'

const DEFAULT_WEATHER_CONDITION = 'Sunny'
const DEFAULT_TEMPERATURE_C = 24
const DEFAULT_TEMPERATURE_F = 75
const DEFAULT_HUMIDITY_PERCENT = 40
const DEFAULT_WIND_KPH = 12

const DEFAULT_STOCK_CURRENCY = 'USD'
const DEFAULT_STOCK_CHANGE_PERCENT = 0.8
const DEFAULT_STOCK_PRICE = 100
const AAPL_STOCK_PRICE = 192.5

describe('ai-tools', () => {
	it('returns weather output with normalized location', async () => {
		const output = await aiTools.displayWeather.execute(
			{
				location: '  Tokyo  ',
				unit: 'c',
			},
			{
				toolCallId: 'test-call-1',
				messages: [],
			}
		)

		expect(output).toEqual({
			location: 'Tokyo',
			condition: DEFAULT_WEATHER_CONDITION,
			temperature: DEFAULT_TEMPERATURE_C,
			unit: 'c',
			humidityPercent: DEFAULT_HUMIDITY_PERCENT,
			windKph: DEFAULT_WIND_KPH,
		})
	})

	it('returns weather output in Fahrenheit when requested', async () => {
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

		// Handle both direct result and AsyncIterable cases
		const output =
			Symbol.asyncIterator in result
				? await result[Symbol.asyncIterator]()
						.next()
						.then((r) => r.value)
				: result

		expect(output.temperature).toBe(DEFAULT_TEMPERATURE_F)
		expect(output.unit).toBe('f')
	})

	it('returns stock output with normalized symbol', async () => {
		const output = await aiTools.getStockPrice.execute(
			{
				symbol: 'aapl',
			},
			{
				toolCallId: 'test-call-3',
				messages: [],
			}
		)

		expect(output).toEqual({
			symbol: 'AAPL',
			price: AAPL_STOCK_PRICE,
			currency: DEFAULT_STOCK_CURRENCY,
			changePercent: DEFAULT_STOCK_CHANGE_PERCENT,
		})
	})

	it('returns default price when symbol is unknown', async () => {
		const result = await aiTools.getStockPrice.execute(
			{
				symbol: 'unknown',
			},
			{
				toolCallId: 'test-call-4',
				messages: [],
			}
		)

		// Handle both direct result and AsyncIterable cases
		const output =
			Symbol.asyncIterator in result
				? await result[Symbol.asyncIterator]()
						.next()
						.then((r) => r.value)
				: result

		expect(output.price).toBe(DEFAULT_STOCK_PRICE)
	})
})
