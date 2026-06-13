import type { JapanesePartOfSpeech } from "./japanese-typing"

/**
 * One ruby segment: a run of surface text with an optional reading rendered
 * above it. Kanji runs carry a `reading`; trailing/leading kana (okurigana)
 * runs carry none, so furigana aligns only over the kanji — never over kana.
 * e.g. 聞く → [{ text: "聞", reading: "き" }, { text: "く" }]
 */
export interface JapaneseRubySegment {
  text: string
  reading?: string
}

/**
 * View-model for a single analyzed token. This mirrors the eventual
 * `japanese.analyze` oRPC output (see docs/research/japanese-nlp-jlpt.md);
 * for this frontend-first milestone it is populated from mock data.
 */
export interface JapaneseAnalyzedToken {
  id: string
  surface: string
  /** Per-kanji-run ruby alignment; null for kana-only or punctuation tokens. */
  ruby: JapaneseRubySegment[] | null
  /** Dictionary/base-form romaji (matches the reference design); null for punctuation. */
  romaji: string | null
  pos: JapanesePartOfSpeech
  baseForm: string
  isPunctuation: boolean
  /** Phrase-group id; consecutive tokens sharing an id render inside one bunsetsu box. */
  bunsetsuId: number | null
}

export type JapaneseSentenceMode = "analyzed" | "reading"

export interface JapaneseAnalyzedSentence {
  id: string
  mode: JapaneseSentenceMode
  tokens: JapaneseAnalyzedToken[]
  translation: string
}

/**
 * A render segment is either a bunsetsu group (a tinted box wrapping several
 * tokens) or a loose token rendered on its own (single content words and
 * punctuation). Consecutive tokens with the same non-null `bunsetsuId` collapse
 * into one group.
 */
export type JapaneseRenderSegment =
  | { kind: "group"; bunsetsuId: number; tokens: JapaneseAnalyzedToken[] }
  | { kind: "loose"; token: JapaneseAnalyzedToken }

export const toRenderSegments = (
  tokens: JapaneseAnalyzedToken[]
): JapaneseRenderSegment[] => {
  const segments: JapaneseRenderSegment[] = []

  for (const token of tokens) {
    const last = segments.at(-1)
    const continuesGroup =
      token.bunsetsuId !== null &&
      !token.isPunctuation &&
      last?.kind === "group" &&
      last.bunsetsuId === token.bunsetsuId

    if (continuesGroup && last?.kind === "group") {
      last.tokens.push(token)
    } else if (token.bunsetsuId !== null && !token.isPunctuation) {
      segments.push({
        kind: "group",
        bunsetsuId: token.bunsetsuId,
        tokens: [token]
      })
    } else {
      segments.push({ kind: "loose", token })
    }
  }

  return segments
}

/** Reconstruct a token's full reading from its ruby segments (kanji readings + bare kana). */
export const tokenReading = (token: JapaneseAnalyzedToken): string =>
  token.ruby?.map((segment) => segment.reading ?? segment.text).join("") ??
  token.surface
