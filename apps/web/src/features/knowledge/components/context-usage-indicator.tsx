import { Button } from "@folionote/ui/button"
import {
  Progress,
  ProgressIndicator,
  ProgressTrack
} from "@folionote/ui/progress"
import { Tooltip, TooltipContent, TooltipTrigger } from "@folionote/ui/tooltip"
import { memo } from "react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

import type { ContextUsage } from "../types"
import { formatTokenCount } from "../utils"

interface ContextUsageIndicatorProps {
  contextUsage: ContextUsage
  onNewChat: () => void
}

export const ContextUsageIndicator = memo(
  ({ contextUsage, onNewChat }: ContextUsageIndicatorProps) => {
    const { t } = useTranslation()

    const getProgressColor = () => {
      if (contextUsage.isExceeded) return "bg-destructive"
      if (contextUsage.isWarning) return "bg-yellow-500"
      return "bg-primary"
    }

    const progressColor = getProgressColor()

    return (
      <Tooltip>
        <TooltipTrigger>
          <div
            className={cn(
              "flex items-center gap-2 rounded-lg px-2.5 py-1.5",
              "border bg-background/50 backdrop-blur-sm",
              "cursor-default transition-colors",
              contextUsage.isExceeded &&
                "border-destructive/50 bg-destructive/5",
              contextUsage.isWarning &&
                !contextUsage.isExceeded &&
                "border-yellow-500/50 bg-yellow-500/5"
            )}
          >
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5">
                <span className="font-[tabular-nums] text-[10px] text-muted-foreground">
                  {t("knowledge.contextUsage")}
                </span>
                <span
                  className={cn(
                    "font-[tabular-nums] font-medium text-xs",
                    contextUsage.isExceeded && "text-destructive",
                    contextUsage.isWarning &&
                      !contextUsage.isExceeded &&
                      "text-yellow-600 dark:text-yellow-500"
                  )}
                >
                  {contextUsage.percent}%
                </span>
              </div>
              <Progress
                className="h-1 w-16"
                value={Math.min(100, contextUsage.percent)}
              >
                <ProgressTrack className="overflow-hidden rounded-full bg-muted">
                  <ProgressIndicator
                    className={cn("h-full transition-all", progressColor)}
                  />
                </ProgressTrack>
              </Progress>
            </div>
            {contextUsage.isExceeded && (
              <Button
                className="h-6 px-2 text-xs"
                onClick={(e) => {
                  e.stopPropagation()
                  onNewChat()
                }}
                size="sm"
                variant="destructive"
              >
                {t("knowledge.newChat")}
              </Button>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          <p>
            {t("knowledge.contextUsageTooltip", {
              used: formatTokenCount(contextUsage.used),
              total: formatTokenCount(contextUsage.total),
              percent: contextUsage.percent
            })}
          </p>
          {contextUsage.isWarning && !contextUsage.isExceeded && (
            <p className="mt-1 text-yellow-600 dark:text-yellow-500">
              {t("knowledge.contextWarning", { percent: contextUsage.percent })}
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    )
  }
)
