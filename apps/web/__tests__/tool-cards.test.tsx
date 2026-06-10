import { render, screen } from "@testing-library/react"
import type { UIMessage } from "ai"
import type { ReactElement } from "react"
import { I18nextProvider } from "react-i18next"
import { describe, expect, it } from "vite-plus/test"

import {
  StockToolCard,
  StockTrendToolCard,
  WeatherToolCard
} from "../src/features/knowledge/components/tool-cards"
import i18n from "../src/lib/i18n"

const WEATHER_TEMPERATURE = 22
const WEATHER_HUMIDITY_PERCENT = 55
const WEATHER_WIND_KPH = 14
const STOCK_PRICE = 123.45
const STOCK_CHANGE_PERCENT = 1.23
const STOCK_TREND_START_DATE = "2024-01-02"
const STOCK_TREND_END_DATE = "2024-01-03"
const STOCK_TREND_OPEN_DAY_ONE = 99
const STOCK_TREND_HIGH_DAY_ONE = 101
const STOCK_TREND_LOW_DAY_ONE = 98
const STOCK_TREND_CLOSE_DAY_ONE = 100
const STOCK_TREND_VOLUME_DAY_ONE = 1000

const STOCK_TREND_OPEN_DAY_TWO = 105
const STOCK_TREND_HIGH_DAY_TWO = 112
const STOCK_TREND_LOW_DAY_TWO = 104
const STOCK_TREND_CLOSE_DAY_TWO = 110
const STOCK_TREND_VOLUME_DAY_TWO = 2000

const STOCK_TREND_CHANGE_PERCENT =
  ((STOCK_TREND_CLOSE_DAY_TWO - STOCK_TREND_CLOSE_DAY_ONE) /
    STOCK_TREND_CLOSE_DAY_ONE) *
  100

const STOCK_PRICE_TEXT = STOCK_PRICE.toFixed(2)
const STOCK_CHANGE_TEXT = `+${STOCK_CHANGE_PERCENT.toFixed(2)}%`
const STOCK_PRICE_REGEX = new RegExp(STOCK_PRICE_TEXT.replace(".", "\\."))
const STOCK_CHANGE_REGEX = new RegExp(
  STOCK_CHANGE_TEXT.replace(".", "\\.").replace("+", "\\+")
)
const STOCK_TREND_PRICE_TEXT = STOCK_TREND_CLOSE_DAY_TWO.toFixed(2)
const STOCK_TREND_CHANGE_TEXT = `+${STOCK_TREND_CHANGE_PERCENT.toFixed(2)}%`
const STOCK_TREND_PRICE_REGEX = new RegExp(
  STOCK_TREND_PRICE_TEXT.replace(".", "\\.")
)
const STOCK_TREND_CHANGE_REGEX = new RegExp(
  STOCK_TREND_CHANGE_TEXT.replace(".", "\\.").replace("+", "\\+")
)

async function renderWithI18n(ui: ReactElement) {
  if (i18n.language !== "en") {
    await i18n.changeLanguage("en")
  }

  return render(<I18nextProvider i18n={i18n}>{ui}</I18nextProvider>)
}

describe("tool cards", () => {
  it("renders weather card values", async () => {
    const weatherPart = {
      type: "tool-displayWeather",
      state: "output-available",
      toolCallId: "tool-weather",
      input: {
        location: "Tokyo",
        unit: "c"
      },
      output: {
        location: "Tokyo",
        condition: "Partly cloudy",
        temperature: WEATHER_TEMPERATURE,
        unit: "c",
        humidityPercent: WEATHER_HUMIDITY_PERCENT,
        windKph: WEATHER_WIND_KPH
      }
    } satisfies UIMessage["parts"][number]

    await renderWithI18n(<WeatherToolCard part={weatherPart} />)

    expect(screen.getByText("Weather")).toBeTruthy()
    expect(screen.getByText("Tokyo")).toBeTruthy()
    expect(screen.getByText("Partly cloudy")).toBeTruthy()
    expect(screen.getByText(`${WEATHER_TEMPERATURE}°C`)).toBeTruthy()
    expect(screen.getByText(`${WEATHER_HUMIDITY_PERCENT}%`)).toBeTruthy()
    expect(screen.getByText(`${WEATHER_WIND_KPH} kph`)).toBeTruthy()
  })

  it("renders stock card values with formatted change", async () => {
    const stockPart = {
      type: "tool-getStockPrice",
      state: "output-available",
      toolCallId: "tool-stock",
      input: {
        symbol: "AAPL"
      },
      output: {
        symbol: "AAPL",
        price: STOCK_PRICE,
        currency: "USD",
        changePercent: STOCK_CHANGE_PERCENT
      }
    } satisfies UIMessage["parts"][number]

    await renderWithI18n(<StockToolCard part={stockPart} />)

    expect(screen.getByText("Stock")).toBeTruthy()
    expect(screen.getByText("AAPL")).toBeTruthy()
    expect(screen.getByText(STOCK_PRICE_REGEX)).toBeTruthy()
    expect(screen.getByText(STOCK_CHANGE_REGEX)).toBeTruthy()
  })

  it("renders stock trend card values", async () => {
    const stockTrendPart = {
      type: "tool-getStockTrend",
      state: "output-available",
      toolCallId: "tool-stock-trend",
      input: {
        symbol: "AAPL",
        startDate: STOCK_TREND_START_DATE,
        endDate: STOCK_TREND_END_DATE
      },
      output: {
        symbol: "AAPL",
        currency: "USD",
        startDate: STOCK_TREND_START_DATE,
        endDate: STOCK_TREND_END_DATE,
        dataPoints: [
          {
            date: STOCK_TREND_START_DATE,
            open: STOCK_TREND_OPEN_DAY_ONE,
            high: STOCK_TREND_HIGH_DAY_ONE,
            low: STOCK_TREND_LOW_DAY_ONE,
            close: STOCK_TREND_CLOSE_DAY_ONE,
            volume: STOCK_TREND_VOLUME_DAY_ONE
          },
          {
            date: STOCK_TREND_END_DATE,
            open: STOCK_TREND_OPEN_DAY_TWO,
            high: STOCK_TREND_HIGH_DAY_TWO,
            low: STOCK_TREND_LOW_DAY_TWO,
            close: STOCK_TREND_CLOSE_DAY_TWO,
            volume: STOCK_TREND_VOLUME_DAY_TWO
          }
        ],
        periodChangePercent: STOCK_TREND_CHANGE_PERCENT
      }
    } satisfies UIMessage["parts"][number]

    await renderWithI18n(<StockTrendToolCard part={stockTrendPart} />)

    expect(screen.getByText("Stock Trend")).toBeTruthy()
    expect(screen.getByText("AAPL")).toBeTruthy()
    expect(screen.getByText(STOCK_TREND_PRICE_REGEX)).toBeTruthy()
    expect(screen.getByText(STOCK_TREND_CHANGE_REGEX)).toBeTruthy()
  })
})
