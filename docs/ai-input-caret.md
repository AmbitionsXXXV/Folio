# AI 输入框 caret 可见性

## 适用范围

- `apps/web/src/components/ai-elements/chat-input/` 目录下的组件
- `apps/web/src/components/ai-elements/prompt-input.tsx`

## 关键点

- 使用 TipTap 编辑器替代双 textarea 叠层，避免 caret 与视觉内容错位。
- `EditorContent` 使用 `editorProps.attributes` 设置 `data-placeholder` 与 `is-editor-empty`，占位符由 CSS 控制。
- Mention 使用 `mention` NodeView 渲染 `MentionBadge`，插入时追加空格以便继续输入。
- toolbar 仍使用 `PromptInputFooter` 与输入区分，避免覆盖点击区域。

## 表单提交

- `ChatInputEditor` 使用 TipTap，`PromptInput` 仍通过 `FormData` 读取 `name="message"` 的隐藏 input。
- 隐藏 input 与编辑器文本保持同步，避免提交空文本。

## ChatInput 附件支持

ChatInput 支持两种附件类型，均采用受控模式：

### 笔记附件 (Note Attachments)

通过 `attachedNotes` 传入笔记列表，`onRemoveNoteAttachment` 处理移除回调。

```tsx
<ChatInput
  attachedNotes={[{ id: '1', title: 'Note Title' }]}
  onRemoveNoteAttachment={(noteId) => handleRemoveNote(noteId)}
  // ...其他 props
/>
```

### 文件附件 (File Attachments)

通过 `attachedFiles` 传入文件列表（类型为 `AttachedFile`，即 `FileUIPart & { id: string }`），`onRemoveFileAttachment` 处理移除回调。

```tsx
<ChatInput
  attachedFiles={[{ id: '1', type: 'file', url: '...', mediaType: 'image/png', filename: 'screenshot.png' }]}
  onRemoveFileAttachment={(fileId) => handleRemoveFile(fileId)}
  // ...其他 props
/>
```

### 组件结构

- `FileAttachment` - 渲染单个文件附件，支持图片预览与 hover 详情
- `NoteAttachment` - 渲染单个笔记附件，显示标题与 hover 详情

两者均使用 `PromptInputHoverCard` 提供一致的悬停预览体验。
