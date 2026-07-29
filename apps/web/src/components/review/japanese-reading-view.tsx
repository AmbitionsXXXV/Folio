import type { ChangeEvent } from "react"
import { useCallback, useMemo, useState } from "react"
import { useTranslation } from "react-i18next"

import type { JapaneseAnalyzedToken } from "@/lib/japanese-analysis"
import { tokenReading } from "@/lib/japanese-analysis"
import type { JapanesePartOfSpeech } from "@/lib/japanese-typing"
import { ALL_JAPANESE_POS_CATEGORIES } from "@/lib/japanese-typing"

import type { JapaneseReadingLocale } from "./japanese-analyzed-data"
import { JAPANESE_READING_WORKS } from "./japanese-analyzed-data"
import { JapaneseAnalyzedSentenceView } from "./japanese-analyzed-sentence"
import { JapanesePosLegend } from "./japanese-pos-legend"

const resolveReadingLocale = (language: string): JapaneseReadingLocale => {
  if (language.startsWith("ja")) {
    return "ja-JP"
  }

  if (language.startsWith("en")) {
    return "en-US"
  }

  return "zh-CN"
}

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
  const { i18n, t } = useTranslation()
  const [selectedWorkId, setSelectedWorkId] = useState(
    JAPANESE_READING_WORKS[0]?.id ?? ""
  )
  const [enabledPosCategories, setEnabledPosCategories] = useState<
    Set<JapanesePartOfSpeech>
  >(() => new Set(ALL_JAPANESE_POS_CATEGORIES))
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null)

  const selectedWork =
    JAPANESE_READING_WORKS.find((work) => work.id === selectedWorkId) ??
    JAPANESE_READING_WORKS[0]
  const readingLocale = resolveReadingLocale(
    i18n.resolvedLanguage ?? i18n.language
  )

  const tokenById = useMemo(() => {
    const tokens = new Map<string, JapaneseAnalyzedToken>()

    for (const sentence of selectedWork?.sentences ?? []) {
      for (const token of sentence.tokens) {
        tokens.set(token.id, token)
      }
    }

    return tokens
  }, [selectedWork])

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

  const handleWorkChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setSelectedWorkId(event.target.value)
      setSelectedTokenId(null)
    },
    []
  )

  const selectedToken = useMemo(
    () => (selectedTokenId ? (tokenById.get(selectedTokenId) ?? null) : null),
    [selectedTokenId, tokenById]
  )

  if (!selectedWork) {
    return null
  }

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-3xl shrink-0 flex-col gap-2 px-4 pt-8 sm:px-6 sm:pt-12">
        <p className="font-display text-xs font-medium tracking-[0.16em] text-primary uppercase">
          {t("review.japaneseReading.eyebrow")}
        </p>
        <h1 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {t("review.japaneseReading.title")}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t("review.japaneseReading.subtitle")}
        </p>
      </header>

      <main className="flex flex-1 flex-col items-center gap-7 px-4 py-8 sm:px-6">
        <section
          aria-labelledby="japanese-reading-work-title"
          className="w-full max-w-3xl border-y border-border/60 py-5"
        >
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="font-script-ja text-xs text-muted-foreground">
                {selectedWork.titleReading}
              </p>
              <h2
                className="font-display text-2xl font-semibold tracking-tight"
                id="japanese-reading-work-title"
              >
                {selectedWork.title}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {selectedWork.author} · {selectedWork.firstPublishedYear}
              </p>
            </div>

            <label className="flex w-full flex-col gap-1.5 text-xs font-medium text-muted-foreground sm:w-64">
              {t("review.japaneseReading.workPickerLabel")}
              <select
                className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-base text-foreground transition-colors outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 sm:text-sm"
                onChange={handleWorkChange}
                value={selectedWork.id}
              >
                {JAPANESE_READING_WORKS.map((work) => (
                  <option key={work.id} value={work.id}>
                    {work.title} — {work.author}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="mt-5 max-w-2xl text-sm leading-6 text-muted-foreground">
            {selectedWork.descriptions[readingLocale]}
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-muted-foreground">
            <span>
              {t("review.japaneseReading.excerptCount", {
                count: selectedWork.sentences.length
              })}
            </span>
            <span aria-hidden="true">·</span>
            <span>{t("review.japaneseReading.publicDomain")}</span>
            <span aria-hidden="true">·</span>
            <a
              className="font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              href={selectedWork.sourceUrl}
              rel="noopener"
              target="_blank"
            >
              {t("review.japaneseReading.openOriginal", {
                source: selectedWork.sourceName
              })}
            </a>
          </div>
        </section>

        <div className="w-full max-w-2xl">
          <JapanesePosLegend
            enabledPosCategories={enabledPosCategories}
            onToggle={handleToggle}
          />
        </div>

        <div className="flex w-full max-w-2xl flex-col gap-5">
          {selectedWork.sentences.map((sentence) => (
            <JapaneseAnalyzedSentenceView
              enabledPosCategories={enabledPosCategories}
              key={sentence.id}
              onSelectToken={handleSelectToken}
              selectedTokenId={selectedTokenId}
              sentence={sentence}
              translation={sentence.translations[readingLocale]}
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
      </main>
    </div>
  )
}
