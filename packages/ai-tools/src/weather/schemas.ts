import { z } from "zod"

import { TEMPERATURE_UNITS } from "./types"

// =============================================================================
// Tool Input Schemas
// =============================================================================

export const WeatherToolInputSchema = z.object({
  location: z.string().trim().min(1).describe('Location name, e.g. "Beijing"'),
  unit: z.enum(TEMPERATURE_UNITS).optional().describe("c or f")
})

// =============================================================================
// Weather API Response Schemas
// =============================================================================

export const WeatherApiResponseSchema = z.object({
  location: z.object({
    name: z.string()
  }),
  current: z.object({
    temp_c: z.coerce.number(),
    temp_f: z.coerce.number(),
    humidity: z.coerce.number(),
    wind_kph: z.coerce.number(),
    condition: z.object({
      text: z.string()
    })
  })
})

export const WeatherApiErrorSchema = z.object({
  error: z.object({
    message: z.string()
  })
})
