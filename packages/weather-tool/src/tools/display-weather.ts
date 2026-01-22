import { tool } from 'ai'
import { fetchWeatherOutput } from '../api/weather-api'
import { WeatherToolInputSchema } from '../schemas'
import type { TemperatureUnit } from '../types'

const DEFAULT_TEMPERATURE_UNIT: TemperatureUnit = 'c'

export const displayWeather = tool({
	description: 'Display the weather for a location',
	strict: true,
	inputSchema: WeatherToolInputSchema,
	execute: async ({ location, unit }, { abortSignal }) => {
		const resolvedUnit = unit ?? DEFAULT_TEMPERATURE_UNIT
		return await fetchWeatherOutput(location, resolvedUnit, abortSignal)
	},
})
