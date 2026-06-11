import type { IconSvgElement } from "@hugeicons/react"
import { HugeiconsIcon } from "@hugeicons/react"
import type * as React from "react"

import { cn } from "@/lib/utils"

interface PageHeaderProps {
  /** Optional Hugeicons glyph rendered inside the accent chip. */
  icon?: IconSvgElement
  /** Small uppercase label above the title (e.g. the current date). */
  eyebrow?: React.ReactNode
  title: React.ReactNode
  description?: React.ReactNode
  /** Right-aligned actions (buttons, menus). */
  actions?: React.ReactNode
  className?: string
}

/**
 * Canonical page header for authenticated screens.
 *
 * Standardizes the accent chip, display-serif title, and description that were
 * previously copy-pasted with drifting spacing (`mb-8` vs `mb-10`), icon sizes
 * (`size-5` vs `size-6`), and accent opacities (`bg-primary/8` vs `/10`) across
 * inbox, library, tags, sources, and friends.
 */
export function PageHeader({
  icon,
  eyebrow,
  title,
  description,
  actions,
  className
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "mb-10 flex items-start justify-between gap-4 md:mb-12",
        className
      )}
    >
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-2 text-sm font-medium tracking-wide text-primary uppercase">
            {eyebrow}
          </p>
        ) : null}

        <div className="flex items-center gap-2.5">
          {icon ? (
            <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
              <HugeiconsIcon className="size-5 text-primary" icon={icon} />
            </span>
          ) : null}
          <h1 className="font-display text-2xl font-semibold tracking-tight text-balance text-foreground md:text-3xl">
            {title}
          </h1>
        </div>

        {description ? (
          <p className="mt-2 text-sm text-pretty text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>

      {actions ? (
        <div className="flex shrink-0 items-center gap-2">{actions}</div>
      ) : null}
    </header>
  )
}
