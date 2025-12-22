# 编辑器功能文档

本文档描述 FolioNote 编辑器的核心功能实现。

## 粘贴与链接处理

### 1. 粘贴 URL 自动识别为链接

**文件**: `apps/web/src/components/editor/link-extension.ts`

基于 Tiptap Link 扩展实现，配置如下：

- `linkOnPaste: true` - 粘贴 URL 时自动转换为链接
- `autolink: true` - 输入 URL 时自动检测并转换
- `defaultProtocol: 'https'` - 默认协议为 HTTPS
- `openOnClick: false` - 编辑模式下点击链接不自动打开
- `enableClickSelection: true` - 点击链接时选中文本

**安全配置**：

- HTML 属性包含 `rel="noopener noreferrer"` 和 `target="_blank"`
- URL 验证只允许 `http:`, `https:`, `mailto:`, `tel:` 协议
- 不允许相对路径链接

### 2. 粘贴富文本策略

**文件**: `apps/web/src/components/editor/paste-handler-extension.ts`

支持两种粘贴策略：

- `preserve`（默认）：保留富文本结构
- `plain`：转换为纯文本

**特殊处理**：

- 粘贴纯 URL 文本时，自动转换为可点击链接
- 如果有选中文本，将选中文本转换为链接
- 如果没有选中文本，插入 URL 作为链接文本

**使用方式**：

```tsx
<EntryEditor
  content={content}
  onChange={handleChange}
  pasteStrategy="preserve" // 或 "plain"
/>
```

## 自动保存

### 1. useAutoSave Hook

**文件**: `apps/web/src/hooks/use-auto-save.ts`

提供节流的自动保存功能，并跟踪保存状态。

**配置选项**：

- `onSave`: 保存函数
- `debounceMs`: 节流延迟（默认 1000ms）
- `savedDurationMs`: 保存成功后显示 "已保存" 状态的持续时间（默认 2000ms）

**返回值**：

- `status`: 当前保存状态（`idle` | `saving` | `saved` | `error`）
- `save`: 触发保存（会节流）
- `saveImmediately`: 立即保存（不节流）
- `reset`: 重置状态为 idle
- `isPending`: 是否有待保存的更改

**使用示例**：

```tsx
const { status, save } = useAutoSave({
  onSave: async (data) => {
    await api.updateEntry(data)
  },
  debounceMs: 1000,
})

const handleChange = (content: string) => {
  save({ id, content })
}
```

### 2. SaveStatusIndicator 组件

**文件**: `apps/web/src/components/save-status-indicator.tsx`

显示保存状态的 UI 组件：

- `idle`: 不显示
- `saving`: 显示旋转图标 + "保存中..."
- `saved`: 显示绿色勾号 + "已保存"
- `error`: 显示红色警告 + "保存失败"

**使用示例**：

```tsx
<SaveStatusIndicator status={saveStatus} />
```

## 乐观锁/版本控制

### 数据库 Schema

**文件**: `packages/db/src/schema/entries.ts`

在 entries 表添加 `version` 字段：

```typescript
version: text('version').notNull().default('1'),
```

### API 实现

**文件**: `packages/api/src/routers/entries.ts`

更新 API 支持版本检查：

1. 客户端发送 `expectedVersion` 参数
2. 服务端检查版本是否匹配
3. 匹配则更新并递增版本号
4. 不匹配则返回 `CONFLICT` 错误

**错误响应**：

```json
{
  "code": "CONFLICT",
  "message": "Version conflict: entry has been modified by another client",
  "data": {
    "currentVersion": "2",
    "expectedVersion": "1"
  }
}
```

### 前端处理

在条目编辑页面 (`apps/web/src/routes/_app/entries/$id.tsx`)：

1. 跟踪当前版本号
2. 每次保存时发送期望版本号
3. 保存成功后更新本地版本号
4. 版本冲突时提示用户刷新页面

## 回归测试用例清单

### 粘贴功能

- [ ] 粘贴纯 URL 文本，应自动转换为可点击链接
- [ ] 粘贴 URL 到选中文本上，应将选中文本转换为链接
- [ ] 粘贴富文本（从 Word/网页），应保留基本结构
- [ ] 粘贴富文本时设置 `pasteStrategy="plain"`，应转换为纯文本

### 链接功能

- [ ] 输入 URL 后按空格，应自动转换为链接
- [ ] 点击链接不应自动打开（编辑模式）
- [ ] 链接应有正确的 rel 和 target 属性

### 自动保存功能

- [ ] 编辑内容后 1 秒内应显示 "保存中..."
- [ ] 保存成功后应显示 "已保存"
- [ ] 保存失败后应显示 "保存失败"
- [ ] 连续快速编辑应正确节流

### 版本控制

- [ ] 正常保存应更新版本号
- [ ] 并发编辑时应检测版本冲突
- [ ] 版本冲突时应提示用户刷新
