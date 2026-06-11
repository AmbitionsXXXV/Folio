import { HugeiconsIcon } from "@hugeicons/react"
import { useTranslation } from "react-i18next"

import { Surface } from "@/components/surface"
import { cn } from "@/lib/utils"
import type { StatsCardProps } from "@/types/review"

/**
 * StatsCard - Single statistics card component with glassmorphism styling
 */
export function StatsCard({
  value,
  description,
  icon,
  iconColor
}: StatsCardProps) {
  const { t } = useTranslation()

  return (
    <Surface className="flex items-center gap-4 p-5">
      <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/15">
        <HugeiconsIcon className={cn("size-5", iconColor)} icon={icon} />
      </div>
      <div className="min-w-0">
        <p className="font-display text-2xl font-semibold tracking-tight tabular-nums">
          {value}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {t(description)}
        </p>
      </div>
    </Surface>
  )
}
