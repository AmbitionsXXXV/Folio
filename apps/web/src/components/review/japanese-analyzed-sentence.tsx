import type {
  JapaneseAnalyzedSentence,
  JapaneseAnalyzedToken
} from "@/lib/japanese-analysis"
import { toRenderSegments } from "@/lib/japanese-analysis"
import type { JapanesePartOfSpeech } from "@/lib/japanese-typing"

import { JapaneseTokenChip } from "./japanese-token-chip"

interface JapaneseAnalyzedSentenceViewProps {
  sentence: JapaneseAnalyzedSentence
  enabledPosCategories: Set<JapanesePartOfSpeech>
  selectedTokenId: string | null
  onSelectToken: (token: JapaneseAnalyzedToken) => void
  translationLabel: string
}

export function JapaneseAnalyzedSentenceView({
  sentence,
  enabledPosCategories,
  selectedTokenId,
  onSelectToken,
  translationLabel
}: JapaneseAnalyzedSentenceViewProps) {
  const isAnalyzed = sentence.mode === "analyzed"

  const renderChip = (token: JapaneseAnalyzedToken) => (
    <JapaneseTokenChip
      isDimmed={isAnalyzed && !enabledPosCategories.has(token.pos)}
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
                  className="flex items-end gap-1 rounded-xl border border-border/40 bg-surface-secondary/30 px-1.5 py-1"
                  key={`${sentence.id}-g${segment.bunsetsuId}`}
                >
                  {segment.tokens.map(renderChip)}
                </div>
              ) : (
                renderChip(segment.token)
              )
            )
          : sentence.tokens.map(renderChip)}
      </div>

      <p className="mt-4 text-center text-sm text-muted-foreground">
        <span className="opacity-60">{translationLabel}：</span>
        {sentence.translation}
      </p>
    </div>
  )
}
