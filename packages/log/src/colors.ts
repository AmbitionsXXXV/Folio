import type { LogLevel } from "./types"

/**
 * ANSI color codes for terminal output
 */
const COLORS = {
  reset: "\u001b[0m",
  dim: "\x1B[2m",
  bold: "\x1B[1m",

  // Foreground colors
  gray: "\x1B[90m",
  cyan: "\x1B[36m",
  yellow: "\x1B[33m",
  red: "\u001b[31m",
  green: "\u001b[32m",
  blue: "\u001b[34m",
  magenta: "\u001b[35m",

  // Background colors
  bgRed: "\u001b[41m",
  bgYellow: "\x1B[43m",
  bgBlue: "\x1B[44m",
  bgCyan: "\x1B[46m"
} as const

/**
 * Check if the current environment supports ANSI colors
 */
export function supportsColor(): boolean {
  // Node.js environment with TTY
  if (
    typeof process !== "undefined" &&
    process.stdout?.isTTY &&
    !process.env.NO_COLOR
  ) {
    return true
  }
  return false
}

/**
 * Check if running in a browser environment
 */
export function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined"
}

/**
 * Check if running in Node.js environment
 */
export function isNode(): boolean {
  return (
    typeof process !== "undefined" &&
    process.versions != null &&
    process.versions.node != null
  )
}

/**
 * Wrap text with ANSI color codes
 */
function colorize(text: string, color: keyof typeof COLORS): string {
  return `${COLORS[color]}${text}${COLORS.reset}`
}

/**
 * Color configuration for each log level
 */
const LEVEL_COLORS: Record<LogLevel, keyof typeof COLORS> = {
  debug: "gray",
  info: "cyan",
  warn: "yellow",
  error: "red"
}

/**
 * Icons for each log level
 */
const LEVEL_ICONS: Record<LogLevel, string> = {
  debug: "●",
  info: "ℹ",
  warn: "⚠",
  error: "✖"
}

/**
 * Format log level badge with color
 */
export function formatLevel(level: LogLevel, useColors: boolean): string {
  const icon = LEVEL_ICONS[level]
  const label = level.padEnd(5)

  if (useColors) {
    const color = LEVEL_COLORS[level]
    return `${colorize(icon, color)} ${colorize(label, color)}`
  }

  return `${icon} ${label}`
}

/**
 * Format timestamp with optional colors
 */
export function formatTimestamp(useColors: boolean): string {
  const now = new Date()
  const time = now.toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  })

  if (useColors) {
    return colorize(`[${time}]`, "dim")
  }

  return `[${time}]`
}

/**
 * Format prefix with optional colors
 */
export function formatPrefix(prefix: string, useColors: boolean): string {
  if (useColors) {
    return colorize(`[${prefix}]`, "blue")
  }
  return `[${prefix}]`
}
