import { cn } from "@folionote/ui/lib/utils"
import { memo } from "react"

import type { WebSearchCardProps } from "../types"

const MAX_SNIPPET_LENGTH = 200

export const WebSearchCard = memo(
  ({ query, results, className }: WebSearchCardProps) => {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-border/50 bg-linear-to-br from-sky-400/10 via-blue-300/5 to-indigo-200/5 p-4 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl",
          className
        )}
      >
        <div className="relative z-10 grid gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-md bg-sky-500/15 text-sky-600 dark:text-sky-400">
              <svg
                aria-hidden="true"
                className="size-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <circle cx={11} cy={11} r={8} />
                <path d="m21 21-4.35-4.35" strokeLinecap="round" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="truncate font-semibold text-foreground">
                Web Search
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {query}
              </div>
            </div>
          </div>

          <div className="grid gap-2">
            {results.map((result) => (
              <a
                className="group block rounded-lg bg-background/60 px-3 py-2 shadow-sm backdrop-blur-sm transition-colors hover:bg-background/80"
                href={result.url}
                key={result.url}
                rel="noopener noreferrer"
                target="_blank"
              >
                <div className="truncate text-xs font-medium text-foreground group-hover:text-primary">
                  {result.title}
                </div>
                <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground/70">
                  {new URL(result.url).hostname}
                </div>
                {result.snippet ? (
                  <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {result.snippet.length > MAX_SNIPPET_LENGTH
                      ? `${result.snippet.slice(0, MAX_SNIPPET_LENGTH)}...`
                      : result.snippet}
                  </div>
                ) : null}
              </a>
            ))}
          </div>
        </div>
      </div>
    )
  }
)
