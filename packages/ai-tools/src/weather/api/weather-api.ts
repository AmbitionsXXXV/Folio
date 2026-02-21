import { WeatherApiErrorSchema, WeatherApiResponseSchema } from '../schemas'
import type { TemperatureUnit, WeatherToolOutput } from '../types'
import {
	WEATHER_API_AQI,
	WEATHER_API_BASE_URL,
	WEATHER_API_KEY_ENV,
} from './constants'

// =============================================================================
// Helpers
// =============================================================================

function getApiKey(): string {
	const key = process.env[WEATHER_API_KEY_ENV]?.trim()
	if (!key) {
		throw new Error(`${WEATHER_API_KEY_ENV} environment variable is required`)
	}
	return key
}

function normalizeLocation(location: string): string {
	const normalized = location.trim()
	if (normalized.length === 0) {
		throw new Error('Location is required')
	}
	return normalized
}

function getWeatherApiErrorMessage(payload: unknown): string | undefined {
	const parsed = WeatherApiErrorSchema.safeParse(payload)
	return parsed.success ? parsed.data.error.message : undefined
}

// =============================================================================
// API Functions
// =============================================================================

export async function fetchWeatherOutput(
	location: string,
	unit: TemperatureUnit,
	abortSignal?: AbortSignal
): Promise<WeatherToolOutput> {
	const apiKey = getApiKey()
	const normalizedLocation = normalizeLocation(location)
	const url = new URL(WEATHER_API_BASE_URL)
	url.search = new URLSearchParams({
		key: apiKey,
		q: normalizedLocation,
		aqi: WEATHER_API_AQI,
	}).toString()

	const response = await fetch(url.toString(), { signal: abortSignal })
	const payload: unknown = await response.json()
	const errorMessage = getWeatherApiErrorMessage(payload)

	if (!response.ok) {
		const statusLabel = response.status ? ` (status ${response.status})` : ''
		throw new Error(errorMessage ?? `Weather API request failed${statusLabel}`)
	}

	if (errorMessage) {
		throw new Error(errorMessage)
	}

	const data = WeatherApiResponseSchema.parse(payload)
	const temperature = unit === 'f' ? data.current.temp_f : data.current.temp_c

	return {
		location: data.location.name,
		condition: data.current.condition.text,
		temperature,
		unit,
		humidityPercent: data.current.humidity,
		windKph: data.current.wind_kph,
	}
}
