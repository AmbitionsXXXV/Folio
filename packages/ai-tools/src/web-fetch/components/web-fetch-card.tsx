import { cn } from "@folionote/ui/lib/utils"
import { memo } from "react"

import type { WebFetchCardProps } from "../types"

const MAX_PREVIEW_LENGTH = 500

export const WebFetchCard = memo(
  ({ url, contentType, content, className }: WebFetchCardProps) => {
    let hostname = ""
    try {
      hostname = new URL(url).hostname
    } catch {
      hostname = url
    }

    const preview =
      content.length > MAX_PREVIEW_LENGTH
        ? `${content.slice(0, MAX_PREVIEW_LENGTH)}…`
        : content

    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-xl border border-border/50 bg-linear-to-br from-emerald-400/10 via-teal-300/5 to-cyan-200/5 p-4 shadow-lg backdrop-blur-sm transition-all duration-300 hover:shadow-xl",
          className
        )}
      >
        <div className="relative z-10 grid gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="flex size-6 items-center justify-center rounded-md bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
              <svg
                aria-hidden="true"
                className="size-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Z"
                  strokeLinecap="round"
                />
                <path d="M2 12h20" strokeLinecap="round" />
                <path
                  d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10Z"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="truncate font-semibold text-foreground">
                Web Fetch
              </div>
              <a
                className="block truncate font-mono text-[10px] text-muted-foreground/70 hover:text-primary"
                href={url}
                rel="noopener noreferrer"
                target="_blank"
              >
                {hostname}
              </a>
            </div>
            {contentType ? (
              <span className="ml-auto shrink-0 rounded-full bg-muted/60 px-2 py-0.5 font-mono text-[10px] text-muted-foreground">
                {contentType.split(";")[0]}
              </span>
            ) : null}
          </div>

          {preview ? (
            <div className="rounded-lg bg-background/60 p-3 shadow-sm backdrop-blur-sm">
              <pre className="font-mono text-[11px] break-words whitespace-pre-wrap text-foreground/80">
                {preview}
              </pre>
            </div>
          ) : null}
        </div>
      </div>
    )
  }
)
