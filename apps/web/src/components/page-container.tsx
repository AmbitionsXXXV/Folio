import type * as React from "react"

import { cn } from "@/lib/utils"

const widthClass = {
  narrow: "max-w-3xl",
  default: "max-w-5xl",
  wide: "max-w-6xl",
  full: "max-w-none"
} as const

/**
 * Standard page wrapper for authenticated app screens.
 *
 * Unifies container width and vertical rhythm (previously drifting between
 * `py-8` and `py-10 md:py-14`) so every screen shares the landing page's
 * spacious, editorial feel.
 */
export function PageContainer({
  className,
  width = "default",
  ...props
}: React.ComponentProps<"div"> & { width?: keyof typeof widthClass }) {
  return (
    <div
      className={cn(
        "container mx-auto px-4 py-10 md:py-14",
        widthClass[width],
        className
      )}
      {...props}
    />
  )
}
