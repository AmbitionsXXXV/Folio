import { Badge } from "@folionote/ui/badge"
import { useTranslation } from "react-i18next"

import type { JlptQuestion } from "@/lib/jlpt-exam"

interface JlptAnalysisPanelProps {
  question: JlptQuestion
}

export function JlptAnalysisPanel({ question }: JlptAnalysisPanelProps) {
  const { t } = useTranslation()
  const { grammar, vocabulary } = question

  if (!grammar && !(vocabulary && vocabulary.length > 0)) {
    return null
  }

  return (
    <div className="animate-fade-in flex flex-col gap-3">
      {grammar && (
        <div className="rounded-2xl border border-border/50 bg-card/40 p-4">
          <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t("review.jlptExam.grammarTitle")}
          </p>
          <div className="flex flex-wrap items-baseline gap-2">
            <Badge variant="secondary">{grammar.pattern}</Badge>
            <span className="text-sm text-muted-foreground">
              {grammar.reading}
            </span>
          </div>
          <p className="mt-2 font-medium">{grammar.meaning}</p>
          <dl className="mt-3 flex flex-col gap-2 text-sm">
            <div className="flex gap-2">
              <dt className="shrink-0 text-muted-foreground">
                {t("review.jlptExam.connectionLabel")}
              </dt>
              <dd className="font-script-ja">{grammar.connection}</dd>
            </div>
          </dl>
          <p className="mt-3 text-sm leading-relaxed text-secondary-foreground">
            {grammar.explanation}
          </p>
        </div>
      )}

      {vocabulary && vocabulary.length > 0 && (
        <div className="rounded-2xl border border-border/50 bg-card/40 p-4">
          <p className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">
            {t("review.jlptExam.vocabularyTitle")}
          </p>
          <div className="flex flex-col gap-3">
            {vocabulary.map((gloss) => (
              <div
                className="flex items-start justify-between gap-3"
                key={`${gloss.term}-${gloss.reading}`}
              >
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="font-script-ja text-lg font-medium">
                      {gloss.term}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {gloss.reading}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-secondary-foreground">
                    {gloss.meaning}
                  </p>
                </div>
                <Badge className="shrink-0" variant="outline">
                  {gloss.partOfSpeech}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
