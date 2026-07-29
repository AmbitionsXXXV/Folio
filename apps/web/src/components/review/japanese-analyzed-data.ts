import type {
  JapaneseAnalyzedSentence,
  JapaneseAnalyzedToken,
  JapaneseRubySegment
} from "@/lib/japanese-analysis"
import type { JapanesePartOfSpeech } from "@/lib/japanese-typing"

export type JapaneseReadingLocale = "en-US" | "ja-JP" | "zh-CN"

interface LocalizedReadingText {
  "en-US": string
  "ja-JP": string
  "zh-CN": string
}

export interface JapaneseReadingSentence extends Omit<
  JapaneseAnalyzedSentence,
  "translation"
> {
  translations: LocalizedReadingText
}

export interface JapaneseReadingWork {
  id: string
  title: string
  titleReading: string
  author: string
  authorReading: string
  firstPublishedYear: number
  descriptions: LocalizedReadingText
  sourceName: string
  sourceUrl: string
  rights: "public-domain"
  sentences: JapaneseReadingSentence[]
}

type WordSeed = readonly [
  surface: string,
  pos: JapanesePartOfSpeech,
  baseForm: string,
  romaji: string,
  bunsetsuId: number,
  ruby?: JapaneseRubySegment[]
]

type TokenSeed = WordSeed | string

const createTokens = (
  sentenceId: string,
  seeds: TokenSeed[]
): JapaneseAnalyzedToken[] =>
  seeds.map((seed, index) => {
    if (typeof seed === "string") {
      return {
        id: `${sentenceId}-${index}`,
        surface: seed,
        ruby: null,
        romaji: null,
        pos: "expression",
        baseForm: seed,
        isPunctuation: true,
        bunsetsuId: null
      }
    }

    const [surface, pos, baseForm, romaji, bunsetsuId, ruby = null] = seed

    return {
      id: `${sentenceId}-${index}`,
      surface,
      ruby,
      romaji,
      pos,
      baseForm,
      isPunctuation: false,
      bunsetsuId
    }
  })

const createSentence = ({
  id,
  tokens,
  translations
}: {
  id: string
  tokens: TokenSeed[]
  translations: LocalizedReadingText
}): JapaneseReadingSentence => ({
  id,
  mode: "analyzed",
  translations,
  tokens: createTokens(id, tokens)
})

export const JAPANESE_READING_WORKS: JapaneseReadingWork[] = [
  {
    id: "kumo-no-ito",
    title: "蜘蛛の糸",
    titleReading: "くものいと",
    author: "芥川 竜之介",
    authorReading: "あくたがわ りゅうのすけ",
    firstPublishedYear: 1918,
    descriptions: {
      "en-US":
        "A quiet opening above the lotus pond, before the story descends from paradise into hell.",
      "ja-JP": "極楽の蓮池から地獄へ視線が移っていく、静かな冒頭の二文です。",
      "zh-CN": "从极乐莲池向地狱展开视线的安静开篇。"
    },
    sourceName: "青空文庫",
    sourceUrl: "https://www.aozora.gr.jp/cards/000879/card92.html",
    rights: "public-domain",
    sentences: [
      createSentence({
        id: "kumo-no-ito-1",
        translations: {
          "en-US": "It was on a certain day.",
          "ja-JP": "ある日のことです。",
          "zh-CN": "这是某一天的事情。"
        },
        tokens: [
          ["ある", "verb", "ある", "aru", 0],
          ["日", "noun", "日", "hi", 0, [{ text: "日", reading: "ひ" }]],
          ["の", "particle", "の", "no", 1],
          ["事", "noun", "事", "koto", 1, [{ text: "事", reading: "こと" }]],
          ["で", "auxiliary", "だ", "de", 2],
          ["ござい", "verb", "ござる", "gozaru", 2],
          ["ます", "auxiliary", "ます", "masu", 2],
          "。"
        ]
      }),
      createSentence({
        id: "kumo-no-ito-2",
        translations: {
          "en-US":
            "The Buddha was strolling alone along the edge of the lotus pond in paradise.",
          "ja-JP":
            "お釈迦様は、極楽の蓮池のほとりを一人でゆっくり歩いていました。",
          "zh-CN": "释迦牟尼佛独自在极乐的莲池边悠闲地走着。"
        },
        tokens: [
          [
            "御釈迦様",
            "noun",
            "御釈迦様",
            "oshakasama",
            0,
            [{ text: "御釈迦様", reading: "おしゃかさま" }]
          ],
          ["は", "particle", "は", "wa", 0],
          [
            "極楽",
            "noun",
            "極楽",
            "gokuraku",
            1,
            [{ text: "極楽", reading: "ごくらく" }]
          ],
          ["の", "particle", "の", "no", 1],
          [
            "蓮池",
            "noun",
            "蓮池",
            "hasuike",
            2,
            [{ text: "蓮池", reading: "はすいけ" }]
          ],
          ["の", "particle", "の", "no", 2],
          ["ふち", "noun", "ふち", "fuchi", 2],
          ["を", "particle", "を", "wo", 2],
          "、",
          [
            "独り",
            "noun",
            "独り",
            "hitori",
            3,
            [{ text: "独", reading: "ひと" }, { text: "り" }]
          ],
          ["で", "particle", "で", "de", 3],
          ["ぶらぶら", "adverb", "ぶらぶら", "burabura", 4],
          [
            "御歩き",
            "noun",
            "御歩き",
            "oaruki",
            5,
            [
              { text: "御", reading: "お" },
              { text: "歩", reading: "ある" },
              { text: "き" }
            ]
          ],
          ["に", "particle", "に", "ni", 5],
          ["なっ", "verb", "なる", "naru", 6],
          ["て", "particle", "て", "te", 6],
          ["いらっしゃい", "verb", "いらっしゃる", "irassharu", 7],
          ["まし", "auxiliary", "ます", "masu", 7],
          ["た", "auxiliary", "た", "ta", 7],
          "。"
        ]
      })
    ]
  },
  {
    id: "chumon-no-ooi-ryoriten",
    title: "注文の多い料理店",
    titleReading: "ちゅうもんのおおいりょうりてん",
    author: "宮沢 賢治",
    authorReading: "みやざわ けんじ",
    firstPublishedYear: 1924,
    descriptions: {
      "en-US":
        "Two hunters mistake a series of ominous instructions for signs of a thriving restaurant.",
      "ja-JP":
        "二人の紳士が、不思議な料理店の「注文」を都合よく読み違えていく場面です。",
      "zh-CN": "两位绅士把诡异餐厅的层层“要求”误解为生意兴隆。"
    },
    sourceName: "青空文庫",
    sourceUrl: "https://www.aozora.gr.jp/cards/000081/card43754.html",
    rights: "public-domain",
    sentences: [
      createSentence({
        id: "chumon-no-ooi-ryoriten-1",
        translations: {
          "en-US":
            "This restaurant receives many orders, so please understand.",
          "ja-JP": "当店は注文が多い料理店ですので、その点をご了承ください。",
          "zh-CN": "本店是一家要求很多的餐厅，请您多多包涵。"
        },
        tokens: [
          "「",
          [
            "当軒",
            "noun",
            "当軒",
            "touken",
            0,
            [{ text: "当軒", reading: "とうけん" }]
          ],
          ["は", "particle", "は", "wa", 0],
          [
            "注文",
            "noun",
            "注文",
            "chuumon",
            1,
            [{ text: "注文", reading: "ちゅうもん" }]
          ],
          ["の", "particle", "の", "no", 1],
          [
            "多い",
            "adjective",
            "多い",
            "ooi",
            1,
            [{ text: "多", reading: "おお" }, { text: "い" }]
          ],
          [
            "料理店",
            "noun",
            "料理店",
            "ryouriten",
            2,
            [{ text: "料理店", reading: "りょうりてん" }]
          ],
          ["です", "auxiliary", "です", "desu", 2],
          ["から", "particle", "から", "kara", 2],
          ["どうか", "adverb", "どうか", "douka", 3],
          ["そこ", "pronoun", "そこ", "soko", 4],
          ["は", "particle", "は", "wa", 4],
          [
            "ご承知",
            "noun",
            "承知",
            "goshouchi",
            5,
            [{ text: "ご" }, { text: "承知", reading: "しょうち" }]
          ],
          ["ください", "verb", "くださる", "kudasaru", 5],
          "」"
        ]
      }),
      createSentence({
        id: "chumon-no-ooi-ryoriten-2",
        translations: {
          "en-US": "The two men opened the door as they spoke.",
          "ja-JP": "二人はそう話しながら、その扉を開けました。",
          "zh-CN": "两人一边说，一边打开了那扇门。"
        },
        tokens: [
          [
            "二人",
            "noun",
            "二人",
            "futari",
            0,
            [{ text: "二人", reading: "ふたり" }]
          ],
          ["は", "particle", "は", "wa", 0],
          [
            "云い",
            "verb",
            "云う",
            "iu",
            1,
            [{ text: "云", reading: "い" }, { text: "い" }]
          ],
          ["ながら", "particle", "ながら", "nagara", 1],
          "、",
          ["その", "pronoun", "その", "sono", 2],
          [
            "扉",
            "noun",
            "扉",
            "tobira",
            2,
            [{ text: "扉", reading: "とびら" }]
          ],
          ["を", "particle", "を", "wo", 2],
          ["あけ", "verb", "あける", "akeru", 3],
          ["まし", "auxiliary", "ます", "masu", 3],
          ["た", "auxiliary", "た", "ta", 3],
          "。"
        ]
      })
    ]
  },
  {
    id: "gon-gitsune",
    title: "ごん狐",
    titleReading: "ごんぎつね",
    author: "新美 南吉",
    authorReading: "にいみ なんきち",
    firstPublishedYear: 1932,
    descriptions: {
      "en-US":
        "A village story introduces Gon, a lonely young fox whose mischief leads to a tragic misunderstanding.",
      "ja-JP":
        "村の語りから始まり、ひとりぼっちの小狐「ごん」を紹介する冒頭です。",
      "zh-CN": "从村庄传说开始，介绍孤零零的小狐狸“阿权”。"
    },
    sourceName: "青空文庫",
    sourceUrl: "https://www.aozora.gr.jp/cards/000121/card628.html",
    rights: "public-domain",
    sentences: [
      createSentence({
        id: "gon-gitsune-1",
        translations: {
          "en-US":
            "This is a story I heard as a child from an old man in the village named Mohei.",
          "ja-JP":
            "これは、私が幼いころ、村の茂平というおじいさんから聞いた話です。",
          "zh-CN": "这是我小时候从村里一位叫茂平的老人那里听来的故事。"
        },
        tokens: [
          ["これ", "pronoun", "これ", "kore", 0],
          ["は", "particle", "は", "wa", 0],
          "、",
          [
            "私",
            "pronoun",
            "私",
            "watashi",
            1,
            [{ text: "私", reading: "わたし" }]
          ],
          ["が", "particle", "が", "ga", 1],
          [
            "小さい",
            "adjective",
            "小さい",
            "chiisai",
            2,
            [{ text: "小", reading: "ちい" }, { text: "さい" }]
          ],
          ["とき", "noun", "とき", "toki", 2],
          ["に", "particle", "に", "ni", 2],
          "、",
          ["村", "noun", "村", "mura", 3, [{ text: "村", reading: "むら" }]],
          ["の", "particle", "の", "no", 3],
          [
            "茂平",
            "noun",
            "茂平",
            "mohei",
            4,
            [{ text: "茂平", reading: "もへい" }]
          ],
          ["という", "expression", "という", "toiu", 4],
          ["おじいさん", "noun", "おじいさん", "ojiisan", 5],
          ["から", "particle", "から", "kara", 5],
          ["きい", "verb", "きく", "kiku", 6],
          ["た", "auxiliary", "た", "ta", 6],
          [
            "お話",
            "noun",
            "話",
            "ohanashi",
            7,
            [{ text: "お" }, { text: "話", reading: "はなし" }]
          ],
          ["です", "auxiliary", "です", "desu", 7],
          "。"
        ]
      }),
      createSentence({
        id: "gon-gitsune-2",
        translations: {
          "en-US":
            "Gon was a lonely young fox who lived in a hole he had dug in a forest thick with ferns.",
          "ja-JP":
            "ごんはひとりぼっちの小狐で、しだが生い茂る森に穴を掘って住んでいました。",
          "zh-CN": "阿权是一只孤零零的小狐狸，在长满蕨草的森林里挖洞生活。"
        },
        tokens: [
          ["ごん", "noun", "ごん", "gon", 0],
          ["は", "particle", "は", "wa", 0],
          "、",
          [
            "一人ぼっち",
            "noun",
            "一人ぼっち",
            "hitoribocchi",
            1,
            [{ text: "一人", reading: "ひとり" }, { text: "ぼっち" }]
          ],
          ["の", "particle", "の", "no", 1],
          [
            "小狐",
            "noun",
            "小狐",
            "kogitsune",
            2,
            [{ text: "小狐", reading: "こぎつね" }]
          ],
          ["で", "auxiliary", "だ", "de", 2],
          "、",
          ["しだ", "noun", "しだ", "shida", 3],
          ["の", "particle", "の", "no", 3],
          [
            "一ぱい",
            "adverb",
            "一ぱい",
            "ippai",
            4,
            [{ text: "一", reading: "いっ" }, { text: "ぱい" }]
          ],
          ["しげっ", "verb", "しげる", "shigeru", 4],
          ["た", "auxiliary", "た", "ta", 4],
          ["森", "noun", "森", "mori", 5, [{ text: "森", reading: "もり" }]],
          ["の", "particle", "の", "no", 5],
          ["中", "noun", "中", "naka", 5, [{ text: "中", reading: "なか" }]],
          ["に", "particle", "に", "ni", 5],
          ["穴", "noun", "穴", "ana", 6, [{ text: "穴", reading: "あな" }]],
          ["を", "particle", "を", "wo", 6],
          ["ほっ", "verb", "ほる", "horu", 7],
          ["て", "particle", "て", "te", 7],
          [
            "住ん",
            "verb",
            "住む",
            "sumu",
            8,
            [{ text: "住", reading: "す" }, { text: "ん" }]
          ],
          ["で", "particle", "で", "de", 8],
          ["い", "verb", "いる", "iru", 8],
          ["まし", "auxiliary", "ます", "masu", 8],
          ["た", "auxiliary", "た", "ta", 8],
          "。"
        ]
      })
    ]
  }
]
