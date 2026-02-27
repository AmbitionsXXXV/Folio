# EntryCard 日期容错说明

## 背景

`apps/native/components/entry-card.tsx` 在渲染更新时间时，原本直接调用相对时间格式化。  
当 `updatedAt` 字段类型变化（例如 `Date` / `string` / `number`）或值异常（空值、非法日期）时，会导致渲染阶段报错。

## 当前策略

- `updatedAt` 入参支持：`Date | string | number | null | undefined`
- 先做日期归一化与合法性校验
- 首选相对时间格式（`preset: 'relative'`）
- 相对时间失败时，自动降级到普通日期格式（`preset: 'medium'`）
- 二次失败时返回占位文本 `--`

## 适用范围

该容错仅用于 `EntryCard` 的更新时间文案展示，不影响后端数据结构或存储逻辑。
