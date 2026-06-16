import { Button } from "@folionote/ui/button"
import { useTranslation } from "react-i18next"

import type { ReviewSessionHeaderProps } from "@/types/review"

/**
 * ReviewSessionHeader - Header component for review session
 * Shows the current rule label, progress count, and end review button
 */
export function ReviewSessionHeader({
  ruleLabel,
  currentIndex,
  totalInQueue,
  reviewedToday,
  onStop
}: ReviewSessionHeaderProps) {
  const { t } = useTranslation()

  return (
    <div className="mb-6 flex items-center justify-between gap-4">
      <div className="space-y-1.5">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          {ruleLabel} {t("review.reviewSession")}
        </h2>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary tabular-nums ring-1 ring-primary/15">
            {currentIndex + 1} / {totalInQueue}
          </span>
          {t("review.reviewedTodayCount", { count: reviewedToday })}
        </p>
      </div>
      <Button
        aria-label={t("review.endReviewLabel")}
        onClick={onStop}
        variant="outline"
      >
        {t("review.endReview")}
      </Button>
    </div>
  )
}
