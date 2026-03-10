# 日语打字练习 MVP 说明

## 目标

在现有 `/review` 页面内增加一个可直接运行的 **日语打字练习 MVP**，优先验证两件事情：

1. 学习者能否围绕完整句子进行打字练习。
2. 练习过程能否同时看到 **语法分析** 与 **词库获取**。

## 当前实现

### 入口

- 路由：`/review`
- URL 状态：`mode=spaced | jp-typing`
- 默认模式：`spaced`

### 练习流

1. 用户切换到 “日语打字练习”。
2. 页面展示一句日语例句、读音、英文释义和练习目标。
3. 用户输入对应的 **romaji**。
4. 系统在前端做宽松比对：
   - 忽略空格
   - 忽略大小写
   - 忽略常见符号
5. 输入正确后，当前句子的核心词汇会自动收录到右侧词库。
6. 用户继续下一题，直到看到总结页。

### 语法分析

每道题内置 2 - 4 个 grammar points，包含：

- pattern
- title
- explanation
- example

这样可以先验证 **“句子练习 + 语法讲解”** 的产品闭环，而不依赖后端解析服务。

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
}
```

## 为什么先做前端自包含 MVP

这是一个明确的降风险选择：

1. 不改数据库 schema。
2. 不引入新的后端 API。
3. 先验证用户是否需要“打字 + 语法 + 词汇”的组合体验。
4. 后续再决定是否接入真实题库、用户词库或语法分析服务。

## 下一阶段建议

如果这个 MVP 反馈良好，下一阶段可以按顺序推进：

1. 把练习题从硬编码迁移到服务端题库。
2. 增加 kana / kanji / romaji 多输入模式。
3. 将“已获取词库”持久化到用户词表。
4. 接入 AI 或规则引擎，支持动态语法拆解与例句扩展。
