import {
	AlphaVantageQuoteResponseSchema,
	AlphaVantageTimeSeriesResponseSchema,
} from '../schemas'
import type { StockDataPoint, StockPriceOutput, StockTrendOutput } from '../types'
import {
	ALPHA_VANTAGE_BASE_URL,
	DEFAULT_STOCK_CURRENCY,
	STOCK_API_KEY_ENV,
	STOCK_TREND_DAILY_POINT_LIMIT,
} from './constants'

const DATE_PART_PAD_LENGTH = 2
const MONTH_INDEX_OFFSET = 1
const EXAMPLE_TREND_START_DATE = '2026-01-01'
const EXAMPLE_TREND_END_DATE = '2026-01-15'

// =============================================================================
// Helpers
// =============================================================================

function getApiKey(): string {
	const key = process.env[STOCK_API_KEY_ENV]?.trim()
	if (!key) {
		throw new Error(`${STOCK_API_KEY_ENV} environment variable is required`)
	}
	return key
}

function normalizeSymbol(symbol: string): string {
	const normalized = symbol.trim().toUpperCase()
	if (normalized.length === 0) {
		throw new Error('Stock symbol is required')
	}
	return normalized
}

function parsePercent(value: string): number {
	const cleaned = value.replace('%', '')
	const parsed = Number.parseFloat(cleaned)
	if (!Number.isFinite(parsed)) {
		throw new Error('Invalid percentage value')
	}
	return parsed
}

function padDatePart(value: number): string {
	return String(value).padStart(DATE_PART_PAD_LENGTH, '0')
}

function getLocalDateString(date: Date): string {
	const year = date.getFullYear()
	const month = padDatePart(date.getMonth() + MONTH_INDEX_OFFSET)
	const day = padDatePart(date.getDate())
	return `${year}-${month}-${day}`
}

function assertStockTrendDateRangeNotInFuture(
	startDate: string,
	endDate: string,
	symbol: string
): void {
	const todayDateString = getLocalDateString(new Date())
	if (startDate <= todayDateString && endDate <= todayDateString) {
		return
	}

	const futureDate = endDate > todayDateString ? endDate : startDate
	throw new Error(
		`无法查询未来的日期数据（${futureDate} 是未来的日期）。股票价格数据只存在于过去和现在。如果您想查询 ${symbol} 的历史股价走势，请提供一个过去的日期范围，例如：${EXAMPLE_TREND_START_DATE} 到 ${EXAMPLE_TREND_END_DATE}。请告诉我您想查询的具体历史时间段，我会帮您获取 ${symbol} 的股价走势数据。`
	)
}

function getErrorMessage(payload: unknown): string | undefined {
	if (!payload || typeof payload !== 'object') return undefined
	const record = payload as Record<string, unknown>
	if (typeof record['Error Message'] === 'string') return record['Error Message']
	if (typeof record.Information === 'string') return record.Information
	if (typeof record.Note === 'string') return record.Note
	return undefined
}

// =============================================================================
// API Functions
// =============================================================================

export async function fetchStockPrice(
	symbol: string,
	abortSignal?: AbortSignal
): Promise<StockPriceOutput> {
	const apiKey = getApiKey()
	const normalizedSymbol = normalizeSymbol(symbol)

	const url = new URL(ALPHA_VANTAGE_BASE_URL)
	url.search = new URLSearchParams({
		function: 'GLOBAL_QUOTE',
		symbol: normalizedSymbol,
		apikey: apiKey,
	}).toString()

	const response = await fetch(url.toString(), { signal: abortSignal })
	const payload: unknown = await response.json()

	if (!response.ok) {
		throw new Error(`Stock API request failed (status ${response.status})`)
	}

	const errorMessage = getErrorMessage(payload)
	if (errorMessage) {
		throw new Error(errorMessage)
	}

	const data = AlphaVantageQuoteResponseSchema.parse(payload)
	const quote = data['Global Quote']
	const price = Number.parseFloat(quote['05. price'])

	if (!Number.isFinite(price)) {
		throw new Error('Invalid price value')
	}

	return {
		symbol: normalizedSymbol,
		price,
		currency: DEFAULT_STOCK_CURRENCY,
		changePercent: parsePercent(quote['10. change percent']),
	}
}

export async function fetchStockTrend(
	symbol: string,
	startDate: string,
	endDate: string,
	abortSignal?: AbortSignal
): Promise<StockTrendOutput> {
	const apiKey = getApiKey()
	const normalizedSymbol = normalizeSymbol(symbol)
	assertStockTrendDateRangeNotInFuture(startDate, endDate, normalizedSymbol)

	const url = new URL(ALPHA_VANTAGE_BASE_URL)
	url.search = new URLSearchParams({
		function: 'TIME_SERIES_DAILY',
		symbol: normalizedSymbol,
		outputsize: 'compact', // Free tier returns most recent daily window
		apikey: apiKey,
	}).toString()

	const response = await fetch(url.toString(), { signal: abortSignal })
	const payload: unknown = await response.json()

	if (!response.ok) {
		throw new Error(`Stock API request failed (status ${response.status})`)
	}

	const errorMessage = getErrorMessage(payload)
	if (errorMessage) {
		throw new Error(errorMessage)
	}

	const data = AlphaVantageTimeSeriesResponseSchema.parse(payload)
	const timeSeries = data['Time Series (Daily)']
	const availableDates = Object.keys(timeSeries).sort((a, b) => a.localeCompare(b))
	const earliestAvailableDate = availableDates[0]
	const latestAvailableDate = availableDates.at(-1)

	// Filter and sort data points within date range
	const dataPoints: StockDataPoint[] = Object.entries(timeSeries)
		.filter(([date]) => date >= startDate && date <= endDate)
		.sort(([a], [b]) => a.localeCompare(b))
		.map(([date, entry]) => ({
			date,
			open: Number.parseFloat(entry['1. open']),
			high: Number.parseFloat(entry['2. high']),
			low: Number.parseFloat(entry['3. low']),
			close: Number.parseFloat(entry['4. close']),
			volume: Number.parseInt(entry['5. volume'], 10),
		}))

	const firstPoint = dataPoints[0]
	const lastPoint = dataPoints.at(-1)

	if (!(firstPoint && lastPoint)) {
		if (earliestAvailableDate && latestAvailableDate) {
			const isOutsideAvailableRange =
				startDate < earliestAvailableDate || endDate > latestAvailableDate
			if (isOutsideAvailableRange) {
				throw new Error(
					`Requested range is outside the available window (${earliestAvailableDate} to ${latestAvailableDate}). The current Alpha Vantage plan returns the most recent ${STOCK_TREND_DAILY_POINT_LIMIT} daily data points.`
				)
			}
		}
		throw new Error(
			`No data available for ${normalizedSymbol} between ${startDate} and ${endDate}`
		)
	}

	// Calculate period change
	const firstClose = firstPoint.close
	const lastClose = lastPoint.close
	const periodChangePercent = ((lastClose - firstClose) / firstClose) * 100

	return {
		symbol: normalizedSymbol,
		currency: DEFAULT_STOCK_CURRENCY,
		startDate,
		endDate,
		dataPoints,
		periodChangePercent,
	}
}
