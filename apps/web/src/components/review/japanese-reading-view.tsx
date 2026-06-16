import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import type { JapaneseAnalyzedToken } from "@/lib/japanese-analysis"
import { tokenReading } from "@/lib/japanese-analysis"
import type { JapanesePartOfSpeech } from "@/lib/japanese-typing"
import { ALL_JAPANESE_POS_CATEGORIES } from "@/lib/japanese-typing"

import { JAPANESE_ANALYZED_SENTENCES } from "./japanese-analyzed-data"
import { JapaneseAnalyzedSentenceView } from "./japanese-analyzed-sentence"
import { JapanesePosLegend } from "./japanese-pos-legend"

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[11px] text-muted-foreground">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  )
}

function SelectedTokenPanel({ token }: { token: JapaneseAnalyzedToken }) {
  const { t } = useTranslation()
  const reading = tokenReading(token)

  return (
    <div className="animate-fade-in rounded-2xl border border-border/50 bg-card/50 p-4">
      <div className="flex items-baseline gap-3">
        <span className="font-script-ja text-2xl font-semibold">
          {token.surface}
        </span>
        <span className="text-sm text-muted-foreground">{reading}</span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        <DetailField
          label={t("review.japaneseReading.fieldRomaji")}
          value={token.romaji ?? "—"}
        />
        <DetailField
          label={t("review.japaneseReading.fieldPos")}
          value={t(`review.japaneseTyping.posCategories.${token.pos}`)}
        />
        <DetailField
          label={t("review.japaneseReading.fieldReading")}
          value={reading}
        />
        <DetailField
          label={t("review.japaneseReading.fieldBaseForm")}
          value={token.baseForm}
        />
      </dl>
    </div>
  )
}

export function JapaneseReadingView() {
  const { t } = useTranslation()
  const [enabledPosCategories, setEnabledPosCategories] = useState<
    Set<JapanesePartOfSpeech>
  >(() => new Set(ALL_JAPANESE_POS_CATEGORIES))
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null)

  const handleToggle = useCallback((category: JapanesePartOfSpeech) => {
    setEnabledPosCategories((previous) => {
      const next = new Set(previous)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }, [])

  const handleSelectToken = useCallback((token: JapaneseAnalyzedToken) => {
    setSelectedTokenId((previous) => (previous === token.id ? null : token.id))
  }, [])

  const selectedToken = useMemo(() => {
    if (!selectedTokenId) {
      return null
    }
    for (const sentence of JAPANESE_ANALYZED_SENTENCES) {
      const found = sentence.tokens.find(
        (token) => token.id === selectedTokenId
      )
      if (found) {
        return found
      }
    }
    return null
  }, [selectedTokenId])

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <div className="flex shrink-0 flex-col gap-1 px-4 py-4 sm:px-6">
        <h1 className="text-lg font-semibold">
          {t("review.japaneseReading.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("review.japaneseReading.subtitle")}
        </p>
      </div>

      <div className="flex flex-1 flex-col items-center gap-6 px-4 py-6">
        <div className="w-full max-w-2xl">
          <JapanesePosLegend
            enabledPosCategories={enabledPosCategories}
            onToggle={handleToggle}
          />
        </div>

        <div className="flex w-full max-w-2xl flex-col gap-5">
          {JAPANESE_ANALYZED_SENTENCES.map((sentence) => (
            <JapaneseAnalyzedSentenceView
              enabledPosCategories={enabledPosCategories}
              key={sentence.id}
              onSelectToken={handleSelectToken}
              selectedTokenId={selectedTokenId}
              sentence={sentence}
              translationLabel={t("review.japaneseReading.translationLabel")}
            />
          ))}
        </div>

        <div className="w-full max-w-2xl">
          {selectedToken ? (
            <SelectedTokenPanel token={selectedToken} />
          ) : (
            <p className="text-center text-xs text-muted-foreground/70">
              {t("review.japaneseReading.selectHint")}
            </p>
          )}
        </div>

        <p className="text-center text-[11px] text-muted-foreground/60">
          {t("review.japaneseReading.phraseNote")}
        </p>
      </div>
    </div>
  )
}
