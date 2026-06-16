import type * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Frosted "panel" surface matching the landing page's feature cards: soft
 * border, translucent card fill, backdrop blur, and a warm shadow.
 *
 * Use for primary content cards that should feel elevated. `interactive` adds
 * the landing page's hover lift for clickable cards.
 */
export function Surface({
  className,
  interactive = false,
  ...props
}: React.ComponentProps<"div"> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-3xl border border-border/60 bg-card/70 shadow-sm backdrop-blur-sm",
        interactive &&
          "transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 hover:shadow-lg",
        className
      )}
      data-slot="surface"
      {...props}
    />
  )
}
