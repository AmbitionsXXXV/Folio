export const TEMPERATURE_UNITS = ['c', 'f'] as const

export type TemperatureUnit = (typeof TEMPERATURE_UNITS)[number]

// =============================================================================
// Tool Types
// =============================================================================

export type WeatherToolInput = {
	location: string
	unit?: TemperatureUnit
}

export type WeatherToolOutput = {
	location: string
	condition: string
	temperature: number
	unit: TemperatureUnit
	humidityPercent: number
	windKph: number
}

// =============================================================================
// UI Component Types
// =============================================================================

export type WeatherCardProps = {
	title: string
	location: string
	condition: string
	temperatureLabel: string
	temperatureValue: string
	humidityLabel: string
	humidityValue: string
	windLabel: string
	windValue: string
	className?: string
}
