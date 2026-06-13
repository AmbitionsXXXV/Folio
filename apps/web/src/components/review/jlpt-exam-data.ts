import type { JlptQuestion } from "@/lib/jlpt-exam"

/**
 * Mock JLPT practice questions (N5–N1, vocabulary + grammar) authored and
 * adversarially verified for reading accuracy, 接续 (connection) correctness,
 * and unambiguous answer keys. This is the frontend-first placeholder layer:
 * once the seeded JLPT tables land (docs/research/japanese-nlp-jlpt.md) these
 * can be replaced by live data of the same shape.
 *
 * Levels are an UNOFFICIAL study-grouping heuristic — see the research doc §4
 * and the in-UI disclaimer.
 */
export const JLPT_EXAM_QUESTIONS: JlptQuestion[] = [
  {
    id: "n5-1",
    level: "N5",
    section: "vocabulary",
    type: "kanjiReading",
    prompt: "きょうは「天気」がいいですね。",
    promptReading: "きょうは てんきが いいですね。",
    choices: [
      {
        id: "n5-1-0",
        text: "でんき",
        note: '✗「電気」的读音，意为"电、电灯"，汉字不同。'
      },
      {
        id: "n5-1-1",
        text: "てんき",
        note: "✓「天」音读テン+「気」音读キ＝てんき，正确读音。"
      },
      {
        id: "n5-1-2",
        text: "てんぎ",
        note: "✗ 第二字误浊音化，「気」读き不读ぎ。"
      },
      {
        id: "n5-1-3",
        text: "でんぎ",
        note: "✗ 两字都读错（均浊音化），不存在此读法。"
      }
    ],
    correctChoiceId: "n5-1-1",
    translation: "今天天气真好啊。",
    grammar: null,
    vocabulary: [
      {
        term: "天気",
        reading: "てんき",
        meaning: "天气",
        partOfSpeech: "名詞"
      },
      {
        term: "電気",
        reading: "でんき",
        meaning: "电；电灯",
        partOfSpeech: "名詞"
      }
    ]
  },
  {
    id: "n5-2",
    level: "N5",
    section: "vocabulary",
    type: "context",
    prompt: "あついですから、まどを＿＿＿ください。",
    promptReading: "あついですから、まどを あけて ください。",
    choices: [
      {
        id: "n5-2-0",
        text: "あけて",
        note: "✓「窓を開ける」＝开窗，热所以开窗，符合语境。"
      },
      {
        id: "n5-2-1",
        text: "しめて",
        note: '✗「閉める」＝关上，与"热"矛盾。'
      },
      {
        id: "n5-2-2",
        text: "けして",
        note: "✗「消す」＝关掉（灯、电源），不能用于窗户。"
      },
      {
        id: "n5-2-3",
        text: "つけて",
        note: "✗「点ける」＝打开（灯、电器），不与窗户搭配。"
      }
    ],
    correctChoiceId: "n5-2-0",
    translation: "因为很热，请把窗户打开。",
    grammar: null,
    vocabulary: [
      {
        term: "開ける",
        reading: "あける",
        meaning: "打开（门、窗等）",
        partOfSpeech: "動詞"
      },
      {
        term: "閉める",
        reading: "しめる",
        meaning: "关上（门、窗等）",
        partOfSpeech: "動詞"
      }
    ]
  },
  {
    id: "n5-3",
    level: "N5",
    section: "vocabulary",
    type: "paraphrase",
    prompt: "この もんだいは「やさしい」です。",
    promptReading: "この もんだいは やさしいです。",
    choices: [
      {
        id: "n5-3-0",
        text: "むずかしくないです",
        note: '✓「やさしい」＝简单，等于"不难"，意思最接近。'
      },
      {
        id: "n5-3-1",
        text: "おもしろいです",
        note: '✗ 意为"有趣"，与"简单"无关。'
      },
      {
        id: "n5-3-2",
        text: "たかいです",
        note: '✗ 意为"高/贵"，与难易无关。'
      },
      {
        id: "n5-3-3",
        text: "あぶないです",
        note: '✗ 意为"危险"，与"简单"不同。'
      }
    ],
    correctChoiceId: "n5-3-0",
    translation: "这道题很简单。",
    grammar: null,
    vocabulary: [
      {
        term: "易しい",
        reading: "やさしい",
        meaning: "简单的，容易的",
        partOfSpeech: "形容詞"
      },
      {
        term: "難しい",
        reading: "むずかしい",
        meaning: "难的",
        partOfSpeech: "形容詞"
      }
    ]
  },
  {
    id: "n5-4",
    level: "N5",
    section: "grammar",
    type: "grammarForm",
    prompt: "わたしは まいあさ パン＿＿＿ たべます。",
    promptReading: "わたしは まいあさ パンを たべます。",
    choices: [
      {
        id: "n5-4-0",
        text: "が",
        note: "✗ 主格助词，标示主语，不用于他动词的宾语。"
      },
      {
        id: "n5-4-1",
        text: "に",
        note: '✗ 表示时间、归着点等，不能标示"吃"的对象。'
      },
      {
        id: "n5-4-2",
        text: "を",
        note: "✓ 他动词「食べる」的宾语用「を」标示。"
      },
      {
        id: "n5-4-3",
        text: "で",
        note: "✗ 表示场所、手段，不能标示宾语。"
      }
    ],
    correctChoiceId: "n5-4-2",
    translation: "我每天早上吃面包。",
    grammar: {
      pattern: "～を（动作对象）",
      reading: "を",
      meaning: "标示他动词的宾语（动作的对象）",
      connection: "名詞＋を＋他動詞",
      explanation:
        '「を」是宾格助词，接在名词后表示动作所及的对象，如「パンを食べる」吃面包。区别于「が」（标示主语）、「に」（标示时间/归着点/对象方向）、「で」（标示场所或手段）。此句"吃面包"，面包是"吃"这一他动词的对象，故用「を」。'
    },
    vocabulary: null
  },
  {
    id: "n5-5",
    level: "N5",
    section: "grammar",
    type: "grammarForm",
    prompt: "きのうは あめ＿＿＿、どこも いきませんでした。",
    promptReading: "きのうは あめだったので、どこも いきませんでした。",
    choices: [
      {
        id: "n5-5-0",
        text: "だったので",
        note: '✓ 名词过去式＋ので，表客观原因"因为（昨天）下雨了"。'
      },
      {
        id: "n5-5-1",
        text: "なので",
        note: '✗「な＋ので」是现在式，与后句过去"没去"时态不一致。'
      },
      {
        id: "n5-5-2",
        text: "でので",
        note: "✗ 不存在此接续，「で＋ので」语法错误。"
      },
      {
        id: "n5-5-3",
        text: "のので",
        note: "✗ 接续错误，名词不直接用「のので」。"
      }
    ],
    correctChoiceId: "n5-5-0",
    translation: "因为昨天下雨了，所以哪儿也没去。",
    grammar: {
      pattern: "～ので（名词用法）",
      reading: "ので",
      meaning: "因为……所以……（表客观原因、理由）",
      connection: "名詞＋な＋ので（现在）／名詞＋だった＋ので（过去）",
      explanation:
        '「ので」表示客观的原因理由，语气比「から」委婉客观。接名词时现在用「名詞＋なので」，过去用「名詞＋だったので」。本句后句是过去式「行きませんでした」，前句"下雨"也是过去发生的事实，故用「雨だったので」。「なので」是现在式不合本句时态；「でので」「のので」均为错误接续。'
    },
    vocabulary: null
  },
  {
    id: "n5-6",
    level: "N5",
    section: "grammar",
    type: "grammarForm",
    prompt:
      "A「いっしょに えいがを みに いきませんか。」B「いいですね。＿＿＿いきましょう。」",
    promptReading:
      "A「いっしょに えいがを みに いきませんか。」B「いいですね。ぜひ いきましょう。」",
    choices: [
      {
        id: "n5-6-0",
        text: "あまり",
        note: '✗「あまり」后接否定，意为"不太……"，与肯定邀约不合。'
      },
      {
        id: "n5-6-1",
        text: "ぜひ",
        note: '✓「ぜひ」表强烈意愿"一定、务必"，常与「ましょう」搭配。'
      },
      {
        id: "n5-6-2",
        text: "まだ",
        note: '✗ 意为"还、尚"，表示动作未发生，不合语境。'
      },
      {
        id: "n5-6-3",
        text: "もう",
        note: '✗ 意为"已经"，表示已完成，与"一起去吧"的邀约不合。'
      }
    ],
    correctChoiceId: "n5-6-1",
    translation: 'A："要不要一起去看电影？"B："好啊，一定去吧。"',
    grammar: {
      pattern: "ぜひ～（ましょう／たい／てください）",
      reading: "ぜひ",
      meaning: "一定，务必，无论如何（表示强烈的愿望或邀请）",
      connection:
        "ぜひ＋意志/愿望/请求表达（～ましょう／～たい／～てください 等）",
      explanation:
        "「ぜひ」是副词，表示说话人强烈的意愿或诚恳的请求，常与「～ましょう」「～たいです」「～てください」呼应，如「ぜひ行きましょう」一定去吧。区别于「あまり」（后接否定，不太……）、「まだ」（还、尚未）、「もう」（已经）。本句回应邀请、表达积极意愿，故用「ぜひ」。"
    },
    vocabulary: null
  },
  {
    id: "n4-1",
    level: "N4",
    section: "vocabulary",
    type: "kanjiReading",
    prompt: "このセーターは「品物」がいいので、長く使えます。",
    promptReading: "このせーたーはしなものがいいので、ながくつかえます。",
    choices: [
      {
        id: "n4-1-0",
        text: "ひんもの",
        note: "✗ 「品」误用音读ひん，但此处「品物」要训读しな"
      },
      {
        id: "n4-1-1",
        text: "しなもの",
        note: "✓ 「品物」读作しなもの，意为「物品、商品」，是正确的训读组合"
      },
      {
        id: "n4-1-2",
        text: "しなぶつ",
        note: "✗ 後半「物」误用音读ぶつ，应为训读もの"
      },
      {
        id: "n4-1-3",
        text: "ひんぶつ",
        note: "✗ 整词都用音读ひんぶつ，不存在此读法"
      }
    ],
    correctChoiceId: "n4-1-1",
    translation: "这件毛衣品质好，所以能用很久。",
    grammar: null,
    vocabulary: [
      {
        term: "品物",
        reading: "しなもの",
        meaning: "物品，商品，东西",
        partOfSpeech: "名詞"
      }
    ]
  },
  {
    id: "n4-2",
    level: "N4",
    section: "vocabulary",
    type: "context",
    prompt: "電車が遅れて、約束の時間に＿＿＿しまった。",
    promptReading: "でんしゃがおくれて、やくそくのじかんにおくれてしまった。",
    choices: [
      {
        id: "n4-2-0",
        text: "おくれて",
        note: "✓ 「遅れる」意为「迟到、晚到」，电车晚点导致赶不上约定时间，与「～てしまった」搭配自然，因果通顺"
      },
      {
        id: "n4-2-1",
        text: "まにあって",
        note: "✗ 「間に合って」意为「赶上了」，与电车晚点导致的负面结果矛盾"
      },
      {
        id: "n4-2-2",
        text: "つごうがよくて",
        note: "✗ 「都合がよくて」意为「方便、合适」，且不能接「しまった」，语义与接续都不合"
      },
      {
        id: "n4-2-3",
        text: "たりなくて",
        note: "✗ 「足りなくて」意为「不够」，用于数量不足，不指迟到，且接续不合"
      }
    ],
    correctChoiceId: "n4-2-0",
    translation: "电车晚点了，结果迟到了约定的时间（没能准时赴约）。",
    grammar: null,
    vocabulary: [
      {
        term: "遅れる",
        reading: "おくれる",
        meaning: "迟到，晚点，落后",
        partOfSpeech: "動詞"
      },
      {
        term: "間に合う",
        reading: "まにあう",
        meaning: "来得及，赶得上；够用",
        partOfSpeech: "動詞"
      }
    ]
  },
  {
    id: "n4-3",
    level: "N4",
    section: "vocabulary",
    type: "paraphrase",
    prompt: "父は今、とても「いそがしい」です。",
    promptReading: "ちちはいま、とてもいそがしいです。",
    choices: [
      {
        id: "n4-3-0",
        text: "ひまな",
        note: "✗ 「暇な」是「空闲的」，与「忙しい」意思相反"
      },
      {
        id: "n4-3-1",
        text: "げんきな",
        note: "✗ 「元気な」是「有精神、健康」，与忙碌无关"
      },
      {
        id: "n4-3-2",
        text: "手が離せない",
        note: "✓ 「手が離せない」字面是「手离不开」，引申为「正忙得抽不开身」，与「忙しい」意思最接近"
      },
      {
        id: "n4-3-3",
        text: "やすんでいる",
        note: "✗ 「休んでいる」是「正在休息」，与忙碌相反"
      }
    ],
    correctChoiceId: "n4-3-2",
    translation: "父亲现在非常忙（忙得抽不开身）。",
    grammar: null,
    vocabulary: [
      {
        term: "忙しい",
        reading: "いそがしい",
        meaning: "忙碌的",
        partOfSpeech: "形容詞"
      },
      {
        term: "手が離せない",
        reading: "てがはなせない",
        meaning: "忙得抽不开身，分不开身",
        partOfSpeech: "慣用句"
      }
    ]
  },
  {
    id: "n4-4",
    level: "N4",
    section: "grammar",
    type: "grammarForm",
    prompt: "日本へ来た＿＿＿、一度も富士山を見たことがありません。",
    promptReading:
      "にほんへきたばかりなので、いちどもふじさんをみたことがありません。",
    choices: [
      {
        id: "n4-4-0",
        text: "ところで",
        note: "✗ 「～たところで」表示「即使…也（白费）」，后接消极结果，语义不合"
      },
      {
        id: "n4-4-1",
        text: "ばかりなので",
        note: "✓ 「～たばかり」表示「刚刚…」，刚来日本所以还没看过富士山，因果通顺"
      },
      {
        id: "n4-4-2",
        text: "とおりに",
        note: "✗ 「～とおりに」表示「按照…」，需要前面有可遵照的内容，语义不合"
      },
      {
        id: "n4-4-3",
        text: "あいだに",
        note: "✗ 「～あいだに」表示「在…期间内」，接续与语义都不合"
      }
    ],
    correctChoiceId: "n4-4-1",
    translation: "我刚来日本，所以一次也没看过富士山。",
    grammar: {
      pattern: "～たばかり",
      reading: "～たばかり",
      meaning: "刚刚…，刚…不久",
      connection: "動詞た形＋ばかり",
      explanation:
        "表示动作刚刚完成、时间过去不久，强调说话人主观上觉得「才过了一小会儿」。与表示客观时间短的「～たところ」不同：「～たばかり」侧重主观感觉，即使实际过了一段时间也能用（如「日本へ来たばかり」可指来了几个月）。本题中「来たばかりなので」表示刚来日本不久，因此还没看过富士山，因果自然。选项「ところで／とおりに／あいだに」在语义或接续上均不成立。"
    },
    vocabulary: null
  },
  {
    id: "n4-5",
    level: "N4",
    section: "grammar",
    type: "grammarForm",
    prompt: "電車が来る時間に＿＿＿ように、早く家を出ましょう。",
    promptReading:
      "でんしゃがくるじかんにまにあうように、はやくいえをでましょう。",
    choices: [
      {
        id: "n4-5-0",
        text: "まにあう",
        note: "✓ 「間に合う」是无意志的可能性动词，与表示目标的「～ように」搭配，意为「为了赶得上…」，语义自然"
      },
      {
        id: "n4-5-1",
        text: "まにあおう",
        note: "✗ 意志形「間に合おう」不能接「ように」（ように前接辞书形或ない形），接续错误"
      },
      {
        id: "n4-5-2",
        text: "まにあって",
        note: "✗ て形「間に合って」不能直接接「ように」，接续错误"
      },
      {
        id: "n4-5-3",
        text: "まにあった",
        note: "✗ た形「間に合った」表示已完成，与表目标的「ように」不搭配"
      }
    ],
    correctChoiceId: "n4-5-0",
    translation: "为了赶上电车到站的时间，早点出门吧。",
    grammar: {
      pattern: "～ように",
      reading: "～ように",
      meaning: "为了…，以便…（使…实现）",
      connection: "動詞辞書形／ない形＋ように",
      explanation:
        "「～ように」前接非意志性动词（可能形、自动词、ない形等），表示「目的」，即为了达成某种自然实现的状态或结果而采取后面的行为。如「忘れないように、メモする（为了不忘记而记笔记）」「聞こえるように、大きい声で話す（为了能听见而大声说）」。本题「間に合うように」表示「为了赶得上」，「間に合う」是无意志动词，正好用辞书形接「ように」。意志性动词作目的时应改用「～ために」，故意志形「間に合おう」、て形「間に合って」、た形「間に合った」均接续或语义不合。"
    },
    vocabulary: null
  },
  {
    id: "n4-6",
    level: "N4",
    section: "grammar",
    type: "grammarForm",
    prompt: "明日は雨が降る＿＿＿ですから、傘を持って行ったほうがいいですよ。",
    promptReading:
      "あしたはあめがふるそうですから、かさをもっていったほうがいいですよ。",
    choices: [
      {
        id: "n4-6-0",
        text: "そう",
        note: "✓ 「動詞辞書形＋そうだ」是传闻用法「听说…」，由天气预报等得知明天会下雨，语义通顺"
      },
      {
        id: "n4-6-1",
        text: "よう",
        note: "✗ 「降るようだ」表示说话人自己的推测「好像要下」，不含「听说」的转述之意，此处强调消息来源，不合"
      },
      {
        id: "n4-6-2",
        text: "らしく",
        note: "✗ 「らしい」虽也表传闻，但后接「です」要用「らしいです」，「らしく」接续错误"
      },
      {
        id: "n4-6-3",
        text: "はず",
        note: "✗ 「降るはず」表示「理应会下」，是基于道理的推断，不含「听说」之意，语境不符"
      }
    ],
    correctChoiceId: "n4-6-0",
    translation: "听说明天会下雨，所以最好带把伞去哦。",
    grammar: {
      pattern: "～そうだ（伝聞）",
      reading: "～そうだ（でんぶん）",
      meaning: "听说…，据说…",
      connection: "動詞・イ形容詞・ナ形容詞・名詞の普通形＋そうだ",
      explanation:
        "接在动词、形容词、名词的普通形后，表示「传闻」，即把从别人、新闻、天气预报等处听来的信息转述出来。注意与「样态」的「～そうだ」（接动词ます形去ます，如「降りそうだ＝看起来要下」）区分：传闻接在「辞书形／普通形」之后。本题「降るそうだ」接在辞书形「降る」之后，是传闻「听说要下雨」。「ようだ／はず」是说话人自己的推断，不含转述之意；「らしく」后接「です」时接续错误。"
    },
    vocabulary: null
  },
  {
    id: "n3-1",
    level: "N3",
    section: "vocabulary",
    type: "kanjiReading",
    prompt: "この道路はいつも車が多くて、「渋滞」が起きやすい。",
    promptReading:
      "このどうろはいつもくるまがおおくて、じゅうたいがおきやすい。",
    choices: [
      {
        id: "n3-1-0",
        text: "じゅうたい",
        note: "✓「渋滞」的正确读音，渋=じゅう、滞=たい，指交通堵塞。"
      },
      {
        id: "n3-1-1",
        text: "じゅたい",
        note: "✗ 漏掉了长音，渋读作じゅう而非じゅ，属长短音错误。"
      },
      {
        id: "n3-1-2",
        text: "しゅうたい",
        note: "✗ 渋的浊音读错，应为じゅう（浊音）而非しゅう（清音）。"
      },
      {
        id: "n3-1-3",
        text: "じゅうだい",
        note: "✗ 滞应读清音たい，此处误加浊音读成だい（易与「重大」混淆）。"
      }
    ],
    correctChoiceId: "n3-1-0",
    translation: "这条马路总是车很多，容易发生交通堵塞。",
    grammar: null,
    vocabulary: [
      {
        term: "渋滞",
        reading: "じゅうたい",
        meaning: "（交通）堵塞，拥堵",
        partOfSpeech: "名詞・自動詞（する）"
      },
      {
        term: "道路",
        reading: "どうろ",
        meaning: "道路，马路",
        partOfSpeech: "名詞"
      }
    ]
  },
  {
    id: "n3-2",
    level: "N3",
    section: "vocabulary",
    type: "context",
    prompt: "パスワードを忘れてしまったので、もう一度＿＿＿してください。",
    promptReading:
      "パスワードをわすれてしまったので、もういちどにゅうりょくしてください。",
    choices: [
      {
        id: "n3-2-0",
        text: "記録",
        note: "✗ きろく，意为「记录、记载」，不用于输入密码这一动作。"
      },
      {
        id: "n3-2-1",
        text: "入力",
        note: "✓ にゅうりょく，意为「输入」，正好搭配输入密码的语境。"
      },
      {
        id: "n3-2-2",
        text: "確認",
        note: "✗ かくにん，意为「确认」，但句中是要重新「输入」而非确认。"
      },
      {
        id: "n3-2-3",
        text: "登録",
        note: "✗ とうろく，意为「注册、登记」，与「再输入一次」语境不符。"
      }
    ],
    correctChoiceId: "n3-2-1",
    translation: "因为把密码忘了，请再输入一次。",
    grammar: null,
    vocabulary: [
      {
        term: "入力",
        reading: "にゅうりょく",
        meaning: "输入（数据、文字等）",
        partOfSpeech: "名詞・他動詞（する）"
      },
      {
        term: "登録",
        reading: "とうろく",
        meaning: "注册，登记",
        partOfSpeech: "名詞・他動詞（する）"
      },
      {
        term: "確認",
        reading: "かくにん",
        meaning: "确认，核对",
        partOfSpeech: "名詞・他動詞（する）"
      }
    ]
  },
  {
    id: "n3-3",
    level: "N3",
    section: "vocabulary",
    type: "paraphrase",
    prompt: "彼の説明はとても「わかりやすかった」ので、すぐに理解できた。",
    promptReading:
      "かれのせつめいはとても「わかりやすかった」ので、すぐにりかいできた。",
    choices: [
      {
        id: "n3-3-0",
        text: "明確だった",
        note: "✓ めいかくだった，意为「清晰明了」，与「容易懂」意思最接近。"
      },
      {
        id: "n3-3-1",
        text: "複雑だった",
        note: "✗ ふくざつだった，意为「复杂」，与「容易懂」意思相反。"
      },
      {
        id: "n3-3-2",
        text: "つまらなかった",
        note: "✗ 意为「无聊、没意思」，与是否易懂无关。"
      },
      {
        id: "n3-3-3",
        text: "短かった",
        note: "✗ みじかかった，意为「短」，说明长度而非是否易懂。"
      }
    ],
    correctChoiceId: "n3-3-0",
    translation: "他的说明非常清晰明了，所以我马上就理解了。",
    grammar: null,
    vocabulary: [
      {
        term: "明確",
        reading: "めいかく",
        meaning: "明确，清晰",
        partOfSpeech: "名詞・ナ形容詞"
      },
      {
        term: "複雑",
        reading: "ふくざつ",
        meaning: "复杂",
        partOfSpeech: "名詞・ナ形容詞"
      }
    ]
  },
  {
    id: "n3-4",
    level: "N3",
    section: "grammar",
    type: "grammarForm",
    prompt: "日本へ留学する＿＿＿、毎日少しずつ日本語を勉強している。",
    promptReading:
      "にほんへりゅうがくするために、まいにちすこしずつにほんごをべんきょうしている。",
    choices: [
      {
        id: "n3-4-0",
        text: "ように",
        note: "✗ 表「为了（达到某状态/无意志）」，多接动词可能形或ない形，此处「留学する」是意志动词，应用ために。"
      },
      {
        id: "n3-4-1",
        text: "ために",
        note: "✓ 「ために」接意志动词原形，表示「为了…（目的）」，留学是有意识的目标，最贴切。"
      },
      {
        id: "n3-4-2",
        text: "ところに",
        note: "✗ 表「正当…的时候」，接续与语境均不符，非表目的。"
      },
      {
        id: "n3-4-3",
        text: "とおりに",
        note: "✗ 表「按照…那样」，与「为了留学」的目的语义不符。"
      }
    ],
    correctChoiceId: "n3-4-1",
    translation: "为了去日本留学，我每天一点一点地学习日语。",
    grammar: {
      pattern: "～ために",
      reading: "ために",
      meaning: "为了…（表目的）",
      connection: "動詞辞書形＋ために／名詞＋の＋ために",
      explanation:
        "「～ために」表示为达成某个有意志的目的而做某事，前接意志动词原形或「名詞＋の」。与「～ように」的区别：「ように」前多接可能形或ない形等非意志/无意志表达（如「見えるように」「忘れないように」），表示「以便达成某状态」；本句「留学する」是说话人能主动控制的意志动词，故用「ために」而非「ように」。「ところに／とおりに」均非表目的用法。"
    },
    vocabulary: null
  },
  {
    id: "n3-5",
    level: "N3",
    section: "grammar",
    type: "grammarForm",
    prompt: "天気予報によると、明日は雨が降る＿＿＿だ。",
    promptReading: "てんきよほうによると、あしたはあめがふるそうだ。",
    choices: [
      {
        id: "n3-5-0",
        text: "らしい",
        note: "✗ 「らしい」自身即结句不接だ（应为「降るらしい」），且与句首「～によると」最固定的传闻搭配是「そうだ」。"
      },
      {
        id: "n3-5-1",
        text: "よう",
        note: "✗ 「ようだ」表示说话人根据所见所感的主观判断，与「据天气预报」的客观转述不符。"
      },
      {
        id: "n3-5-2",
        text: "そう",
        note: "✓ 「～によると…そうだ」是传闻的固定搭配，接动词普通形，表示「听说、据说」。"
      },
      {
        id: "n3-5-3",
        text: "はず",
        note: "✗ 「はずだ」表示按道理推断「应该…」，并非转述他人信息的传闻。"
      }
    ],
    correctChoiceId: "n3-5-2",
    translation: "据天气预报说，明天会下雨。",
    grammar: {
      pattern: "～そうだ（伝聞）",
      reading: "そうだ",
      meaning: "听说…，据说…（传闻）",
      connection: "動詞・イ形容詞・ナ形容詞・名詞の普通形＋そうだ",
      explanation:
        "表示传闻的「～そうだ」接在用言或名词的普通形之后，把从别处得到的信息原样转述，常与「～によると／～の話では」呼应。注意与样态的「～そうだ」（接动词ます形去ます／形容词词干，如「降りそうだ」表示「看起来要下」）不同，本句是「降る＋そうだ」用普通形，故为传闻。「ようだ・らしい」偏主观推测，「はずだ」表理应如此，均不是「据…说」的客观转述。"
    },
    vocabulary: null
  },
  {
    id: "n3-6",
    level: "N3",
    section: "grammar",
    type: "grammarForm",
    prompt: "母が病気になったので、田舎へ帰ら＿＿＿なくなった。",
    promptReading:
      "ははがびょうきになったので、いなかへかえらざるをえなくなった。",
    choices: [
      {
        id: "n3-6-0",
        text: "ないわけ",
        note: "✗ 「ないわけにはいかない」虽也表「不得不」，但接续为动词原形（帰る），不与此处的「帰ら」（ない形词干）相接。"
      },
      {
        id: "n3-6-1",
        text: "ざるを得",
        note: "✓ 「動詞ない形＋ざるを得ない」表示「不得不…」，接「帰ら」正好成「帰らざるを得ない」。"
      },
      {
        id: "n3-6-2",
        text: "ずにはいられ",
        note: "✗ 「ずにはいられない」表示「忍不住、情不自禁」，强调情感冲动，与因故被迫的语境不符。"
      },
      {
        id: "n3-6-3",
        text: "ことになら",
        note: "✗ 「ことになる」表示事情自然发展的结果，接续与「不得不」的语义都不合。"
      }
    ],
    correctChoiceId: "n3-6-1",
    translation: "因为母亲生病了，我不得不回乡下去。",
    grammar: {
      pattern: "～ざるを得ない",
      reading: "ざるをえない",
      meaning: "不得不…，只好…",
      connection: "動詞ない形（する→せ）＋ざるを得ない",
      explanation:
        "「～ざるを得ない」接动词ない形（去掉「ない」后加「ざるを得ない」，「する」变为「せざるを得ない」），表示因客观情况所迫，虽非本意也只能这样做，带书面、生硬语气。本句「帰る」→「帰ら＋ざるを得ない」。与「～ずにはいられない」区别：后者强调出于感情而忍不住去做（如「笑わずにはいられない」）；「～ないわけにはいかない」侧重道义/常理上不得不做，接动词原形，故此处接续也不合。"
    },
    vocabulary: null
  },
  {
    id: "n2-1",
    level: "N2",
    section: "vocabulary",
    type: "kanjiReading",
    prompt:
      "今回のプロジェクトの失敗は、彼の判断の「甘さ」によるものだと言わざるを得ない。",
    promptReading:
      "こんかいのぷろじぇくとのしっぱいは、かれのはんだんのあまさによるものだといわざるをえない。",
    choices: [
      {
        id: "n2-1-0",
        text: "あらさ",
        note: "✗「粗さ」的读法，意为粗糙、粗劣，汉字与「甘さ」不符。"
      },
      {
        id: "n2-1-1",
        text: "あまさ",
        note: "✓「甘い」的训读为「あまい」，名词化为「甘さ（あまさ）」，此处指判断的天真、不严谨。"
      },
      {
        id: "n2-1-2",
        text: "うまさ",
        note: "✗「旨さ・上手さ」的读法，意为美味或高明，与「甘」字无关。"
      },
      {
        id: "n2-1-3",
        text: "にがさ",
        note: "✗「苦さ」的读法，意为苦涩，汉字与「甘さ」相反。"
      }
    ],
    correctChoiceId: "n2-1-1",
    translation:
      "这次项目的失败，不得不说是由于他判断上的天真（不够严谨）所造成的。",
    grammar: null,
    vocabulary: [
      {
        term: "甘さ",
        reading: "あまさ",
        meaning: "甜味；（想法、判断）天真、不严谨、过于乐观",
        partOfSpeech: "名詞"
      },
      {
        term: "判断",
        reading: "はんだん",
        meaning: "判断、判定",
        partOfSpeech: "名詞"
      }
    ]
  },
  {
    id: "n2-2",
    level: "N2",
    section: "vocabulary",
    type: "context",
    prompt:
      "彼は時間にとてもルーズで、約束を＿＿＿守らないので、みんなに信用されていない。",
    promptReading:
      "かれはじかんにとてもるーずで、やくそくをめったにまもらないので、みんなにしんようされていない。",
    choices: [
      {
        id: "n2-2-0",
        text: "めったに",
        note: "✓「めったに～ない」表示“很少、几乎不”，与后面的否定「守らない」呼应，符合语境。"
      },
      {
        id: "n2-2-1",
        text: "せいぜい",
        note: "✗意为“最多、充其量”，用于估计数量上限，与守约语境不搭。"
      },
      {
        id: "n2-2-2",
        text: "今に",
        note: "✗「いまに」意为“不久、马上就要”，表将来，不合此处经常性的描述。"
      },
      {
        id: "n2-2-3",
        text: "あえて",
        note: "✗意为“敢于、特意”，强调主动勉强去做，与“不守约”的消极含义不符。"
      }
    ],
    correctChoiceId: "n2-2-0",
    translation: "他对时间非常散漫，很少遵守约定，所以不被大家信任。",
    grammar: null,
    vocabulary: [
      {
        term: "めったに",
        reading: "めったに",
        meaning: "（后接否定）很少、几乎不",
        partOfSpeech: "副詞"
      },
      {
        term: "ルーズ",
        reading: "るーず",
        meaning: "散漫、马虎、松懈",
        partOfSpeech: "形容動詞"
      },
      {
        term: "せいぜい",
        reading: "せいぜい",
        meaning: "最多、充其量；尽量",
        partOfSpeech: "副詞"
      }
    ]
  },
  {
    id: "n2-3",
    level: "N2",
    section: "vocabulary",
    type: "paraphrase",
    prompt:
      "この問題については、来週の会議で「あらためて」検討することになった。",
    promptReading:
      "このもんだいについては、らいしゅうのかいぎであらためてけんとうすることになった。",
    choices: [
      {
        id: "n2-3-0",
        text: "こっそり",
        note: "✗意为“偷偷地、悄悄地”，强调不被人察觉，与原句重新讨论无关。"
      },
      {
        id: "n2-3-1",
        text: "もう一度",
        note: "✓「あらためて」此处意为“重新、再次”，与「もう一度」（再一次）意思最接近。"
      },
      {
        id: "n2-3-2",
        text: "さっそく",
        note: "✗意为“立刻、马上”，强调时间上的迅速，而非“重新”。"
      },
      {
        id: "n2-3-3",
        text: "こころよく",
        note: "✗「快く」意为“爽快地、欣然地”，描述心情态度，与原意不符。"
      }
    ],
    correctChoiceId: "n2-3-1",
    translation: "关于这个问题，决定在下周的会议上重新进行讨论。",
    grammar: null,
    vocabulary: [
      {
        term: "あらためて",
        reading: "あらためて",
        meaning: "重新、再次；改日另找时间",
        partOfSpeech: "副詞"
      },
      {
        term: "検討",
        reading: "けんとう",
        meaning: "研讨、探讨、研究",
        partOfSpeech: "名詞"
      }
    ]
  },
  {
    id: "n2-4",
    level: "N2",
    section: "grammar",
    type: "grammarForm",
    prompt: "今度の試験に合格できる＿＿＿、毎日寝る時間を削って勉強している。",
    promptReading:
      "こんどのしけんにごうかくできるように、まいにちねるじかんをけずってべんきょうしている。",
    choices: [
      {
        id: "n2-4-0",
        text: "ように",
        note: "✓「～ように」前接可能动词「できる」等非意志性表达，表“为了能…”的目的，符合“为能合格而努力”。"
      },
      {
        id: "n2-4-1",
        text: "ために",
        note: "✗「～ために」表目的时前项需为意志性动词（如「合格するために」），不接可能形「できる」。"
      },
      {
        id: "n2-4-2",
        text: "ばかりに",
        note: "✗「～ばかりに」表“正因为…（才招致坏结果）”，含消极结果，与此处不符。"
      },
      {
        id: "n2-4-3",
        text: "どころか",
        note: "✗「～どころか」表“别说…就连…”，用于否定预想、对比强调，语义不通。"
      }
    ],
    correctChoiceId: "n2-4-0",
    translation: "为了能通过这次考试，我每天削减睡眠时间在学习。",
    grammar: {
      pattern: "～ように",
      reading: "～ように",
      meaning: "为了…（能够）；以便…",
      connection: "動詞辞書形／動詞可能形／動詞ない形＋ように",
      explanation:
        "「～ように」表示目的，前接非意志性动词（可能动词「できる」「わかる」、自动词、否定形「～ないように」）。与「～ために」的区别是关键：「ために」前接意志性动词且前后主语一致（合格するために）；而表能力、状态的「合格できる」这类非意志表达只能用「ように」。「ばかりに」表因小过失招致不良后果，「どころか」表反预期对比，均与“目的”语义无关。"
    },
    vocabulary: null
  },
  {
    id: "n2-5",
    level: "N2",
    section: "grammar",
    type: "grammarForm",
    prompt: "社長の話によると、来年から会社の方針が大きく変わる＿＿＿。",
    promptReading:
      "しゃちょうのはなしによると、らいねんからかいしゃのほうしんがおおきくかわるということだ。",
    choices: [
      {
        id: "n2-5-0",
        text: "わけがない",
        note: "✗「～わけがない」表“不可能、绝不会”，是说话人的强烈否定推断，与传闻语境矛盾。"
      },
      {
        id: "n2-5-1",
        text: "にすぎない",
        note: "✗「～にすぎない」表“只不过是”，强调程度低，不能承接传闻信息。"
      },
      {
        id: "n2-5-2",
        text: "ということだ",
        note: "✓与句首「～によると」呼应，「～ということだ」在此表传闻“据说…”，结构完整自然。"
      },
      {
        id: "n2-5-3",
        text: "おそれがある",
        note: "✗「～おそれがある」表“有…（坏事）的危险”，需消极内容，且不与传闻提示语搭配。"
      }
    ],
    correctChoiceId: "n2-5-2",
    translation: "据社长说，从明年开始公司的方针将会有很大改变。",
    grammar: {
      pattern: "～ということだ",
      reading: "～ということだ",
      meaning: "据说…；听说…（表传闻）",
      connection: "普通形（名詞・ナ形容詞だ）＋ということだ",
      explanation:
        "「～ということだ」表传闻时，意为“据说、听说”，常与「～によると」「～の話では」等信息来源提示语呼应，传达从他处得知的内容。本句句首已有「社長の話によると」，故句尾用「ということだ」最为自然。「わけがない」是主观强否定，「にすぎない」表“仅仅”，「おそれがある」表担心的坏结果，均无法承接客观传闻。"
    },
    vocabulary: null
  },
  {
    id: "n2-6",
    level: "N2",
    section: "grammar",
    type: "grammarForm",
    prompt:
      "親に反対されたが、彼女は留学したいという気持ちを＿＿＿、ついに一人で海外へ飛び立った。",
    promptReading:
      "おやにはんたいされたが、かのじょはりゅうがくしたいというきもちをおさえきれず、ついにひとりでかいがいへとびたった。",
    choices: [
      {
        id: "n2-6-0",
        text: "抑えきれず",
        note: "✓「動詞ます形＋きれない」表“无法完全…”，中止形「抑えきれず」即“按捺不住”，与不顾反对终于出国的爆发结果最自然契合。"
      },
      {
        id: "n2-6-1",
        text: "抑えがちで",
        note: "✗「～がち」表“容易、往往…”，描述习惯倾向，与此处一次性、强烈的情感爆发不符。"
      },
      {
        id: "n2-6-2",
        text: "抑えつつ",
        note: "✗「～つつ」表“一边…一边…”或“尽管…”，意为压抑着情绪，与“终于出国”的结果矛盾。"
      },
      {
        id: "n2-6-3",
        text: "抑えようがなく",
        note: "✗「～ようがない」表“无从…、没办法…”，多接他动作（如「連絡しようがない」），接「抑える」描述自身情感不够自然。"
      }
    ],
    correctChoiceId: "n2-6-0",
    translation:
      "虽然遭到父母反对，但她按捺不住想要留学的心情，最终一个人飞向了海外。",
    grammar: {
      pattern: "～きれない",
      reading: "～きれない",
      meaning: "无法完全…；…不尽、…不了",
      connection: "動詞ます形＋きれない（中止形「きれず」）",
      explanation:
        "「動詞ます形＋きる」表“完全地、彻底地做完”，否定形「～きれない」表示“无法做到极限、…不尽”，「抑えきれない」即“按捺不住、压抑不了”。其中止形「～きれず」＝「きれないで」，连接后项“终于出国”这一爆发结果非常自然。「～がち」表习惯倾向，「～つつ」表并行/逆接而非否定，「～ようがない」表“无从下手”且多接他动作，均不契合此处情感无法克制的语义。"
    },
    vocabulary: null
  },
  {
    id: "n1-1",
    level: "N1",
    section: "vocabulary",
    type: "kanjiReading",
    prompt: "彼の主張は事実に基づいておらず、まったく「妥当」性を欠いている。",
    promptReading:
      "かれのしゅちょうはじじつにもとづいておらず、まったくだとうせいをかいている。",
    choices: [
      {
        id: "n1-1-0",
        text: "だとう",
        note: "✓「妥当」正确读音，妥（だ）当（とう），意为妥当、恰当。"
      },
      {
        id: "n1-1-1",
        text: "たとう",
        note: "✗ 妥误读为清音た；实为浊音だ。"
      },
      {
        id: "n1-1-2",
        text: "だどう",
        note: "✗ 当误读为浊音どう；当此处读清音とう。"
      },
      {
        id: "n1-1-3",
        text: "せいとう",
        note: "✗ 这是「正当」的读音，张冠李戴。"
      }
    ],
    correctChoiceId: "n1-1-0",
    translation: "他的主张没有事实依据，完全缺乏妥当性。",
    grammar: null,
    vocabulary: [
      {
        term: "妥当",
        reading: "だとう",
        meaning: "妥当，恰当，合理",
        partOfSpeech: "名詞・形容動詞"
      },
      {
        term: "正当",
        reading: "せいとう",
        meaning: "正当，合理合法",
        partOfSpeech: "名詞・形容動詞"
      }
    ]
  },
  {
    id: "n1-2",
    level: "N1",
    section: "vocabulary",
    type: "context",
    prompt: "長年の不正が明るみに出て、社長は責任を取って辞任を＿＿＿された。",
    promptReading:
      "ながねんのふせいがあかるみにでて、しゃちょうはせきにんをとってじにんをよぎなくされた。",
    choices: [
      {
        id: "n1-2-0",
        text: "余儀なく",
        note: "✓「～を余儀なくされる」固定搭配，意为被迫、不得不，此处指被迫辞职。"
      },
      {
        id: "n1-2-1",
        text: "やむを得ず",
        note: "✗ 意思相近，但是副词，不能构成「辞任を＿＿された」这种宾语＋被动结构。"
      },
      {
        id: "n1-2-2",
        text: "心置きなく",
        note: "✗ 意为无所顾忌、尽情地，语义完全不符。"
      },
      {
        id: "n1-2-3",
        text: "とどこおりなく",
        note: "✗ 意为顺利无阻地，与被迫辞职的语境相反。"
      }
    ],
    correctChoiceId: "n1-2-0",
    translation: "多年的舞弊被曝光，社长承担责任，被迫辞职。",
    grammar: null,
    vocabulary: [
      {
        term: "余儀ない",
        reading: "よぎない",
        meaning: "无可奈何，不得已",
        partOfSpeech: "形容詞"
      },
      {
        term: "滞りなく",
        reading: "とどこおりなく",
        meaning: "顺利地，毫无阻碍地",
        partOfSpeech: "副詞"
      }
    ]
  },
  {
    id: "n1-3",
    level: "N1",
    section: "vocabulary",
    type: "paraphrase",
    prompt:
      "彼女の説明はあまりに「回りくどくて」、結局何が言いたいのか分からなかった。",
    promptReading:
      "かのじょのせつめいはあまりにまわりくどくて、けっきょくなにがいいたいのかわからなかった。",
    choices: [
      {
        id: "n1-3-0",
        text: "単刀直入で",
        note: "✗ 意为开门见山、直截了当，与原词意思相反。"
      },
      {
        id: "n1-3-1",
        text: "遠回しで",
        note: "✓「回りくどい」指拐弯抹角、绕圈子；「遠回し」同样指委婉绕弯，意思最接近。"
      },
      {
        id: "n1-3-2",
        text: "大げさで",
        note: "✗ 意为夸张、小题大做，与绕弯子无关。"
      },
      {
        id: "n1-3-3",
        text: "そっけなくて",
        note: "✗ 意为冷淡、不客气，语义不符。"
      }
    ],
    correctChoiceId: "n1-3-1",
    translation: "她的说明太过拐弯抹角，结果让人不明白她到底想说什么。",
    grammar: null,
    vocabulary: [
      {
        term: "回りくどい",
        reading: "まわりくどい",
        meaning: "拐弯抹角，绕圈子，啰嗦",
        partOfSpeech: "形容詞"
      },
      {
        term: "遠回し",
        reading: "とおまわし",
        meaning: "委婉，迂回，间接",
        partOfSpeech: "名詞・形容動詞"
      }
    ]
  },
  {
    id: "n1-4",
    level: "N1",
    section: "grammar",
    type: "grammarForm",
    prompt:
      "この決定は会社の将来を左右する重大なものだ。社長＿＿＿、軽々しく判断を下すべきではない。",
    promptReading:
      "このけっていはかいしゃのしょうらいをさゆうするじゅうだいなものだ。しゃちょうたるもの、かるがるしくはんだんをくだすべきではない。",
    choices: [
      {
        id: "n1-4-0",
        text: "ともなると",
        note: "✗「～ともなると」表示达到某种高级别立场后情况自然不同，后接客观变化，不接「べきではない」的训诫语气。"
      },
      {
        id: "n1-4-1",
        text: "たるもの",
        note: "✓「～たる者」接名词，意为身为…的人（理应…），后多接义务、应有态度，与「べきではない」相配。"
      },
      {
        id: "n1-4-2",
        text: "にあって",
        note: "✗「～にあって」表示在某时间/场合之下，接场合名词而非身份，语义不符。"
      },
      {
        id: "n1-4-3",
        text: "なりに",
        note: "✗「～なりに」表示与其相应地、尽其所能，不能表达身份职责的训诫。"
      }
    ],
    correctChoiceId: "n1-4-1",
    translation:
      "这个决定关乎公司的未来，事关重大。身为社长，不应轻率地做出判断。",
    grammar: {
      pattern: "～たる者",
      reading: "～たるもの",
      meaning: "身为…的人（理应…），作为…就应当…",
      connection: "名詞＋たる者（＋は）",
      explanation:
        "「～たる者」前接表示身份、立场的名词，强调既然身处此地位就理应承担相应的责任或具备相应的姿态，后项多为该身份应有的义务、心得或训诫（应该…／不应该…），书面、庄重。与「～ともなると」不同：后者侧重「到了那个层次，情况就自然不一样」，后接客观结果或变化，而非道义上的应然；与「～にあって」不同：那是「身处某场合/时代之中」，接场合名词；「～なりに」则表示「以与之相称的方式」，三者均不表达身份职责的应然训诫。"
    },
    vocabulary: null
  },
  {
    id: "n1-5",
    level: "N1",
    section: "grammar",
    type: "grammarForm",
    prompt:
      "彼は周囲の反対を押し切って起業した。失敗すれば全財産を失うと知り＿＿＿、それでも挑戦する道を選んだのだ。",
    promptReading:
      "かれはしゅういのはんたいをおしきってきぎょうした。しっぱいすればぜんざいさんをうしなうとしりながらも、それでもちょうせんするみちをえらんだのだ。",
    choices: [
      {
        id: "n1-5-0",
        text: "ことなしに",
        note: "✗「～ことなしに」意为不…就（不能…），表示前项是后项的必要条件，语义不通。"
      },
      {
        id: "n1-5-1",
        text: "とあって",
        note: "✗「～とあって」表示因为是…这种特殊情况（所以…），接已成立的事实作原因，与此处让步逆接不符。"
      },
      {
        id: "n1-5-2",
        text: "が早いか",
        note: "✗「～が早いか」表示一…就立刻…，接动作的瞬间承接，语义不符。"
      },
      {
        id: "n1-5-3",
        text: "ながらも",
        note: "✓「～ながらも」表示尽管…却…的逆接；「知りながらも」意为明知如此却仍…，与后文「それでも挑戦する」逻辑通顺。"
      }
    ],
    correctChoiceId: "n1-5-3",
    translation:
      "他不顾周围反对创了业。明知一旦失败就会丧失全部财产，他依然选择了挑战之路。",
    grammar: {
      pattern: "～ながらも",
      reading: "～ながらも",
      meaning: "尽管…却…，虽然…但是…（逆接）",
      connection: "動詞ます形／イ形容詞終止形・ナ形容詞語幹／名詞＋ながらも",
      explanation:
        "「～ながらも」是逆接用法，表示「虽然处于前项状态，却出现了与之相反的后项」，常含「明知如此却仍…」的转折语气，多用于书面。接动词时取ます形（去ます），如「知り＋ながらも＝知りながらも」。注意与表示「一边…一边…」同时进行的「～ながら」区别，加「も」后强化逆接含义。与「～が早いか」（一…就立刻，瞬间承接）、「～とあって」（因为是这种特殊场合所以…，因果）、「～ことなしに」（不…就不…，必要条件）在逻辑关系上完全不同，本句需要的是「明知有此风险仍选择挑战」的让步逆接。"
    },
    vocabulary: null
  },
  {
    id: "n1-6",
    level: "N1",
    section: "grammar",
    type: "grammarForm",
    prompt:
      "証拠がこれだけ揃っている以上、彼が犯人であることは認め＿＿＿だろう。",
    promptReading:
      "しょうこがこれだけそろっているいじょう、かれがはんにんであることはみとめざるをえないだろう。",
    choices: [
      {
        id: "n1-6-0",
        text: "ざるを得ない",
        note: "✓「～ざるを得ない」表示在客观情况下不得不…，证据确凿故不得不承认，语义贴切。"
      },
      {
        id: "n1-6-1",
        text: "にたえない",
        note: "✗「～にたえない」意为不值得…（看/听）或不胜…，接「見る・聞く」等，不能接「認め」。"
      },
      {
        id: "n1-6-2",
        text: "に足りない",
        note: "✗「～に足りない」意为不值得、不足以，与「不得不承认」语义相反。"
      },
      {
        id: "n1-6-3",
        text: "べくもない",
        note: "✗「～べくもない」意为根本无法…、不可能…，会变成「无法承认」，与证据确凿的语境矛盾。"
      }
    ],
    correctChoiceId: "n1-6-0",
    translation: "既然证据如此齐全，就不得不承认他就是犯人了吧。",
    grammar: {
      pattern: "～ざるを得ない",
      reading: "～ざるをえない",
      meaning: "不得不…，无奈只能…",
      connection: "動詞ない形（ない除く）＋ざるを得ない（する→せざるを得ない）",
      explanation:
        "「～ざるを得ない」接动词未然形，表示「就算不情愿，受客观情势所迫也只能这么做」，带有无奈、被迫之意，书面色彩浓。特别注意「する」要变为「せざるを得ない」。与「～にたえない」（不值得做某事/不胜…，接见闻类动词或情感名词）、「～に足りない」（不足以、不值得）、「～べくもない」（根本无从…，表示客观上不可能）含义迥异；本句证据齐全，逻辑上是「被迫承认」，故只有「ざるを得ない」成立。"
    },
    vocabulary: null
  }
]
