import type { UIMessage } from 'ai'
import { memo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'

// =============================================================================
// Constants
// =============================================================================

const TEMPERATURE_UNIT_LABELS = {
	c: '°C',
	f: '°F',
} as const

const DEFAULT_TEMPERATURE_UNIT = 'c'
const DEFAULT_CURRENCY_FALLBACK = 'USD'
const PERCENT_DIVISOR = 100
const PERCENT_MIN_FRACTION_DIGITS = 2
const PERCENT_MAX_FRACTION_DIGITS = 2
const PRICE_MIN_FRACTION_DIGITS = 2
const PRICE_MAX_FRACTION_DIGITS = 2

// =============================================================================
// Types
// =============================================================================

type UIMessagePart = NonNullable<UIMessage['parts']>[number]

type TemperatureUnit = keyof typeof TEMPERATURE_UNIT_LABELS

type WeatherToolInput = {
	location: string
	unit?: TemperatureUnit
}

type WeatherToolOutput = {
	location: string
	condition: string
	temperature: number
	unit: TemperatureUnit
	humidityPercent: number
	windKph: number
}

type StockToolInput = {
	symbol: string
}

type StockToolOutput = {
	symbol: string
	price: number
	currency: string
	changePercent: number
}

// =============================================================================
// Type Guards
// =============================================================================

export function isDisplayWeatherPart(part: UIMessagePart): boolean {
	return part.type === 'tool-displayWeather'
}

export function isStockPricePart(part: UIMessagePart): boolean {
	return part.type === 'tool-getStockPrice'
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

function parseStockInput(value: unknown): StockToolInput | null {
	if (!isRecord(value)) return null
	const symbol = typeof value.symbol === 'string' ? value.symbol : null
	if (!symbol) return null
	return { symbol }
}

function parseStockOutput(value: unknown): StockToolOutput | null {
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
				'rounded-lg border bg-background/60 p-3 text-sm shadow-sm',
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

	return (
		<ToolCardContainer>
			<div className="flex items-center justify-between gap-2">
				<div className="font-medium">{t('knowledge.toolCards.weather.title')}</div>
				<div className="text-muted-foreground text-xs">{output.location}</div>
			</div>
			<div className="mt-2 text-muted-foreground text-xs">{output.condition}</div>
			<div className="mt-3 grid grid-cols-2 gap-2 text-xs">
				<div className="font-[tabular-nums]">
					<span className="text-muted-foreground">
						{t('knowledge.toolCards.weather.temperature')}
					</span>
					<span className="ml-2 font-medium text-foreground">
						{output.temperature}
						{unitLabel}
					</span>
				</div>
				<div className="font-[tabular-nums]">
					<span className="text-muted-foreground">
						{t('knowledge.toolCards.weather.humidity')}
					</span>
					<span className="ml-2 font-medium text-foreground">
						{output.humidityPercent}%
					</span>
				</div>
				<div className="font-[tabular-nums]">
					<span className="text-muted-foreground">
						{t('knowledge.toolCards.weather.wind')}
					</span>
					<span className="ml-2 font-medium text-foreground">
						{output.windKph} kph
					</span>
				</div>
			</div>
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
	const changePrefix = output.changePercent > 0 ? '+' : ''

	return (
		<ToolCardContainer>
			<div className="flex items-center justify-between gap-2">
				<div className="font-medium">{t('knowledge.toolCards.stock.title')}</div>
				<div className="text-muted-foreground text-xs">{output.symbol}</div>
			</div>
			<div className="mt-3 grid grid-cols-2 gap-2 text-xs">
				<div className="font-[tabular-nums]">
					<span className="text-muted-foreground">
						{t('knowledge.toolCards.stock.price')}
					</span>
					<span className="ml-2 font-medium text-foreground">{formattedPrice}</span>
				</div>
				<div className="font-[tabular-nums]">
					<span className="text-muted-foreground">
						{t('knowledge.toolCards.stock.change')}
					</span>
					<span className="ml-2 font-medium text-foreground">
						{changePrefix}
						{formattedChange}
					</span>
				</div>
			</div>
		</ToolCardContainer>
	)
})
