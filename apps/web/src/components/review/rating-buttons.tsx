import { Button } from "@folionote/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@folionote/ui/tooltip"
import { useTranslation } from "react-i18next"

import { RATING_BUTTONS } from "@/constants"
import { cn } from "@/lib/utils"
import type { RatingButtonsProps } from "@/types/review"

const RATING_SHORTCUT_KEYS: Record<string, string> = {
  again: "1",
  hard: "2",
  good: "3",
  easy: "4"
}

/**
 * RatingButtons - Rating buttons for review feedback
 */
export function RatingButtons({ onRate, isLoading }: RatingButtonsProps) {
  const { t } = useTranslation()

  return (
    <div className="flex flex-wrap justify-center gap-3">
      {RATING_BUTTONS.map(({ key, labelKey, hintKey, variant, className }) => (
        <Tooltip key={key}>
          <TooltipTrigger
            render={(triggerProps) => (
              <Button
                {...triggerProps}
                aria-label={t("review.rateAs", {
                  rating: t(labelKey),
                  key: RATING_SHORTCUT_KEYS[key]
                })}
                className={cn("min-w-20", className)}
                disabled={isLoading}
                onClick={() => onRate(key)}
                variant={variant}
              >
                {t(labelKey)}
              </Button>
            )}
          />
          <TooltipContent>
            <p>
              {t(hintKey)}{" "}
              <kbd className="ml-1 rounded border border-border/60 bg-muted/50 px-1 font-mono text-xs">
                {RATING_SHORTCUT_KEYS[key]}
              </kbd>
            </p>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  )
}
