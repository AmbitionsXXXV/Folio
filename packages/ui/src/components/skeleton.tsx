import { cn } from "@folionote/ui/lib/utils"

/**
 * Loading placeholder with a warm shimmer sweep that matches the editorial
 * theme. Falls back to a simple pulse under `prefers-reduced-motion`.
 */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-accent",
        "before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite] before:bg-gradient-to-r before:from-transparent before:via-foreground/10 before:to-transparent",
        "motion-reduce:animate-pulse motion-reduce:before:hidden",
        className
      )}
      data-slot="skeleton"
      {...props}
    />
  )
}

export { Skeleton }
