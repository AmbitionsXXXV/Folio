import { Button } from "@folionote/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@folionote/ui/card"
import { Link } from "@tanstack/react-router"
import { AnimatePresence, motion } from "motion/react"
import { useTranslation } from "react-i18next"

import type { ReviewCardProps } from "@/types/review"

import { RatingButtons } from "./rating-buttons"
import { SnoozeDropdown } from "./snooze-dropdown"

/**
 * ReviewCard - Card component for displaying entry during review
 */
export function ReviewCard({
  entry,
  onRate,
  onSkip,
  onSnooze,
  isLoading
}: ReviewCardProps) {
  const { t } = useTranslation()
  const plainContent = entry.contentText ?? ""

  return (
    <AnimatePresence mode="wait">
      <motion.div
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        initial={{ opacity: 0, x: 20 }}
        key={entry.id}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <Card className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-start justify-between gap-2">
              <div>
                <CardTitle className="text-xl">
                  {entry.title || t("entry.untitled")}
                </CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  {entry.isInbox ? t("entry.inbox") : t("entry.library")}
                  {entry.isStarred ? ` · ⭐ ${t("entry.starred")}` : ""}
                </p>
              </div>
              <Link params={{ id: entry.id }} to="/entries/$id">
                <Button size="sm" variant="outline">
                  {t("review.viewDetails")}
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="relative mb-6">
              <div className="max-h-64 overflow-y-auto">
                <p className="leading-relaxed whitespace-pre-wrap text-foreground">
                  {plainContent || t("entry.empty")}
                </p>
              </div>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-linear-to-t from-card to-transparent"
              />
            </div>

            <div className="border-t pt-6">
              <RatingButtons isLoading={isLoading} onRate={onRate} />
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button
                  aria-label={t("review.skipLabel")}
                  className="text-muted-foreground"
                  disabled={isLoading}
                  onClick={onSkip}
                  size="sm"
                  variant="ghost"
                >
                  {t("review.skip")}
                </Button>
                <SnoozeDropdown disabled={isLoading} onSnooze={onSnooze} />
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  )
}
