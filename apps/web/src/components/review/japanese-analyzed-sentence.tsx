import type {
  JapaneseAnalyzedSentence,
  JapaneseAnalyzedToken
} from "@/lib/japanese-analysis"
import { toRenderSegments } from "@/lib/japanese-analysis"
import type { JapanesePartOfSpeech } from "@/lib/japanese-typing"

import { JapaneseTokenChip } from "./japanese-token-chip"

interface JapaneseAnalyzedSentenceViewProps {
  sentence: Omit<JapaneseAnalyzedSentence, "translation">
  translation: string
  enabledPosCategories: Set<JapanesePartOfSpeech>
  selectedTokenId: string | null
  onSelectToken: (token: JapaneseAnalyzedToken) => void
  translationLabel: string
}

export function JapaneseAnalyzedSentenceView({
  sentence,
  translation,
  enabledPosCategories,
  selectedTokenId,
  onSelectToken,
  translationLabel
}: JapaneseAnalyzedSentenceViewProps) {
  const isAnalyzed = sentence.mode === "analyzed"

  const renderChip = (token: JapaneseAnalyzedToken, isGrouped = false) => (
    <JapaneseTokenChip
      isDimmed={isAnalyzed && !enabledPosCategories.has(token.pos)}
      isGrouped={isGrouped}
      isSelected={selectedTokenId === token.id}
      key={token.id}
      mode={sentence.mode}
      onSelect={onSelectToken}
      token={token}
    />
  )

  const containerClass = isAnalyzed
    ? "rounded-3xl border border-border/50 bg-card/40 px-4 py-6 sm:px-6"
    : "px-2 py-2"

  return (
    <div className={containerClass}>
      <div className="flex flex-wrap items-end justify-center gap-x-1.5 gap-y-2.5">
        {isAnalyzed
          ? toRenderSegments(sentence.tokens).map((segment) =>
              segment.kind === "group" ? (
                <div
                  className="relative flex items-start"
                  key={`${sentence.id}-g${segment.bunsetsuId}`}
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-3 h-10 rounded-xl border border-border/40 bg-surface-secondary/50"
                  />
                  {segment.tokens.map((token) => renderChip(token, true))}
                </div>
              ) : (
                renderChip(segment.token)
              )
            )
          : sentence.tokens.map((token) => renderChip(token))}
      </div>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        <span className="opacity-60">{translationLabel}：</span>
        {translation}
      </p>
    </div>
  )
}
