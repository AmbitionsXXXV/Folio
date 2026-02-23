import {
	StockCard,
	type StockChangeTone,
	type StockDataPoint,
	type StockPriceInput,
	type StockPriceOutput,
	StockTrendCard,
	type StockTrendInput,
	type StockTrendOutput,
	type TemperatureUnit,
	WeatherCard,
	type WeatherToolInput,
	type WeatherToolOutput,
	WebSearchCard,
	type WebSearchResult,
	type WebSearchToolOutput,
} from '@folionote/ai-tools'
import type { UIMessage } from 'ai'
import { memo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

// =============================================================================
// Constants
// =============================================================================

const TEMPERATURE_UNIT_LABELS: Record<TemperatureUnit, string> = {
	c: '°C',
	f: '°F',
}

const DEFAULT_TEMPERATURE_UNIT: TemperatureUnit = 'c'
const DEFAULT_CURRENCY_FALLBACK = 'USD'
const WIND_SPEED_UNIT = 'kph'
const PERCENT_DIVISOR = 100
const PERCENT_MIN_FRACTION_DIGITS = 2
const PERCENT_MAX_FRACTION_DIGITS = 2
const PRICE_MIN_FRACTION_DIGITS = 2
const PRICE_MAX_FRACTION_DIGITS = 2
const CHANGE_PERCENT_FLAT_THRESHOLD = 0
const DATE_RANGE_SEPARATOR = '–'
const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const DATE_PARSE_RADIX = 10
const MONTH_INDEX_OFFSET = 1
const MIN_MONTH = 1
const MAX_MONTH = 12
const MIN_DAY = 1
const MAX_DAY = 31
const DATE_RANGE_TIME_ZONE = 'UTC'

const dateRangeFormatter = new Intl.DateTimeFormat(undefined, {
	month: 'short',
	day: 'numeric',
	year: 'numeric',
	timeZone: DATE_RANGE_TIME_ZONE,
})

// =============================================================================
// Types
// =============================================================================

type UIMessagePart = NonNullable<UIMessage['parts']>[number]

// =============================================================================
// Type Guards
// =============================================================================

export function isDisplayWeatherPart(part: UIMessagePart): boolean {
	return part.type === 'tool-displayWeather'
}

export function isStockPricePart(part: UIMessagePart): boolean {
	return part.type === 'tool-getStockPrice'
}

export function isStockTrendPart(part: UIMessagePart): boolean {
	return part.type === 'tool-getStockTrend'
}

export function isWebSearchPart(part: UIMessagePart): boolean {
	return part.type === 'tool-webSearch'
}

// =============================================================================
// Parsing Helpers
// =============================================================================

function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseWeatherInput(value: unknown): WeatherToolInput | null {
	if (!isRecord(value)) return null
	const location = typeof value.location === 'string' ? value.location : null
	const unit =
		value.unit && typeof value.unit === 'string'
			? (value.unit as TemperatureUnit)
			: undefined
	if (!location) return null
	return { location, unit }
}

function parseWeatherOutput(value: unknown): WeatherToolOutput | null {
	if (!isRecord(value)) return null
	const location = typeof value.location === 'string' ? value.location : null
	const condition = typeof value.condition === 'string' ? value.condition : null
	const temperature =
		typeof value.temperature === 'number' ? value.temperature : null
	const unit =
		typeof value.unit === 'string' ? (value.unit as TemperatureUnit) : null
	const humidityPercent =
		typeof value.humidityPercent === 'number' ? value.humidityPercent : null
	const windKph = typeof value.windKph === 'number' ? value.windKph : null

	if (
		!(location && condition) ||
		temperature === null ||
		!unit ||
		humidityPercent === null ||
		windKph === null
	) {
		return null
	}

	return {
		location,
		condition,
		temperature,
		unit,
		humidityPercent,
		windKph,
	}
}

function parseStockInput(value: unknown): StockPriceInput | null {
	if (!isRecord(value)) return null
	const symbol = typeof value.symbol === 'string' ? value.symbol : null
	if (!symbol) return null
	return { symbol }
}

function parseStockOutput(value: unknown): StockPriceOutput | null {
	if (!isRecord(value)) return null
	const symbol = typeof value.symbol === 'string' ? value.symbol : null
	const price = typeof value.price === 'number' ? value.price : null
	const currency = typeof value.currency === 'string' ? value.currency : null
	const changePercent =
		typeof value.changePercent === 'number' ? value.changePercent : null

	if (!symbol || price === null || !currency || changePercent === null) {
		return null
	}

	return {
		symbol,
		price,
		currency,
		changePercent,
	}
}

function parseStockTrendInput(value: unknown): StockTrendInput | null {
	if (!isRecord(value)) return null
	const symbol = typeof value.symbol === 'string' ? value.symbol : null
	const startDate = typeof value.startDate === 'string' ? value.startDate : null
	const endDate = typeof value.endDate === 'string' ? value.endDate : null
	if (!(symbol && startDate && endDate)) return null
	return { symbol, startDate, endDate }
}

function parseStockDataPoint(value: unknown): StockDataPoint | null {
	if (!isRecord(value)) return null
	const date = typeof value.date === 'string' ? value.date : null
	const open = typeof value.open === 'number' ? value.open : null
	const high = typeof value.high === 'number' ? value.high : null
	const low = typeof value.low === 'number' ? value.low : null
	const close = typeof value.close === 'number' ? value.close : null
	const volume = typeof value.volume === 'number' ? value.volume : null

	if (
		!date ||
		open === null ||
		high === null ||
		low === null ||
		close === null ||
		volume === null
	) {
		return null
	}

	return {
		date,
		open,
		high,
		low,
		close,
		volume,
	}
}

function parseStockTrendOutput(value: unknown): StockTrendOutput | null {
	if (!isRecord(value)) return null
	const symbol = typeof value.symbol === 'string' ? value.symbol : null
	const currency = typeof value.currency === 'string' ? value.currency : null
	const startDate = typeof value.startDate === 'string' ? value.startDate : null
	const endDate = typeof value.endDate === 'string' ? value.endDate : null
	const periodChangePercent =
		typeof value.periodChangePercent === 'number' ? value.periodChangePercent : null
	const dataPointsRaw = Array.isArray(value.dataPoints) ? value.dataPoints : null
	const parsedDataPoints = dataPointsRaw
		? dataPointsRaw.map(parseStockDataPoint)
		: null
	const dataPoints = parsedDataPoints
		? parsedDataPoints.filter((point): point is StockDataPoint => point !== null)
		: null

	if (
		[symbol, currency, startDate, endDate].some((value) => !value) ||
		periodChangePercent === null ||
		!dataPoints ||
		dataPoints.length === 0 ||
		parsedDataPoints?.length !== dataPoints.length
	) {
		return null
	}

	// At this point, we've validated all values are non-null
	const validSymbol = symbol as string
	const validCurrency = currency as string
	const validStartDate = startDate as string
	const validEndDate = endDate as string
	const validDataPoints = dataPoints as StockDataPoint[]

	return {
		symbol: validSymbol,
		currency: validCurrency,
		startDate: validStartDate,
		endDate: validEndDate,
		periodChangePercent,
		dataPoints: validDataPoints,
	}
}

// =============================================================================
// Formatting Helpers
// =============================================================================

const percentFormatter = new Intl.NumberFormat(undefined, {
	style: 'percent',
	minimumFractionDigits: PERCENT_MIN_FRACTION_DIGITS,
	maximumFractionDigits: PERCENT_MAX_FRACTION_DIGITS,
})

const currencyFormatterCache = new Map<string, Intl.NumberFormat>()

function getCurrencyFormatter(currency: string): Intl.NumberFormat {
	const normalizedCurrency = currency.trim() || DEFAULT_CURRENCY_FALLBACK
	const cached = currencyFormatterCache.get(normalizedCurrency)
	if (cached) return cached

	const formatter = new Intl.NumberFormat(undefined, {
		style: 'currency',
		currency: normalizedCurrency,
		minimumFractionDigits: PRICE_MIN_FRACTION_DIGITS,
		maximumFractionDigits: PRICE_MAX_FRACTION_DIGITS,
	})
	currencyFormatterCache.set(normalizedCurrency, formatter)
	return formatter
}

function formatCurrency(amount: number, currency: string): string {
	if (!Number.isFinite(amount)) return '--'
	try {
		return getCurrencyFormatter(currency).format(amount)
	} catch {
		return `${currency} ${amount.toFixed(PRICE_MAX_FRACTION_DIGITS)}`
	}
}

function formatPercent(value: number): string {
	if (!Number.isFinite(value)) return '--'
	return percentFormatter.format(value / PERCENT_DIVISOR)
}

function parseIsoDate(value: string): Date | null {
	const match = ISO_DATE_PATTERN.exec(value)
	if (!match) return null

	const [, yearText, monthText, dayText] = match
	if (!(yearText && monthText && dayText)) {
		return null
	}

	const year = Number.parseInt(yearText, DATE_PARSE_RADIX)
	const month = Number.parseInt(monthText, DATE_PARSE_RADIX)
	const day = Number.parseInt(dayText, DATE_PARSE_RADIX)

	if (
		[year, month, day].some((value) => !Number.isFinite(value)) ||
		month < MIN_MONTH ||
		month > MAX_MONTH ||
		day < MIN_DAY ||
		day > MAX_DAY
	) {
		return null
	}

	return new Date(Date.UTC(year, month - MONTH_INDEX_OFFSET, day))
}

function formatDateRange(startDate: string, endDate: string): string {
	const start = parseIsoDate(startDate)
	const end = parseIsoDate(endDate)
	if (!(start && end)) {
		return `${startDate} ${DATE_RANGE_SEPARATOR} ${endDate}`
	}

	return `${dateRangeFormatter.format(start)} ${DATE_RANGE_SEPARATOR} ${dateRangeFormatter.format(end)}`
}

// =============================================================================
// Shared UI
// =============================================================================

type ToolCardContainerProps = {
	children: ReactNode
	className?: string
}

const ToolCardContainer = memo(function ToolCardContainer({
	children,
	className,
}: ToolCardContainerProps) {
	return (
		<div
			className={cn(
				// 'rounded-lg border bg-background/60 p-3 text-sm shadow-sm',
				className
			)}
		>
			{children}
		</div>
	)
})

// =============================================================================
// Weather Tool Card
// =============================================================================

type WeatherToolCardProps = {
	part: UIMessagePart
}

export const WeatherToolCard = memo(function WeatherToolCard({
	part,
}: WeatherToolCardProps) {
	const { t } = useTranslation()
	if (part.type !== 'tool-displayWeather') return null
	if (!('state' in part)) return null
	const state = typeof part.state === 'string' ? part.state : null
	if (!state) return null
	const input = 'input' in part ? part.input : undefined
	const outputValue = 'output' in part ? part.output : undefined
	const errorText =
		'errorText' in part && typeof part.errorText === 'string'
			? part.errorText
			: undefined

	if (state === 'input-available') {
		const parsedInput = parseWeatherInput(input)
		return (
			<ToolCardContainer>
				<div className="font-medium">{t('knowledge.toolCards.weather.title')}</div>
				<div className="mt-1 text-muted-foreground text-xs">
					{t('knowledge.toolCards.weather.loading', {
						location: parsedInput?.location ?? '',
					})}
				</div>
			</ToolCardContainer>
		)
	}

	if (state === 'output-error') {
		return (
			<ToolCardContainer>
				<div className="font-medium text-destructive">
					{t('knowledge.toolCards.weather.errorTitle')}
				</div>
				<div className="mt-1 text-muted-foreground text-xs">
					{errorText || t('knowledge.toolCards.weather.errorFallback')}
				</div>
			</ToolCardContainer>
		)
	}

	if (state !== 'output-available') return null

	const output = parseWeatherOutput(outputValue)
	if (!output) {
		return (
			<ToolCardContainer>
				<div className="font-medium text-destructive">
					{t('knowledge.toolCards.weather.errorTitle')}
				</div>
				<div className="mt-1 text-muted-foreground text-xs">
					{t('knowledge.toolCards.weather.errorFallback')}
				</div>
			</ToolCardContainer>
		)
	}

	const unitLabel =
		TEMPERATURE_UNIT_LABELS[output.unit] ??
		TEMPERATURE_UNIT_LABELS[DEFAULT_TEMPERATURE_UNIT]
	const temperatureValue = `${output.temperature}${unitLabel}`
	const humidityValue = `${output.humidityPercent}%`
	const windValue = `${output.windKph} ${WIND_SPEED_UNIT}`

	return (
		<ToolCardContainer>
			<WeatherCard
				condition={output.condition}
				humidityLabel={t('knowledge.toolCards.weather.humidity')}
				humidityValue={humidityValue}
				location={output.location}
				temperatureLabel={t('knowledge.toolCards.weather.temperature')}
				temperatureValue={temperatureValue}
				title={t('knowledge.toolCards.weather.title')}
				windLabel={t('knowledge.toolCards.weather.wind')}
				windValue={windValue}
			/>
		</ToolCardContainer>
	)
})

// =============================================================================
// Stock Tool Card
// =============================================================================

type StockToolCardProps = {
	part: UIMessagePart
}

export const StockToolCard = memo(function StockToolCard({
	part,
}: StockToolCardProps) {
	const { t } = useTranslation()
	if (part.type !== 'tool-getStockPrice') return null
	if (!('state' in part)) return null
	const state = typeof part.state === 'string' ? part.state : null
	if (!state) return null
	const input = 'input' in part ? part.input : undefined
	const outputValue = 'output' in part ? part.output : undefined
	const errorText =
		'errorText' in part && typeof part.errorText === 'string'
			? part.errorText
			: undefined

	if (state === 'input-available') {
		const parsedInput = parseStockInput(input)
		return (
			<ToolCardContainer>
				<div className="font-medium">{t('knowledge.toolCards.stock.title')}</div>
				<div className="mt-1 text-muted-foreground text-xs">
					{t('knowledge.toolCards.stock.loading', {
						symbol: parsedInput?.symbol ?? '',
					})}
				</div>
			</ToolCardContainer>
		)
	}

	if (state === 'output-error') {
		return (
			<ToolCardContainer>
				<div className="font-medium text-destructive">
					{t('knowledge.toolCards.stock.errorTitle')}
				</div>
				<div className="mt-1 text-muted-foreground text-xs">
					{errorText || t('knowledge.toolCards.stock.errorFallback')}
				</div>
			</ToolCardContainer>
		)
	}

	if (state !== 'output-available') return null

	const output = parseStockOutput(outputValue)
	if (!output) {
		return (
			<ToolCardContainer>
				<div className="font-medium text-destructive">
					{t('knowledge.toolCards.stock.errorTitle')}
				</div>
				<div className="mt-1 text-muted-foreground text-xs">
					{t('knowledge.toolCards.stock.errorFallback')}
				</div>
			</ToolCardContainer>
		)
	}

	const formattedPrice = formatCurrency(output.price, output.currency)
	const formattedChange = formatPercent(output.changePercent)
	let changeTone: StockChangeTone = 'flat'
	if (output.changePercent > CHANGE_PERCENT_FLAT_THRESHOLD) {
		changeTone = 'up'
	} else if (output.changePercent < CHANGE_PERCENT_FLAT_THRESHOLD) {
		changeTone = 'down'
	}
	const changePrefix = changeTone === 'up' ? '+' : ''
	const changeValue = `${changePrefix}${formattedChange}`

	return (
		<ToolCardContainer>
			<StockCard
				changeLabel={t('knowledge.toolCards.stock.change')}
				changeTone={changeTone}
				changeValue={changeValue}
				priceLabel={t('knowledge.toolCards.stock.price')}
				priceValue={formattedPrice}
				symbol={output.symbol}
				title={t('knowledge.toolCards.stock.title')}
			/>
		</ToolCardContainer>
	)
})

// =============================================================================
// Stock Trend Tool Card
// =============================================================================

type StockTrendToolCardProps = {
	part: UIMessagePart
}

export const StockTrendToolCard = memo(function StockTrendToolCard({
	part,
}: StockTrendToolCardProps) {
	const { t } = useTranslation()
	if (part.type !== 'tool-getStockTrend') return null
	if (!('state' in part)) return null
	const state = typeof part.state === 'string' ? part.state : null
	if (!state) return null
	const input = 'input' in part ? part.input : undefined
	const outputValue = 'output' in part ? part.output : undefined
	const errorText =
		'errorText' in part && typeof part.errorText === 'string'
			? part.errorText
			: undefined

	if (state === 'input-available') {
		const parsedInput = parseStockTrendInput(input)
		return (
			<ToolCardContainer>
				<div className="font-medium">
					{t('knowledge.toolCards.stockTrend.title')}
				</div>
				<div className="mt-1 text-muted-foreground text-xs">
					{t('knowledge.toolCards.stockTrend.loading', {
						symbol: parsedInput?.symbol ?? '',
					})}
				</div>
			</ToolCardContainer>
		)
	}

	if (state === 'output-error') {
		return (
			<ToolCardContainer>
				<div className="font-medium text-destructive">
					{t('knowledge.toolCards.stockTrend.errorTitle')}
				</div>
				<div className="mt-1 text-muted-foreground text-xs">
					{errorText || t('knowledge.toolCards.stockTrend.errorFallback')}
				</div>
			</ToolCardContainer>
		)
	}

	if (state !== 'output-available') return null

	const output = parseStockTrendOutput(outputValue)
	const lastPoint = output?.dataPoints.at(-1)
	if (!(output && lastPoint)) {
		return (
			<ToolCardContainer>
				<div className="font-medium text-destructive">
					{t('knowledge.toolCards.stockTrend.errorTitle')}
				</div>
				<div className="mt-1 text-muted-foreground text-xs">
					{t('knowledge.toolCards.stockTrend.errorFallback')}
				</div>
			</ToolCardContainer>
		)
	}

	const formattedPrice = formatCurrency(lastPoint.close, output.currency)
	const formattedChange = formatPercent(output.periodChangePercent)
	let changeTone: StockChangeTone = 'flat'
	if (output.periodChangePercent > CHANGE_PERCENT_FLAT_THRESHOLD) {
		changeTone = 'up'
	} else if (output.periodChangePercent < CHANGE_PERCENT_FLAT_THRESHOLD) {
		changeTone = 'down'
	}
	const changePrefix = changeTone === 'up' ? '+' : ''
	const changeValue = `${changePrefix}${formattedChange}`
	const dateRange = formatDateRange(output.startDate, output.endDate)

	return (
		<ToolCardContainer>
			<StockTrendCard
				changeTone={changeTone}
				currentPrice={formattedPrice}
				dataPoints={output.dataPoints}
				dateRange={dateRange}
				periodChange={changeValue}
				symbol={output.symbol}
				title={t('knowledge.toolCards.stockTrend.title')}
			/>
		</ToolCardContainer>
	)
})

// =============================================================================
// Web Search Tool Card
// =============================================================================

function parseWebSearchOutput(value: unknown): WebSearchToolOutput | null {
	if (!isRecord(value)) return null
	const query = typeof value.query === 'string' ? value.query : null
	const resultsRaw = Array.isArray(value.results) ? value.results : null
	if (!(query && resultsRaw)) return null

	const results: WebSearchResult[] = []
	for (const item of resultsRaw) {
		if (!isRecord(item)) continue
		const title = typeof item.title === 'string' ? item.title : null
		const url = typeof item.url === 'string' ? item.url : null
		const snippet = typeof item.snippet === 'string' ? item.snippet : ''
		const content = typeof item.content === 'string' ? item.content : undefined
		if (title && url) {
			results.push({ title, url, snippet, content })
		}
	}

	return { query, results }
}

type WebSearchToolCardProps = {
	part: UIMessagePart
}

export const WebSearchToolCard = memo(function WebSearchToolCard({
	part,
}: WebSearchToolCardProps) {
	const { t } = useTranslation()
	if (part.type !== 'tool-webSearch') return null
	if (!('state' in part)) return null
	const state = typeof part.state === 'string' ? part.state : null
	if (!state) return null
	const input = 'input' in part ? part.input : undefined
	const outputValue = 'output' in part ? part.output : undefined
	const errorText =
		'errorText' in part && typeof part.errorText === 'string'
			? part.errorText
			: undefined

	if (state === 'input-available') {
		const query =
			isRecord(input) && typeof input.query === 'string' ? input.query : ''
		return (
			<ToolCardContainer>
				<div className="font-medium">{t('knowledge.toolCards.webSearch.title')}</div>
				<div className="mt-1 text-muted-foreground text-xs">
					{t('knowledge.toolCards.webSearch.loading', { query })}
				</div>
			</ToolCardContainer>
		)
	}

	if (state === 'output-error') {
		return (
			<ToolCardContainer>
				<div className="font-medium text-destructive">
					{t('knowledge.toolCards.webSearch.errorTitle')}
				</div>
				<div className="mt-1 text-muted-foreground text-xs">
					{errorText || t('knowledge.toolCards.webSearch.errorFallback')}
				</div>
			</ToolCardContainer>
		)
	}

	if (state !== 'output-available') return null

	const output = parseWebSearchOutput(outputValue)
	if (!output) {
		return (
			<ToolCardContainer>
				<div className="font-medium text-destructive">
					{t('knowledge.toolCards.webSearch.errorTitle')}
				</div>
				<div className="mt-1 text-muted-foreground text-xs">
					{t('knowledge.toolCards.webSearch.errorFallback')}
				</div>
			</ToolCardContainer>
		)
	}

	return (
		<ToolCardContainer>
			<WebSearchCard query={output.query} results={output.results} />
		</ToolCardContainer>
	)
})
