import { useTranslation } from "react-i18next"

import type { ReviewProgressBarProps } from "@/types/review"

/**
 * ReviewProgressBar - Progress bar showing review session progress
 */
export function ReviewProgressBar({
  currentIndex,
  totalInQueue
}: ReviewProgressBarProps) {
  const { t } = useTranslation()
  const progress =
    totalInQueue > 0 ? ((currentIndex + 1) / totalInQueue) * 100 : 0

  return (
    <div
      aria-label={t("review.progressLabel")}
      aria-valuemax={totalInQueue}
      aria-valuemin={0}
      aria-valuenow={currentIndex + 1}
      className="mb-8 h-2 overflow-hidden rounded-full bg-surface-secondary"
      role="progressbar"
    >
      <div
        className="h-full bg-primary transition-all duration-300 ease-out motion-reduce:transition-none"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}
