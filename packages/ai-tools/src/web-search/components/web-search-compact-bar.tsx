import { cn } from "@folionote/ui/lib/utils"
import { memo } from "react"

import type { WebSearchCompactBarProps } from "../types"

const MAX_QUERY_DISPLAY_LENGTH = 60

export const WebSearchCompactBar = memo(
  ({
    query,
    resultCount,
    isLoading,
    onClick,
    className
  }: WebSearchCompactBarProps) => {
    const displayQuery =
      query.length > MAX_QUERY_DISPLAY_LENGTH
        ? `${query.slice(0, MAX_QUERY_DISPLAY_LENGTH)}…`
        : query

    return (
      <button
        className={cn(
          "group flex w-full cursor-pointer items-center gap-2.5 rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-left text-xs transition-all duration-200 hover:border-border/60 hover:bg-muted/50",
          isLoading && "animate-pulse",
          className
        )}
        onClick={onClick}
        type="button"
      >
        <div className="flex size-5 shrink-0 items-center justify-center rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400">
          <svg
            aria-hidden="true"
            className="size-3"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <circle cx={11} cy={11} r={8} />
            <path d="m21 21-4.35-4.35" strokeLinecap="round" />
          </svg>
        </div>

        <span className="min-w-0 flex-1 truncate text-muted-foreground">
          {displayQuery}
        </span>

        <span className="shrink-0 rounded-full bg-sky-500/10 px-2 py-0.5 font-medium text-sky-600 tabular-nums dark:text-sky-400">
          {resultCount}
        </span>

        <svg
          aria-hidden="true"
          className="size-3.5 shrink-0 text-muted-foreground/50 transition-transform duration-200 group-hover:translate-x-0.5"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
        >
          <path
            d="m9 18 6-6-6-6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    )
  }
)
