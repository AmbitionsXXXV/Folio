/**
 * Tests for AI tools (weather, stock price, stock trend)
 *
 * These tests verify tool execution with mocked API responses.
 * Tools are defined using AI SDK's `tool()` function and can be
 * used with generateText/streamText for function calling.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { aiTools } from "../src/services/ai-tools"

// ============================================================================
// Test Constants
// ============================================================================

const WEATHER_API_KEY = "test-weather-key"
const STOCK_API_KEY = "test-stock-key"

// Weather test data
const WEATHER_TEST_DATA = {
  location: "Tokyo",
  condition: "Partly cloudy",
  tempC: 22,
  tempF: 72,
  humidity: 55,
  windKph: 14
} as const

// Stock test data
const STOCK_TEST_DATA = {
  aapl: {
    symbol: "AAPL",
    price: 192.5,
    changePercent: -1.23,
    changePercentText: "-1.23%",
    currency: "USD"
  },
  msft: {
    symbol: "MSFT",
    price: 418.2,
    changePercent: 0.8,
    changePercentText: "0.8%",
    currency: "USD"
  }
} as const

// Stock trend test data
const STOCK_TREND_TEST_DATA = {
  symbol: "AAPL",
  currency: "USD",
  startDate: "2024-01-02",
  endDate: "2024-01-03",
  dayOne: {
    date: "2024-01-02",
    open: 98,
    high: 102,
    low: 97,
    close: 100,
    volume: 123_456
  },
  dayTwo: {
    date: "2024-01-03",
    open: 108,
    high: 112,
    low: 107,
    close: 110,
    volume: 654_321
  },
  outsideRange: {
    date: "2024-01-01",
    open: 90,
    high: 95,
    low: 85,
    close: 92,
    volume: 99_999
  }
} as const

// Calculate expected change percent
const EXPECTED_PERIOD_CHANGE_PERCENT =
  ((STOCK_TREND_TEST_DATA.dayTwo.close - STOCK_TREND_TEST_DATA.dayOne.close) /
    STOCK_TREND_TEST_DATA.dayOne.close) *
  100

// ============================================================================
// Mock API Response Factories
// ============================================================================

function createWeatherApiResponse() {
  return {
    location: {
      name: WEATHER_TEST_DATA.location
    },
    current: {
      temp_c: WEATHER_TEST_DATA.tempC,
      temp_f: WEATHER_TEST_DATA.tempF,
      humidity: WEATHER_TEST_DATA.humidity,
      wind_kph: WEATHER_TEST_DATA.windKph,
      condition: {
        text: WEATHER_TEST_DATA.condition
      }
    }
  }
}

function createStockPriceApiResponse(
  data: typeof STOCK_TEST_DATA.aapl | typeof STOCK_TEST_DATA.msft
) {
  return {
    "Global Quote": {
      "01. symbol": data.symbol,
      "05. price": data.price.toString(),
      "10. change percent": data.changePercentText
    }
  }
}

function createStockTrendApiResponse() {
  const { symbol, dayOne, dayTwo, outsideRange } = STOCK_TREND_TEST_DATA
  return {
    "Meta Data": {
      "2. Symbol": symbol
    },
    "Time Series (Daily)": {
      [dayTwo.date]: {
        "1. open": dayTwo.open.toString(),
        "2. high": dayTwo.high.toString(),
        "3. low": dayTwo.low.toString(),
        "4. close": dayTwo.close.toString(),
        "5. volume": dayTwo.volume.toString()
      },
      [dayOne.date]: {
        "1. open": dayOne.open.toString(),
        "2. high": dayOne.high.toString(),
        "3. low": dayOne.low.toString(),
        "4. close": dayOne.close.toString(),
        "5. volume": dayOne.volume.toString()
      },
      [outsideRange.date]: {
        "1. open": outsideRange.open.toString(),
        "2. high": outsideRange.high.toString(),
        "3. low": outsideRange.low.toString(),
        "4. close": outsideRange.close.toString(),
        "5. volume": outsideRange.volume.toString()
      }
    }
  }
}

// ============================================================================
// Mock Fetch Helpers
// ============================================================================

interface MockFetchResponse {
  ok: boolean
  status: number
  statusText: string
  json: () => Promise<unknown>
}

function createMockFetchResponse(payload: unknown): MockFetchResponse {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => payload
  }
}

/**
 * Helper to resolve tool output that may be an async iterable
 */
function isAsyncIterable<T>(
  value: T | AsyncIterable<T>
): value is AsyncIterable<T> {
  return (
    typeof value === "object" && value !== null && Symbol.asyncIterator in value
  )
}

async function resolveToolOutput<T>(value: T | AsyncIterable<T>): Promise<T> {
  if (isAsyncIterable(value)) {
    const iterator = value[Symbol.asyncIterator]()
    const { value: nextValue } = await iterator.next()
    return nextValue as T
  }
  return value
}

/**
 * Create a mock tool context for testing
 */
function createToolContext(toolCallId = "test-call-1") {
  return {
    toolCallId,
    messages: []
  }
}

// ============================================================================
// Test Suites
// ============================================================================

describe("ai-tools", () => {
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

  describe("displayWeather tool", () => {
    it("returns weather output with normalized location", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(createMockFetchResponse(createWeatherApiResponse()))
      vi.stubGlobal("fetch", fetchMock)

      const result = await aiTools.displayWeather.execute(
        { location: "  Tokyo  ", unit: "c" },
        createToolContext("weather-1")
      )
      const output = await resolveToolOutput(result)

      expect(output).toEqual({
        location: WEATHER_TEST_DATA.location,
        condition: WEATHER_TEST_DATA.condition,
        temperature: WEATHER_TEST_DATA.tempC,
        unit: "c",
        humidityPercent: WEATHER_TEST_DATA.humidity,
        windKph: WEATHER_TEST_DATA.windKph
      })
    })

    it("returns temperature in Fahrenheit when requested", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(createMockFetchResponse(createWeatherApiResponse()))
      vi.stubGlobal("fetch", fetchMock)

      const result = await aiTools.displayWeather.execute(
        { location: "Seattle", unit: "f" },
        createToolContext("weather-2")
      )
      const output = await resolveToolOutput(result)

      expect(output.temperature).toBe(WEATHER_TEST_DATA.tempF)
      expect(output.unit).toBe("f")
    })

    it("defaults to Celsius when unit is not specified", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(createMockFetchResponse(createWeatherApiResponse()))
      vi.stubGlobal("fetch", fetchMock)

      const result = await aiTools.displayWeather.execute(
        { location: "Paris" },
        createToolContext("weather-3")
      )
      const output = await resolveToolOutput(result)

      expect(output.unit).toBe("c")
      expect(output.temperature).toBe(WEATHER_TEST_DATA.tempC)
    })
  })

  describe("getStockPrice tool", () => {
    it("returns stock output with normalized symbol", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          createMockFetchResponse(
            createStockPriceApiResponse(STOCK_TEST_DATA.aapl)
          )
        )
      vi.stubGlobal("fetch", fetchMock)

      const result = await aiTools.getStockPrice.execute(
        { symbol: "aapl" },
        createToolContext("stock-1")
      )
      const output = await resolveToolOutput(result)

      expect(output).toEqual({
        symbol: STOCK_TEST_DATA.aapl.symbol,
        price: STOCK_TEST_DATA.aapl.price,
        currency: STOCK_TEST_DATA.aapl.currency,
        changePercent: STOCK_TEST_DATA.aapl.changePercent
      })
    })

    it("parses positive change percent correctly", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          createMockFetchResponse(
            createStockPriceApiResponse(STOCK_TEST_DATA.msft)
          )
        )
      vi.stubGlobal("fetch", fetchMock)

      const result = await aiTools.getStockPrice.execute(
        { symbol: "  msft " },
        createToolContext("stock-2")
      )
      const output = await resolveToolOutput(result)

      expect(output.symbol).toBe(STOCK_TEST_DATA.msft.symbol)
      expect(output.price).toBe(STOCK_TEST_DATA.msft.price)
      expect(output.changePercent).toBe(STOCK_TEST_DATA.msft.changePercent)
    })

    it("handles uppercase and lowercase symbols", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          createMockFetchResponse(
            createStockPriceApiResponse(STOCK_TEST_DATA.aapl)
          )
        )
      vi.stubGlobal("fetch", fetchMock)

      const result = await aiTools.getStockPrice.execute(
        { symbol: "AaPl" },
        createToolContext("stock-3")
      )
      const output = await resolveToolOutput(result)

      expect(output.symbol).toBe(STOCK_TEST_DATA.aapl.symbol)
    })
  })

  describe("getStockTrend tool", () => {
    it("returns trend data for a date range", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          createMockFetchResponse(createStockTrendApiResponse())
        )
      vi.stubGlobal("fetch", fetchMock)

      const result = await aiTools.getStockTrend.execute(
        {
          symbol: STOCK_TREND_TEST_DATA.symbol,
          startDate: STOCK_TREND_TEST_DATA.startDate,
          endDate: STOCK_TREND_TEST_DATA.endDate
        },
        createToolContext("trend-1")
      )
      const output = await resolveToolOutput(result)

      expect(output.symbol).toBe(STOCK_TREND_TEST_DATA.symbol)
      expect(output.currency).toBe(STOCK_TREND_TEST_DATA.currency)
      expect(output.startDate).toBe(STOCK_TREND_TEST_DATA.startDate)
      expect(output.endDate).toBe(STOCK_TREND_TEST_DATA.endDate)
    })

    it("returns correct number of data points within range", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          createMockFetchResponse(createStockTrendApiResponse())
        )
      vi.stubGlobal("fetch", fetchMock)

      const result = await aiTools.getStockTrend.execute(
        {
          symbol: STOCK_TREND_TEST_DATA.symbol,
          startDate: STOCK_TREND_TEST_DATA.startDate,
          endDate: STOCK_TREND_TEST_DATA.endDate
        },
        createToolContext("trend-2")
      )
      const output = await resolveToolOutput(result)

      // Should only include dates within the range (2 days)
      expect(output.dataPoints).toHaveLength(2)
      expect(output.dataPoints[0]?.date).toBe(STOCK_TREND_TEST_DATA.dayOne.date)
      expect(output.dataPoints[1]?.date).toBe(STOCK_TREND_TEST_DATA.dayTwo.date)
    })

    it("calculates period change percent correctly", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          createMockFetchResponse(createStockTrendApiResponse())
        )
      vi.stubGlobal("fetch", fetchMock)

      const result = await aiTools.getStockTrend.execute(
        {
          symbol: STOCK_TREND_TEST_DATA.symbol,
          startDate: STOCK_TREND_TEST_DATA.startDate,
          endDate: STOCK_TREND_TEST_DATA.endDate
        },
        createToolContext("trend-3")
      )
      const output = await resolveToolOutput(result)

      expect(output.periodChangePercent).toBeCloseTo(
        EXPECTED_PERIOD_CHANGE_PERCENT,
        5
      )
    })

    it("excludes data points outside the date range", async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValue(
          createMockFetchResponse(createStockTrendApiResponse())
        )
      vi.stubGlobal("fetch", fetchMock)

      const result = await aiTools.getStockTrend.execute(
        {
          symbol: STOCK_TREND_TEST_DATA.symbol,
          startDate: STOCK_TREND_TEST_DATA.startDate,
          endDate: STOCK_TREND_TEST_DATA.endDate
        },
        createToolContext("trend-4")
      )
      const output = await resolveToolOutput(result)

      // Should not include the outside range date (2024-01-01)
      const dates = output.dataPoints.map((dp: { date: string }) => dp.date)
      expect(dates).not.toContain(STOCK_TREND_TEST_DATA.outsideRange.date)
    })
  })
})

describe("aiTools export", () => {
  it("exports all expected tools", () => {
    expect(aiTools).toHaveProperty("displayWeather")
    expect(aiTools).toHaveProperty("getStockPrice")
    expect(aiTools).toHaveProperty("getStockTrend")
  })

  it("tools have execute method", () => {
    expect(typeof aiTools.displayWeather.execute).toBe("function")
    expect(typeof aiTools.getStockPrice.execute).toBe("function")
    expect(typeof aiTools.getStockTrend.execute).toBe("function")
  })
})
