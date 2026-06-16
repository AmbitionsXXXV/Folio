import type { JapaneseAnalyzedSentence } from "@/lib/japanese-analysis"

/**
 * Mock analyzed sentences reproducing the reference design (the "Miraa 使用説明"
 * screenshot). This is frontend-first placeholder data: once the
 * `japanese.analyze` oRPC procedure lands, these are replaced by live
 * tokenizer output of the same shape. Romaji uses dictionary/base-form
 * readings to match the reference (聞い→"kiku", し→"suru").
 */
export const JAPANESE_ANALYZED_SENTENCES: JapaneseAnalyzedSentence[] = [
  {
    id: "s1",
    mode: "analyzed",
    // エコーは聞く、記憶する、話す、再生するという4つのステップによって構成されている。
    translation: "回声由听、记忆、说、播放这四个步骤组成。",
    tokens: [
      {
        id: "s1-0",
        surface: "エコー",
        ruby: null,
        romaji: "ekoo",
        pos: "noun",
        baseForm: "エコー",
        isPunctuation: false,
        bunsetsuId: 0
      },
      {
        id: "s1-1",
        surface: "は",
        ruby: null,
        romaji: "wa",
        pos: "particle",
        baseForm: "は",
        isPunctuation: false,
        bunsetsuId: 0
      },
      {
        id: "s1-2",
        surface: "聞く",
        ruby: [{ text: "聞", reading: "き" }, { text: "く" }],
        romaji: "kiku",
        pos: "verb",
        baseForm: "聞く",
        isPunctuation: false,
        bunsetsuId: null
      },
      {
        id: "s1-3",
        surface: "、",
        ruby: null,
        romaji: null,
        pos: "expression",
        baseForm: "、",
        isPunctuation: true,
        bunsetsuId: null
      },
      {
        id: "s1-4",
        surface: "記憶",
        ruby: [{ text: "記憶", reading: "きおく" }],
        romaji: "kioku",
        pos: "noun",
        baseForm: "記憶",
        isPunctuation: false,
        bunsetsuId: 1
      },
      {
        id: "s1-5",
        surface: "する",
        ruby: null,
        romaji: "suru",
        pos: "verb",
        baseForm: "する",
        isPunctuation: false,
        bunsetsuId: 1
      },
      {
        id: "s1-6",
        surface: "、",
        ruby: null,
        romaji: null,
        pos: "expression",
        baseForm: "、",
        isPunctuation: true,
        bunsetsuId: null
      },
      {
        id: "s1-7",
        surface: "話す",
        ruby: [{ text: "話", reading: "はな" }, { text: "す" }],
        romaji: "hanasu",
        pos: "verb",
        baseForm: "話す",
        isPunctuation: false,
        bunsetsuId: null
      },
      {
        id: "s1-8",
        surface: "、",
        ruby: null,
        romaji: null,
        pos: "expression",
        baseForm: "、",
        isPunctuation: true,
        bunsetsuId: null
      },
      {
        id: "s1-9",
        surface: "再生",
        ruby: [{ text: "再生", reading: "さいせい" }],
        romaji: "saisei",
        pos: "noun",
        baseForm: "再生",
        isPunctuation: false,
        bunsetsuId: 2
      },
      {
        id: "s1-10",
        surface: "する",
        ruby: null,
        romaji: "suru",
        pos: "verb",
        baseForm: "する",
        isPunctuation: false,
        bunsetsuId: 2
      },
      {
        id: "s1-11",
        surface: "という",
        ruby: null,
        romaji: "toiu",
        pos: "expression",
        baseForm: "という",
        isPunctuation: false,
        bunsetsuId: null
      },
      {
        id: "s1-12",
        surface: "4つ",
        ruby: null,
        romaji: "yottsu",
        pos: "noun",
        baseForm: "4つ",
        isPunctuation: false,
        bunsetsuId: 3
      },
      {
        id: "s1-13",
        surface: "の",
        ruby: null,
        romaji: "no",
        pos: "particle",
        baseForm: "の",
        isPunctuation: false,
        bunsetsuId: 3
      },
      {
        id: "s1-14",
        surface: "ステップ",
        ruby: null,
        romaji: "suteppu",
        pos: "noun",
        baseForm: "ステップ",
        isPunctuation: false,
        bunsetsuId: 4
      },
      {
        id: "s1-15",
        surface: "によって",
        ruby: null,
        romaji: "niyotte",
        pos: "particle",
        baseForm: "によって",
        isPunctuation: false,
        bunsetsuId: 4
      },
      {
        id: "s1-16",
        surface: "構成",
        ruby: [{ text: "構成", reading: "こうせい" }],
        romaji: "kousei",
        pos: "noun",
        baseForm: "構成",
        isPunctuation: false,
        bunsetsuId: 5
      },
      {
        id: "s1-17",
        surface: "され",
        ruby: null,
        romaji: "sare",
        pos: "verb",
        baseForm: "する",
        isPunctuation: false,
        bunsetsuId: 5
      },
      {
        id: "s1-18",
        surface: "て",
        ruby: null,
        romaji: "te",
        pos: "particle",
        baseForm: "て",
        isPunctuation: false,
        bunsetsuId: 5
      },
      {
        id: "s1-19",
        surface: "いる",
        ruby: null,
        romaji: "iru",
        pos: "auxiliary",
        baseForm: "いる",
        isPunctuation: false,
        bunsetsuId: 5
      },
      {
        id: "s1-20",
        surface: "。",
        ruby: null,
        romaji: null,
        pos: "expression",
        baseForm: "。",
        isPunctuation: true,
        bunsetsuId: null
      }
    ]
  },
  {
    id: "s2",
    mode: "reading",
    // まずは会話を聞いて、それをできるだけ正確に再現しようとします。
    translation: "首先听对话，然后尝试尽可能准确地重现它。",
    tokens: [
      {
        id: "s2-0",
        surface: "まず",
        ruby: null,
        romaji: "mazu",
        pos: "adverb",
        baseForm: "まず",
        isPunctuation: false,
        bunsetsuId: null
      },
      {
        id: "s2-1",
        surface: "は",
        ruby: null,
        romaji: "wa",
        pos: "particle",
        baseForm: "は",
        isPunctuation: false,
        bunsetsuId: null
      },
      {
        id: "s2-2",
        surface: "会話",
        ruby: [{ text: "会話", reading: "かいわ" }],
        romaji: "kaiwa",
        pos: "noun",
        baseForm: "会話",
        isPunctuation: false,
        bunsetsuId: null
      },
      {
        id: "s2-3",
        surface: "を",
        ruby: null,
        romaji: "wo",
        pos: "particle",
        baseForm: "を",
        isPunctuation: false,
        bunsetsuId: null
      },
      {
        id: "s2-4",
        surface: "聞い",
        ruby: [{ text: "聞", reading: "き" }, { text: "い" }],
        romaji: "kiku",
        pos: "verb",
        baseForm: "聞く",
        isPunctuation: false,
        bunsetsuId: null
      },
      {
        id: "s2-5",
        surface: "て",
        ruby: null,
        romaji: "te",
        pos: "particle",
        baseForm: "て",
        isPunctuation: false,
        bunsetsuId: null
      },
      {
        id: "s2-6",
        surface: "、",
        ruby: null,
        romaji: null,
        pos: "expression",
        baseForm: "、",
        isPunctuation: true,
        bunsetsuId: null
      },
      {
        id: "s2-7",
        surface: "それ",
        ruby: null,
        romaji: "sore",
        pos: "pronoun",
        baseForm: "それ",
        isPunctuation: false,
        bunsetsuId: null
      },
      {
        id: "s2-8",
        surface: "を",
        ruby: null,
        romaji: "wo",
        pos: "particle",
        baseForm: "を",
        isPunctuation: false,
        bunsetsuId: null
      },
      {
        id: "s2-9",
        surface: "できる",
        ruby: null,
        romaji: "dekiru",
        pos: "verb",
        baseForm: "できる",
        isPunctuation: false,
        bunsetsuId: null
      },
      {
        id: "s2-10",
        surface: "だけ",
        ruby: null,
        romaji: "dake",
        pos: "particle",
        baseForm: "だけ",
        isPunctuation: false,
        bunsetsuId: null
      },
      {
        id: "s2-11",
        surface: "正確",
        ruby: [{ text: "正確", reading: "せいかく" }],
        romaji: "seikaku",
        pos: "adjective",
        baseForm: "正確",
        isPunctuation: false,
        bunsetsuId: null
      },
      {
        id: "s2-12",
        surface: "に",
        ruby: null,
        romaji: "ni",
        pos: "particle",
        baseForm: "に",
        isPunctuation: false,
        bunsetsuId: null
      },
      {
        id: "s2-13",
        surface: "再現",
        ruby: [{ text: "再現", reading: "さいげん" }],
        romaji: "saigen",
        pos: "noun",
        baseForm: "再現",
        isPunctuation: false,
        bunsetsuId: null
      },
      {
        id: "s2-14",
        surface: "し",
        ruby: null,
        romaji: "suru",
        pos: "verb",
        baseForm: "する",
        isPunctuation: false,
        bunsetsuId: null
      },
      {
        id: "s2-15",
        surface: "よう",
        ruby: null,
        romaji: "you",
        pos: "auxiliary",
        baseForm: "よう",
        isPunctuation: false,
        bunsetsuId: null
      },
      {
        id: "s2-16",
        surface: "と",
        ruby: null,
        romaji: "to",
        pos: "particle",
        baseForm: "と",
        isPunctuation: false,
        bunsetsuId: null
      },
      {
        id: "s2-17",
        surface: "し",
        ruby: null,
        romaji: "suru",
        pos: "verb",
        baseForm: "する",
        isPunctuation: false,
        bunsetsuId: null
      },
      {
        id: "s2-18",
        surface: "ます",
        ruby: null,
        romaji: "masu",
        pos: "auxiliary",
        baseForm: "ます",
        isPunctuation: false,
        bunsetsuId: null
      },
      {
        id: "s2-19",
        surface: "。",
        ruby: null,
        romaji: null,
        pos: "expression",
        baseForm: "。",
        isPunctuation: true,
        bunsetsuId: null
      }
    ]
  }
]
