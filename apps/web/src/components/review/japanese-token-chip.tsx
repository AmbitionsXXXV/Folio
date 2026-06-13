import type {
  JapaneseAnalyzedToken,
  JapaneseSentenceMode
} from "@/lib/japanese-analysis"
import {
  JAPANESE_POS_COLOR_MAP,
  JAPANESE_POS_SWATCH_COLOR_MAP
} from "@/lib/japanese-typing"

interface JapaneseTokenChipProps {
  token: JapaneseAnalyzedToken
  mode: JapaneseSentenceMode
  /** Analyzed mode only: this token's POS category is toggled off in the legend. */
  isDimmed: boolean
  isSelected: boolean
  onSelect: (token: JapaneseAnalyzedToken) => void
}

/** Surface text with per-kanji-run furigana — kana runs render bare (no <rt>). */
function TokenRuby({ token }: { token: JapaneseAnalyzedToken }) {
  const surfaceClass = "font-script-ja text-2xl leading-tight font-medium"

  if (!token.ruby) {
    return <span className={surfaceClass}>{token.surface}</span>
  }

  return (
    <span className={surfaceClass}>
      {token.ruby.map((segment, index) =>
        segment.reading ? (
          <ruby key={`${token.id}-r${index}`}>
            {segment.text}
            <rt className="text-[0.5em] leading-none font-normal opacity-70">
              {segment.reading}
            </rt>
          </ruby>
        ) : (
          <span key={`${token.id}-k${index}`}>{segment.text}</span>
        )
      )}
    </span>
  )
}

export function JapaneseTokenChip({
  token,
  mode,
  isDimmed,
  isSelected,
  onSelect
}: JapaneseTokenChipProps) {
  // Punctuation: inline, bottom-aligned, non-interactive.
  if (token.isPunctuation) {
    return (
      <span className="self-end pb-2 font-script-ja text-xl text-muted-foreground select-none">
        {token.surface}
      </span>
    )
  }

  // Reading-only mode: plain furigana + romaji, no box, non-interactive.
  if (mode === "reading") {
    return (
      <span className="flex flex-col items-center gap-1">
        <TokenRuby token={token} />
        {token.romaji && (
          <span className="font-mono text-[10px] leading-none text-muted-foreground">
            {token.romaji}
          </span>
        )}
      </span>
    )
  }

  // Analyzed mode: interactive chip with POS color + colored underline bar.
  const chipColor = isDimmed
    ? "border-border/50 bg-surface-secondary/40 text-muted-foreground"
    : JAPANESE_POS_COLOR_MAP[token.pos]
  const underlineColor = isDimmed
    ? "bg-border"
    : JAPANESE_POS_SWATCH_COLOR_MAP[token.pos]

  return (
    <button
      aria-pressed={isSelected}
      className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-1.5 transition-all duration-200 ${chipColor} ${
        isSelected
          ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-background"
          : ""
      }`}
      onClick={() => onSelect(token)}
      type="button"
    >
      <TokenRuby token={token} />
      <span className={`h-0.5 w-full rounded-full ${underlineColor}`} />
      {token.romaji && (
        <span className="font-mono text-[10px] leading-none opacity-70">
          {token.romaji}
        </span>
      )}
    </button>
  )
}
