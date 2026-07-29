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
  isGrouped: boolean
  /** Analyzed mode only: this token's POS category is toggled off in the legend. */
  isDimmed: boolean
  isSelected: boolean
  onSelect: (token: JapaneseAnalyzedToken) => void
}

/** Surface text with per-kanji-run furigana — kana runs render bare (no <rt>). */
function TokenRuby({ token }: { token: JapaneseAnalyzedToken }) {
  const surfaceClass =
    "flex items-end whitespace-nowrap font-script-ja text-2xl leading-tight font-medium"

  if (!token.ruby) {
    return <span className={surfaceClass}>{token.surface}</span>
  }

  return (
    <span className={surfaceClass}>
      {token.ruby.map((segment, index) =>
        segment.reading ? (
          <ruby
            className="relative inline-flex items-end"
            key={`${token.id}-r${index}`}
          >
            <span>{segment.text}</span>
            <rt className="pointer-events-none absolute bottom-full left-1/2 mb-1 max-w-none -translate-x-1/2 text-[0.5em] leading-none font-normal whitespace-nowrap opacity-70">
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
  isGrouped,
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
      <span className="flex flex-col items-center gap-1 pt-3">
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
  let chipColor = JAPANESE_POS_COLOR_MAP[token.pos]
  if (isDimmed) {
    chipColor = "border-transparent text-muted-foreground"
  } else if (isGrouped) {
    chipColor = "border-transparent text-foreground"
  }
  const underlineColor = isDimmed
    ? "bg-border"
    : JAPANESE_POS_SWATCH_COLOR_MAP[token.pos]

  return (
    <button
      aria-pressed={isSelected}
      className="group relative z-10 flex flex-col items-center pt-3 focus-visible:outline-none"
      onClick={() => onSelect(token)}
      type="button"
    >
      <span
        className={`relative flex h-10 items-end rounded-lg border px-2 pb-1.5 transition-[color,background-color,border-color,box-shadow,opacity] duration-200 ${chipColor} ${
          isSelected
            ? "ring-2 ring-ring ring-offset-2 ring-offset-background"
            : ""
        } group-focus-visible:ring-2 group-focus-visible:ring-ring group-focus-visible:ring-offset-2 group-focus-visible:ring-offset-background`}
      >
        <TokenRuby token={token} />
        <span
          className={`absolute right-2 bottom-1 left-2 h-0.5 rounded-full ${underlineColor}`}
        />
      </span>
      {token.romaji && (
        <span className="mt-1 h-2.5 font-mono text-[10px] leading-none opacity-70">
          {token.romaji}
        </span>
      )}
    </button>
  )
}
