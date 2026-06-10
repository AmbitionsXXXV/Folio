import type { JapaneseTypingExercise } from "@/lib/japanese-typing"

export const JAPANESE_TYPING_EXERCISES: JapaneseTypingExercise[] = [
  {
    id: "daily-study",
    level: "N5",
    scene: "daily-routine",
    prompt: "用一句礼貌体日语描述你的学习习惯。",
    focus: "基础陈述 + 频率表达",
    japanese: "私は毎日日本語を勉強します。",
    reading: "わたしは まいにち にほんごを べんきょうします。",
    romaji: "watashi wa mainichi nihongo o benkyou shimasu",
    translation: "I study Japanese every day.",
    grammarPoints: [
      {
        id: "topic-wa",
        pattern: "〜は",
        title: "主题提示",
        explanation: "「は」先提出主题，再说明关于这个主题的内容。",
        example: "私は学生です。"
      },
      {
        id: "object-o",
        pattern: "〜を",
        title: "宾语标记",
        explanation: "「を」标记动作直接作用的对象，这里指「日本語」。",
        example: "コーヒーを飲みます。"
      },
      {
        id: "habitual-shimasu",
        pattern: "〜します",
        title: "礼貌体习惯表达",
        explanation: "动词礼貌体常用于陈述日常习惯或一般事实。",
        example: "毎朝運動します。"
      }
    ],
    vocabulary: [
      {
        id: "watashi",
        term: "私",
        reading: "わたし",
        meaning: "我",
        partOfSpeech: "代词",
        example: "私は留学生です。"
      },
      {
        id: "mainichi",
        term: "毎日",
        reading: "まいにち",
        meaning: "每天",
        partOfSpeech: "副词",
        example: "毎日少しずつ練習します。"
      },
      {
        id: "nihongo",
        term: "日本語",
        reading: "にほんご",
        meaning: "日语",
        partOfSpeech: "名词",
        example: "日本語の授業があります。"
      },
      {
        id: "benkyou-shimasu",
        term: "勉強します",
        reading: "べんきょうします",
        meaning: "学习",
        partOfSpeech: "动词",
        example: "図書館で勉強します。"
      }
    ],
    tokens: [
      { surface: "私", reading: "わたし", romaji: "watashi", pos: "pronoun" },
      { surface: "は", reading: "は", romaji: "wa", pos: "particle" },
      {
        surface: "毎日",
        reading: "まいにち",
        romaji: "mainichi",
        pos: "adverb"
      },
      {
        surface: "日本語",
        reading: "にほんご",
        romaji: "nihongo",
        pos: "noun"
      },
      { surface: "を", reading: "を", romaji: "o", pos: "particle" },
      {
        surface: "勉強します",
        reading: "べんきょうします",
        romaji: "benkyou shimasu",
        pos: "verb"
      }
    ]
  },
  {
    id: "rainy-day",
    level: "N5-N4",
    scene: "weather",
    prompt: "说明天气原因，并描述你因此做的事情。",
    focus: "原因说明 + 场所表达",
    japanese: "今日は雨が降っているので、家で本を読みます。",
    reading: "きょうは あめが ふっているので、いえで ほんを よみます。",
    romaji: "kyou wa ame ga futte iru node ie de hon o yomimasu",
    translation: "Because it is raining today, I read a book at home.",
    grammarPoints: [
      {
        id: "te-iru",
        pattern: "〜ている",
        title: "动作进行 / 状态持续",
        explanation: "「降っている」表示雨正在下，也可理解为当前持续状态。",
        example: "雪が降っています。"
      },
      {
        id: "node",
        pattern: "〜ので",
        title: "柔和原因表达",
        explanation: "「ので」用于说明原因，比「から」更柔和、书面感更强。",
        example: "忙しいので、先に失礼します。"
      },
      {
        id: "place-de",
        pattern: "〜で",
        title: "动作发生场所",
        explanation: "「家で」表示动作「読む」发生的地点是在家里。",
        example: "教室で日本語を話します。"
      }
    ],
    vocabulary: [
      {
        id: "kyou",
        term: "今日",
        reading: "きょう",
        meaning: "今天",
        partOfSpeech: "名词",
        example: "今日は忙しいです。"
      },
      {
        id: "ame",
        term: "雨",
        reading: "あめ",
        meaning: "雨",
        partOfSpeech: "名词",
        example: "雨が強いです。"
      },
      {
        id: "ie",
        term: "家",
        reading: "いえ",
        meaning: "家",
        partOfSpeech: "名词",
        example: "家で休みます。"
      },
      {
        id: "hon",
        term: "本",
        reading: "ほん",
        meaning: "书",
        partOfSpeech: "名词",
        example: "本を二冊買いました。"
      },
      {
        id: "yomimasu",
        term: "読みます",
        reading: "よみます",
        meaning: "阅读",
        partOfSpeech: "动词",
        example: "新聞を読みます。"
      }
    ],
    tokens: [
      { surface: "今日", reading: "きょう", romaji: "kyou", pos: "noun" },
      { surface: "は", reading: "は", romaji: "wa", pos: "particle" },
      { surface: "雨", reading: "あめ", romaji: "ame", pos: "noun" },
      { surface: "が", reading: "が", romaji: "ga", pos: "particle" },
      {
        surface: "降っている",
        reading: "ふっている",
        romaji: "futte iru",
        pos: "verb"
      },
      { surface: "ので", reading: "ので", romaji: "node", pos: "particle" },
      { surface: "家", reading: "いえ", romaji: "ie", pos: "noun" },
      { surface: "で", reading: "で", romaji: "de", pos: "particle" },
      { surface: "本", reading: "ほん", romaji: "hon", pos: "noun" },
      { surface: "を", reading: "を", romaji: "o", pos: "particle" },
      {
        surface: "読みます",
        reading: "よみます",
        romaji: "yomimasu",
        pos: "verb"
      }
    ]
  },
  {
    id: "weekend-movie",
    level: "N5-N4",
    scene: "weekend-plan",
    prompt: "表达周末想和朋友一起做的事情。",
    focus: "愿望表达 + 同伴 + 目的",
    japanese: "週末に友達と映画を見に行きたいです。",
    reading: "しゅうまつに ともだちと えいがを みに いきたいです。",
    romaji: "shuumatsu ni tomodachi to eiga o mi ni ikitai desu",
    translation: "I want to go watch a movie with my friend on the weekend.",
    grammarPoints: [
      {
        id: "time-ni",
        pattern: "〜に",
        title: "时间点提示",
        explanation: "「週末に」点出动作发生的时间点。",
        example: "七時に起きます。"
      },
      {
        id: "companion-to",
        pattern: "〜と",
        title: "共同者表达",
        explanation: "「友達と」表示和谁一起做这件事。",
        example: "先生と話しました。"
      },
      {
        id: "purpose-ni-iku",
        pattern: "〜に行く",
        title: "去做某事",
        explanation: "动词ます形去掉ます后接「に行く」，表示去做该动作。",
        example: "買い物に行きます。"
      },
      {
        id: "tai-desu",
        pattern: "〜たいです",
        title: "愿望表达",
        explanation: "「行きたいです」表示说话人想去做某事。",
        example: "日本へ行きたいです。"
      }
    ],
    vocabulary: [
      {
        id: "shuumatsu",
        term: "週末",
        reading: "しゅうまつ",
        meaning: "周末",
        partOfSpeech: "名词",
        example: "週末にアルバイトがあります。"
      },
      {
        id: "tomodachi",
        term: "友達",
        reading: "ともだち",
        meaning: "朋友",
        partOfSpeech: "名词",
        example: "友達とカフェへ行きます。"
      },
      {
        id: "eiga",
        term: "映画",
        reading: "えいが",
        meaning: "电影",
        partOfSpeech: "名词",
        example: "映画が好きです。"
      },
      {
        id: "mimasu",
        term: "見ます",
        reading: "みます",
        meaning: "看",
        partOfSpeech: "动词",
        example: "毎晩ニュースを見ます。"
      },
      {
        id: "ikitai",
        term: "行きたいです",
        reading: "いきたいです",
        meaning: "想去",
        partOfSpeech: "表达",
        example: "北海道へ行きたいです。"
      }
    ],
    tokens: [
      {
        surface: "週末",
        reading: "しゅうまつ",
        romaji: "shuumatsu",
        pos: "noun"
      },
      { surface: "に", reading: "に", romaji: "ni", pos: "particle" },
      {
        surface: "友達",
        reading: "ともだち",
        romaji: "tomodachi",
        pos: "noun"
      },
      { surface: "と", reading: "と", romaji: "to", pos: "particle" },
      { surface: "映画", reading: "えいが", romaji: "eiga", pos: "noun" },
      { surface: "を", reading: "を", romaji: "o", pos: "particle" },
      { surface: "見", reading: "み", romaji: "mi", pos: "verb" },
      { surface: "に", reading: "に", romaji: "ni", pos: "particle" },
      {
        surface: "行きたいです",
        reading: "いきたいです",
        romaji: "ikitai desu",
        pos: "expression"
      }
    ]
  },
  {
    id: "before-japan",
    level: "N4",
    scene: "study-plan",
    prompt: "用“在……之前”表达学习准备。",
    focus: "顺序表达 + 方向助词 + 过去式",
    japanese: "日本へ行く前に、ひらがなとカタカナを覚えました。",
    reading: "にほんへ いく まえに、ひらがなと カタカナを おぼえました。",
    romaji: "nihon e iku mae ni hiragana to katakana o oboemashita",
    translation: "Before going to Japan, I memorized hiragana and katakana.",
    grammarPoints: [
      {
        id: "e-direction",
        pattern: "〜へ",
        title: "方向助词",
        explanation: "「へ」强调移动方向，常用于地点前表示“往……去”。",
        example: "学校へ行きます。"
      },
      {
        id: "mae-ni",
        pattern: "〜前に",
        title: "在……之前",
        explanation: "动词辞书形接「前に」，表示某动作发生之前的时间点。",
        example: "寝る前に歯を磨きます。"
      },
      {
        id: "past-polite",
        pattern: "〜ました",
        title: "礼貌体过去式",
        explanation: "「覚えました」表示已经完成的动作。",
        example: "新しい単語を覚えました。"
      }
    ],
    vocabulary: [
      {
        id: "nihon",
        term: "日本",
        reading: "にほん",
        meaning: "日本",
        partOfSpeech: "名词",
        example: "日本へ留学します。"
      },
      {
        id: "mae",
        term: "前",
        reading: "まえ",
        meaning: "之前；前面",
        partOfSpeech: "名词",
        example: "授業の前に復習します。"
      },
      {
        id: "hiragana",
        term: "ひらがな",
        reading: "ひらがな",
        meaning: "平假名",
        partOfSpeech: "名词",
        example: "ひらがなは日本語の基本です。"
      },
      {
        id: "katakana",
        term: "カタカナ",
        reading: "カタカナ",
        meaning: "片假名",
        partOfSpeech: "名词",
        example: "カタカナで名前を書きます。"
      },
      {
        id: "oboemashita",
        term: "覚えました",
        reading: "おぼえました",
        meaning: "记住了",
        partOfSpeech: "动词",
        example: "新しい表現を覚えました。"
      }
    ],
    tokens: [
      { surface: "日本", reading: "にほん", romaji: "nihon", pos: "noun" },
      { surface: "へ", reading: "へ", romaji: "e", pos: "particle" },
      { surface: "行く", reading: "いく", romaji: "iku", pos: "verb" },
      { surface: "前", reading: "まえ", romaji: "mae", pos: "noun" },
      { surface: "に", reading: "に", romaji: "ni", pos: "particle" },
      {
        surface: "ひらがな",
        reading: "ひらがな",
        romaji: "hiragana",
        pos: "noun"
      },
      { surface: "と", reading: "と", romaji: "to", pos: "particle" },
      {
        surface: "カタカナ",
        reading: "カタカナ",
        romaji: "katakana",
        pos: "noun"
      },
      { surface: "を", reading: "を", romaji: "o", pos: "particle" },
      {
        surface: "覚えました",
        reading: "おぼえました",
        romaji: "oboemashita",
        pos: "verb"
      }
    ]
  },
  {
    id: "ask-then-practice",
    level: "N4",
    scene: "classroom",
    prompt: "用“先……然后……”描述课堂中的行动顺序。",
    focus: "先后顺序 + 对象 + 持续动作",
    japanese: "先生に質問してから、練習を続けました。",
    reading: "せんせいに しつもんしてから、れんしゅうを つづけました。",
    romaji: "sensei ni shitsumon shite kara renshuu o tsuzukemashita",
    translation: "After asking the teacher a question, I continued practicing.",
    grammarPoints: [
      {
        id: "target-ni",
        pattern: "〜に",
        title: "动作对象",
        explanation: "这里的「先生に」表示提问的对象是老师。",
        example: "店員さんに聞きます。"
      },
      {
        id: "te-kara",
        pattern: "〜てから",
        title: "先……再……",
        explanation: "「〜てから」明确表示前项完成之后，再进行后项。",
        example: "ご飯を食べてから勉強します。"
      },
      {
        id: "tsuzukeru",
        pattern: "〜を続ける",
        title: "继续做某事",
        explanation: "「続けました」说明练习在提问之后仍然继续进行。",
        example: "毎日日記を書き続けています。"
      }
    ],
    vocabulary: [
      {
        id: "sensei",
        term: "先生",
        reading: "せんせい",
        meaning: "老师",
        partOfSpeech: "名词",
        example: "先生にメールを送りました。"
      },
      {
        id: "shitsumon",
        term: "質問",
        reading: "しつもん",
        meaning: "问题；提问",
        partOfSpeech: "名词",
        example: "質問があります。"
      },
      {
        id: "renshuu",
        term: "練習",
        reading: "れんしゅう",
        meaning: "练习",
        partOfSpeech: "名词",
        example: "発音の練習をします。"
      },
      {
        id: "tsuzukemashita",
        term: "続けました",
        reading: "つづけました",
        meaning: "继续了",
        partOfSpeech: "动词",
        example: "授業のあとも練習を続けました。"
      }
    ],
    tokens: [
      { surface: "先生", reading: "せんせい", romaji: "sensei", pos: "noun" },
      { surface: "に", reading: "に", romaji: "ni", pos: "particle" },
      {
        surface: "質問して",
        reading: "しつもんして",
        romaji: "shitsumon shite",
        pos: "verb"
      },
      { surface: "から", reading: "から", romaji: "kara", pos: "particle" },
      {
        surface: "練習",
        reading: "れんしゅう",
        romaji: "renshuu",
        pos: "noun"
      },
      { surface: "を", reading: "を", romaji: "o", pos: "particle" },
      {
        surface: "続けました",
        reading: "つづけました",
        romaji: "tsuzukemashita",
        pos: "verb"
      }
    ]
  }
]
