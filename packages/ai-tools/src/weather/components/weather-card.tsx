import { cn } from "@folionote/ui/lib/utils"
import { memo, useMemo } from "react"

import type { WeatherCardProps } from "../types"

// 根据天气条件判断天气类型
function getWeatherType(
  condition: string
): "sunny" | "cloudy" | "rainy" | "snowy" | "stormy" {
  const lower = condition.toLowerCase()
  if (
    lower.includes("rain") ||
    lower.includes("雨") ||
    lower.includes("shower")
  ) {
    return "rainy"
  }
  if (lower.includes("snow") || lower.includes("雪")) {
    return "snowy"
  }
  if (
    lower.includes("storm") ||
    lower.includes("thunder") ||
    lower.includes("雷")
  ) {
    return "stormy"
  }
  if (
    lower.includes("cloud") ||
    lower.includes("overcast") ||
    lower.includes("阴") ||
    lower.includes("云")
  ) {
    return "cloudy"
  }
  return "sunny"
}

// 天气背景渐变配置
const weatherGradients = {
  sunny: "from-amber-400/20 via-orange-300/10 to-yellow-200/5",
  cloudy: "from-slate-400/20 via-gray-300/10 to-slate-200/5",
  rainy: "from-blue-500/20 via-slate-400/10 to-blue-300/5",
  snowy: "from-sky-200/30 via-blue-100/20 to-white/10",
  stormy: "from-slate-600/30 via-purple-500/10 to-slate-400/5"
}

const rainDropCount = 12
const rainDropLeftStart = 8
const rainDropLeftStep = 8
const rainDropDelayStep = 0.15
const rainDropDurationBase = 0.6
const rainDropDurationJitter = 0.3

const snowflakeCount = 15
const snowflakeLeftStart = 5
const snowflakeLeftStep = 6
const snowflakeDelayStep = 0.3
const snowflakeDurationBase = 2
const snowflakeDurationJitter = 2

const fullCircleDegrees = 360
const sunRayCount = 8
const sunRayRotationStep = fullCircleDegrees / sunRayCount

// 雨滴动画组件
function RainDrops() {
  const rainDrops = Array.from({ length: rainDropCount }, (_, dropIndex) => ({
    id: `rain-${dropIndex}`,
    left: `${rainDropLeftStart + dropIndex * rainDropLeftStep}%`,
    animationDelay: `${dropIndex * rainDropDelayStep}s`,
    animationDuration: `${
      rainDropDurationBase + Math.random() * rainDropDurationJitter
    }s`
  }))

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
      {rainDrops.map((drop) => (
        <div
          className="animate-rain absolute h-4 w-0.5 rounded-full bg-linear-to-b from-blue-400/60 to-transparent"
          key={drop.id}
          style={{
            left: drop.left,
            animationDelay: drop.animationDelay,
            animationDuration: drop.animationDuration
          }}
        />
      ))}
    </div>
  )
}

// 雪花动画组件
function Snowflakes() {
  const snowflakes = Array.from(
    { length: snowflakeCount },
    (_, flakeIndex) => ({
      id: `snow-${flakeIndex}`,
      left: `${snowflakeLeftStart + flakeIndex * snowflakeLeftStep}%`,
      animationDelay: `${flakeIndex * snowflakeDelayStep}s`,
      animationDuration: `${
        snowflakeDurationBase + Math.random() * snowflakeDurationJitter
      }s`
    })
  )

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
      {snowflakes.map((flake) => (
        <div
          className="animate-snow absolute h-1.5 w-1.5 rounded-full bg-white/70 shadow-sm"
          key={flake.id}
          style={{
            left: flake.left,
            animationDelay: flake.animationDelay,
            animationDuration: flake.animationDuration
          }}
        />
      ))}
    </div>
  )
}

// 太阳光芒组件
function SunRays() {
  const sunRays = Array.from({ length: sunRayCount }, (_, rayIndex) => ({
    id: `sun-ray-${rayIndex}`,
    rotation: rayIndex * sunRayRotationStep
  }))

  return (
    <div className="pointer-events-none absolute -top-4 -right-4">
      <div className="relative h-16 w-16">
        <div className="absolute inset-2 animate-pulse rounded-full bg-linear-to-br from-yellow-300/50 to-orange-300/30 blur-sm" />
        <div className="absolute inset-3 rounded-full bg-linear-to-br from-yellow-200/40 to-amber-200/20" />
        {sunRays.map((ray) => (
          <div
            className="animate-ray-spin absolute top-1/2 left-1/2 h-8 w-0.5 origin-bottom bg-linear-to-t from-yellow-300/40 to-transparent"
            key={ray.id}
            style={{
              transform: `translateX(-50%) rotate(${ray.rotation}deg)`
            }}
          />
        ))}
      </div>
    </div>
  )
}

// 云朵组件
function Clouds() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
      <div className="animate-cloud-drift absolute top-2 -right-2 h-6 w-12 rounded-full bg-linear-to-r from-slate-300/30 to-slate-200/20 blur-[2px]" />
      <div
        className="animate-cloud-drift absolute top-4 right-8 h-4 w-8 rounded-full bg-linear-to-r from-slate-300/20 to-slate-200/10 blur-[1px]"
        style={{ animationDelay: "1s" }}
      />
    </div>
  )
}

// 闪电组件
function Lightning() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-xl">
      <div className="animate-lightning absolute top-2 right-4 text-yellow-300/70">
        <svg
          aria-label="Lightning bolt"
          className="h-6 w-4"
          fill="currentColor"
          role="img"
          viewBox="0 0 16 24"
        >
          <title>Lightning</title>
          <path d="M9 0L0 14h6l-2 10 11-14H8l1-10z" />
        </svg>
      </div>
      <RainDrops />
    </div>
  )
}

export const WeatherCard = memo(
  ({
    title,
    location,
    condition,
    temperatureLabel,
    temperatureValue,
    humidityLabel,
    humidityValue,
    windLabel,
    windValue,
    className
  }: WeatherCardProps) => {
    const weatherType = useMemo(() => getWeatherType(condition), [condition])

    const WeatherEffect = useMemo(() => {
      switch (weatherType) {
        case "rainy":
          return RainDrops
        case "snowy":
          return Snowflakes
        case "sunny":
          return SunRays
        case "cloudy":
          return Clouds
        case "stormy":
          return Lightning
        default:
          return null
      }
    }, [weatherType])

    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-border/50 bg-linear-to-br p-4 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl",
          weatherGradients[weatherType],
          className
        )}
      >
        {/* 动态天气效果 */}
        {WeatherEffect && <WeatherEffect />}

        {/* 内容区域 */}
        <div className="relative z-10 grid gap-3 text-xs">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="font-semibold text-balance text-foreground">
                {title}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {location}
              </div>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 text-xs text-pretty text-muted-foreground">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-current opacity-60" />
            {condition}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2 rounded-lg bg-background/60 px-3 py-2 shadow-sm backdrop-blur-sm">
              <div className="text-[10px] tracking-wide text-muted-foreground uppercase">
                {temperatureLabel}
              </div>
              <div className="font-[tabular-nums] text-2xl font-bold text-foreground">
                {temperatureValue}
              </div>
            </div>
            <div className="rounded-lg bg-background/40 px-3 py-2 shadow-sm backdrop-blur-sm transition-colors hover:bg-background/60">
              <div className="text-xs tracking-wide text-muted-foreground uppercase">
                {humidityLabel}
              </div>
              <div className="font-[tabular-nums] font-semibold text-foreground">
                {humidityValue}
              </div>
            </div>
            <div className="rounded-lg bg-background/40 px-3 py-2 shadow-sm backdrop-blur-sm transition-colors hover:bg-background/60">
              <div className="text-[10px] tracking-wide text-muted-foreground uppercase">
                {windLabel}
              </div>
              <div className="font-[tabular-nums] font-semibold text-foreground">
                {windValue}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
)
