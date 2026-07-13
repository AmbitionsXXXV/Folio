# 日语打字练习 MVP 说明

## 目标

在现有 `/review` 页面内增加一个可直接运行的 **日语打字练习 MVP**，优先验证两件事情：

1. 学习者能否围绕完整句子进行打字练习。
2. 练习过程能否同时看到 **语法分析** 与 **词库获取**。

## 当前实现

### 入口

- 路由：`/jp-typing`（独立全屏路由，不包含 sidebar 布局）
- 需要登录认证（`beforeLoad` 检查 session）

### 练习流

1. 用户通过 `/jp-typing` 进入日语打字练习。
2. 页面展示一句日语例句、读音、英文释义和练习目标。
3. 用户输入对应的 **日语假名**（优先）或 **romaji**（备用）。
4. 系统自动检测输入类型并匹配相应目标：
   - **假名输入**：与 `exercise.reading`（假名读音）比对，保留平假名/片假名/汉字字符
   - **romaji 输入**：与 `exercise.romaji` 比对，仅保留 `[a-z0-9]`
   - 两种模式均忽略空格、标点和大小写差异
5. 输入正确后，当前句子的核心词汇会自动收录到词库。
6. 用户继续下一题，直到看到总结页。

### 语法分析

每道题内置 2 - 4 个 grammar points，包含：

- pattern
- title
- explanation
- example

这样可以先验证 **"句子练习 + 语法讲解"** 的产品闭环，而不依赖后端解析服务。

### 词库获取

当前词库分成两层：

- **本题词汇**：当前句子的核心词汇卡片
- **已获取词库**：完成题目后自动去重收录的 session-level 词库

这让 MVP 可以先验证：

- 用户是否愿意在练习时顺手记词
- 句子驱动的词汇收录是否足够自然

## 数据来源

当前版本使用前端内置练习数据，字段包括：

```ts
type JapaneseTypingExercise = {
  id: string
  level: string
  scene: string
  prompt: string
  focus: string
  japanese: string
  reading: string
  romaji: string
  translation: string
  grammarPoints: JapaneseGrammarPoint[]
  vocabulary: JapaneseVocabularyItem[]
  tokens?: JapaneseSentenceToken[]
}

type JapaneseSentenceToken = {
  surface: string // 词的表面形式，如 "私"
  reading: string // 假名读音，如 "わたし"
  romaji: string // 罗马音，如 "watashi"
  pos: JapanesePartOfSpeech
}

type JapanesePartOfSpeech =
  | "noun" // 名词
  | "pronoun" // 代词
  | "verb" // 动词
  | "adjective" // 形容词
  | "adverb" // 副词
  | "particle" // 助词
  | "auxiliary" // 助动词
  | "expression" // 表达
```

## 词性标注功能

### 概述

在句子展示区域增加了可选的词性标注模式。开启后，句子会被拆分为独立的词素（token），每个词素按词性类别进行颜色编码。

### 开关与多选

- **主开关**：位于句子卡片右上角，默认关闭。仅当当前题目包含 `tokens` 数据时显示。
- **分类多选**：开启词性标注后，句子下方出现词性图例行（可点击切换高亮），卡片底部展示完整的设置面板，每个词性类别配有颜色色块和独立 Switch 开关。

### 词性类别与颜色

| 类别   | 英文 key   | 颜色    |
| ------ | ---------- | ------- |
| 名词   | noun       | amber   |
| 代词   | pronoun    | cyan    |
| 动词   | verb       | emerald |
| 形容词 | adjective  | pink    |
| 副词   | adverb     | purple  |
| 助词   | particle   | blue    |
| 助动词 | auxiliary  | slate   |
| 表达   | expression | orange  |

### Token 数据

每道题可选地包含 `tokens` 数组，将整句拆分为语素级别的 token。每个 token 包含 `surface`（表面形式）、`reading`（假名）、`romaji`（罗马音）和 `pos`（词性）。

当 `tokens` 不存在时，句子以原始的整体显示模式渲染，确保向后兼容。

### 交互细节

- 未被选中的词性类别对应的 token 以灰色/弱化样式渲染，不会隐藏。
- 图例行中的色块和标签可直接点击，快速切换对应词性的高亮状态。
- 翻译行始终显示在 token 行或原始句子下方。

## 为什么先做前端自包含 MVP

这是一个明确的降风险选择：

1. 不改数据库 schema。
2. 不引入新的后端 API。
3. 先验证用户是否需要"打字 + 语法 + 词汇"的组合体验。
4. 后续再决定是否接入真实题库、用户词库或语法分析服务。

## UI 重设计（v2）

### 设计理念

从传统的多面板 Card 布局重构为 **沉浸式全屏闪卡视图**，参考 Quizlet 风格的词汇练习界面。核心原则是减少视觉噪声，让学习者专注于当前句子。

### 布局结构

```text
+----------------------------------------------------------+
| [标题 + (当前/总数)]                  [准确率] [计时器]     |
| ========= 进度条（翡翠绿）============================== |
|                                                           |
|                     [Level] [Focus] [POS开关]             |
|                       练习目标提示                          |
|                                                           |
|                    「日本語テキスト」                        |
|                      (假名读音)                            |
|                                                           |
|                   翻译：translation                        |
|                                                           |
|                  ________________                          |
|                   (下划线输入框)                             |
|                  [正确/错误反馈]                             |
|                                                           |
| [<]       [语法] [词汇] [重置]                         [>] |
+----------------------------------------------------------+
```

### 关键变更

| 变更项    | 旧版（v1）                 | 新版（v2）                        |
| --------- | -------------------------- | --------------------------------- |
| 整体布局  | `container + Card + grid`  | 全屏深色渐变背景，垂直居中        |
| 统计面板  | 4 列 stat grid             | 顶栏右侧精简显示（准确率 + 计时） |
| 输入框    | `@folionote/ui Input` 组件 | 原生 `<input>` + 下划线风格       |
| 语法/词汇 | 侧栏可见 Card              | Sheet 弹出面板，底栏图标触发      |
| 导航      | 仅按钮                     | 底栏左右箭头 + 键盘快捷键（← →）  |
| 完成页    | Card 布局                  | 同风格沉浸式暗色全屏              |
| 计时器    | 无                         | 顶栏右侧 `mm:ss` 格式             |
| 词性标注  | 顶部 Switch                | 标签区内联 Switch                 |

### 键盘快捷键

| 按键                | 功能     | 条件                   |
| ------------------- | -------- | ---------------------- |
| `←`                 | 上一题   | 焦点不在输入框时       |
| `→`                 | 下一题   | 焦点不在输入框且答对时 |
| `Enter`             | 下一题   | 焦点不在输入框且答对时 |
| `Enter`（输入框内） | 提交答案 | 表单默认行为           |

### 新增功能

- **计时器**：使用 `setInterval` 每秒更新 `elapsedSeconds` 状态，会话完成时自动停止。
- **Sheet 面板**：语法分析和词汇列表通过底栏图标打开 Sheet 弹出面板（右侧滑出）。词汇 Sheet 底部还包含已获取词库。
- **Tooltip 提示**：底栏所有图标按钮均包含 Tooltip，提供功能说明。

### 文件变更

- `apps/web/src/components/review/japanese-typing-practice.tsx` — 主组件完全重写
- 所有 i18n key 复用现有翻译，未新增 key

## 独立路由与输入匹配重构（v3）

### 路由迁移

将日语打字练习从 `/_app/review?mode=jp-typing` 迁移到独立的 `/jp-typing` 根路由：

| 变更项   | 旧版                            | 新版                           |
| -------- | ------------------------------- | ------------------------------ |
| 路由     | `/_app/review?mode=jp-typing`   | `/jp-typing`                   |
| 布局     | 嵌套在 `_app` sidebar layout 内 | 独立全屏，无 sidebar           |
| 认证     | 继承 `_app` 的 `beforeLoad`     | 独立 `beforeLoad` 检查 session |
| 最小高度 | `min-h-[calc(100vh-4rem)]`      | `min-h-svh`                    |

新增文件：`apps/web/src/routes/jp-typing.tsx`

`/_app/review.tsx` 已移除 `jp-typing` 模式和模式切换按钮，仅保留 spaced repetition 功能。

### 输入匹配优化

将输入匹配从纯 romaji 升级为 **假名优先 + romaji 备用** 双模式：

| 变更项 | 旧版 | 新版 |
| --- | --- | --- |
| 正规化 | `normalizeJapaneseTypingAnswer`（仅保留 `[a-z0-9]`） | `normalizeKanaAnswer`（保留假名/汉字）+ `normalizeRomajiAnswer`（保留 `[a-z0-9]`） |
| 输入检测 | 无 | `isJapaneseInput`（检测输入是否包含假名/汉字） |
| 匹配逻辑 | 固定与 `exercise.romaji` 比对 | 假名输入 → 与 `exercise.reading` 比对；romaji 输入 → 与 `exercise.romaji` 比对 |
| 进度指示 | 固定显示 romaji 进度 | 根据当前输入类型动态切换目标 |
| 错误提示 | 仅显示 romaji | 显示假名读音 + romaji 作为参考 |

新增工具函数（`apps/web/src/lib/japanese-typing.ts`）：

- `normalizeKanaAnswer(answer)` — NFKC 正规化后保留假名/汉字字符
- `normalizeRomajiAnswer(answer)` — NFKC 正规化后保留 `[a-z0-9]`
- `isJapaneseInput(value)` — 检测输入是否包含日语字符
- `getJapaneseTypingMatchResult(input, exercise)` — 返回匹配目标类型、正规化目标和匹配长度
- `isAnswerCorrect(input, exercise)` — 判断答案是否正确

### 进度条修复

修复进度条（Progress）与字数进度（`matched/total`）重叠的问题。从 absolute 定位改为 flex 行内布局，将进度条和字数计数放在同一行。

## 下一阶段建议

如果这个 MVP 反馈良好，下一阶段可以按顺序推进：

1. 把练习题从硬编码迁移到服务端题库。
2. 将"已获取词库"持久化到用户词表。
3. 接入 AI 或规则引擎，支持动态语法拆解与例句扩展。
