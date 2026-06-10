import { Button } from "@folionote/ui/button"
import { useTranslation } from "react-i18next"

import {
  Context,
  ContextCacheUsage,
  ContextContent,
  ContextContentBody,
  ContextContentFooter,
  ContextContentHeader,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextTrigger
} from "@/components/ai-elements/context-usage"
import type { SessionContextUsage } from "@/hooks/use-session-context-usage"
import { cn } from "@/lib/utils"

function formatCompactTokenCount(tokenCount: number): string {
  return new Intl.NumberFormat("en-US", {
    notation: "compact"
  }).format(tokenCount)
}

export interface ContextPopoverDetails {
  maxTokens: number
  remainingTokens: number
  modelId: string
  status: SessionContextUsage["status"]
  source: SessionContextUsage["source"]
}

export function buildContextPopoverDetails(
  contextUsage: SessionContextUsage | null,
  selectedModel: string
): ContextPopoverDetails | null {
  if (!contextUsage) {
    return null
  }

  const remainingTokens =
    typeof contextUsage.remaining === "number"
      ? Math.max(0, contextUsage.remaining)
      : Math.max(0, contextUsage.maxTokens - contextUsage.usedTokens)

  return {
    maxTokens: contextUsage.maxTokens,
    remainingTokens,
    modelId: contextUsage.tokenlensModelId ?? selectedModel,
    status: contextUsage.status,
    source: contextUsage.source
  }
}

interface ContextDetailRowProps {
  label: string
  value: string
}

function ContextDetailRow({ label, value }: ContextDetailRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-52 truncate text-right font-mono">{value}</span>
    </div>
  )
}

function ContextPopoverDetailRows({
  contextPopoverDetails
}: {
  contextPopoverDetails: ContextPopoverDetails | null
}) {
  const { t } = useTranslation()

  if (!contextPopoverDetails) {
    return null
  }

  return (
    <div className="space-y-1.5 pb-1.5">
      <ContextDetailRow
        label={t("knowledge.contextUsageComponent.details.remaining")}
        value={`${formatCompactTokenCount(contextPopoverDetails.remainingTokens)} / ${formatCompactTokenCount(contextPopoverDetails.maxTokens)}`}
      />
      <ContextDetailRow
        label={t("knowledge.contextUsageComponent.details.model")}
        value={`${contextPopoverDetails.modelId} (${formatCompactTokenCount(contextPopoverDetails.maxTokens)})`}
      />
      <ContextDetailRow
        label={t("knowledge.contextUsageComponent.details.status")}
        value={t(
          `knowledge.contextUsageComponent.details.statusValue.${contextPopoverDetails.status}`
        )}
      />
      <ContextDetailRow
        label={t("knowledge.contextUsageComponent.details.source")}
        value={t(
          `knowledge.contextUsageComponent.details.sourceValue.${contextPopoverDetails.source}`
        )}
      />
    </div>
  )
}

interface ContextUsagePopoverProps {
  sessionContextUsage: SessionContextUsage | null
  selectedModel: string
  contextPopoverDetails: ContextPopoverDetails | null
}

export function ContextUsagePopover({
  sessionContextUsage,
  selectedModel,
  contextPopoverDetails
}: ContextUsagePopoverProps) {
  if (!sessionContextUsage || sessionContextUsage.usedTokens <= 0) {
    return null
  }

  return (
    <Context
      maxTokens={sessionContextUsage.maxTokens}
      modelId={sessionContextUsage.tokenlensModelId ?? selectedModel}
      usage={sessionContextUsage.sessionUsage}
      usedTokens={sessionContextUsage.usedTokens}
    >
      <ContextTrigger
        className="h-8 gap-1.5 rounded-lg px-2 text-xs"
        size="sm"
      />
      <ContextContent align="start" side="top">
        <ContextContentHeader />
        <ContextContentBody className="space-y-1.5">
          <ContextPopoverDetailRows
            contextPopoverDetails={contextPopoverDetails}
          />
          <ContextInputUsage />
          <ContextOutputUsage />
          <ContextReasoningUsage />
          <ContextCacheUsage />
        </ContextContentBody>
        <ContextContentFooter />
      </ContextContent>
    </Context>
  )
}

interface ContextCompactBannerProps {
  contextUsage: SessionContextUsage
  isCompacting: boolean
  onCompact: () => void
}

export function ContextCompactBanner({
  contextUsage,
  isCompacting,
  onCompact
}: ContextCompactBannerProps) {
  const { t } = useTranslation()

  if (!contextUsage.shouldCompact) {
    return null
  }

  return (
    <div
      className={cn(
        "mb-2 flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-xs",
        contextUsage.status === "compact"
          ? "border-destructive/60 bg-destructive/5 text-destructive"
          : "border-yellow-500/50 bg-yellow-500/5 text-yellow-700 dark:text-yellow-400"
      )}
    >
      <p className="font-medium">
        {t("knowledge.compactMessage.banner", {
          percent: contextUsage.percent,
          tokens: contextUsage.tokensToCompact
        })}
      </p>
      <Button
        className="h-7 px-2 text-xs"
        disabled={isCompacting}
        onClick={onCompact}
        size="sm"
        variant={contextUsage.status === "compact" ? "destructive" : "outline"}
      >
        {isCompacting
          ? t("knowledge.compactMessage.compacting")
          : t("knowledge.compactMessage.compactNow")}
      </Button>
    </div>
  )
}
