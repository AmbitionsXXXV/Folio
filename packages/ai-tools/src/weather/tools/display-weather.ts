import { createTool } from "@mastra/core/tools"
import type { z } from "zod"

import { fetchWeatherOutput } from "../api/weather-api"
import { WeatherToolInputSchema } from "../schemas"
import type { TemperatureUnit } from "../types"

const DEFAULT_TEMPERATURE_UNIT: TemperatureUnit = "c"

export const displayWeather = createTool({
  id: "displayWeather",
  description: "Display the weather for a location",
  strict: true,
  inputSchema: WeatherToolInputSchema,
  execute: async (
    { location, unit }: z.infer<typeof WeatherToolInputSchema>,
    context
  ) => {
    const resolvedUnit = unit ?? DEFAULT_TEMPERATURE_UNIT
    return await fetchWeatherOutput(
      location,
      resolvedUnit,
      context?.abortSignal
    )
  }
})
