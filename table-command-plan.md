# Table Command Implementation Plan

## Overview
Implement a table command for the TipTap editor with:
- Slash command to insert tables (`/table`)
- Rich table UI with row/column controls (+, three-dot menus)
- Column resizing via drag
- Cross-platform architecture (shared packages)
- State management via @tanstack/react-table

## Folder Restructure

### apps/web/src/components/editor/ (New Structure)
```
editor/
├── commands/                    # Slash commands specific to web
│   ├── index.ts
│   ├── tag-command.tsx          # (moved from editor/)
│   ├── ref-command.tsx          # (moved from editor/)
│   └── source-command.tsx       # (moved from editor/)
├── extensions/                  # Web-specific extension overrides
│   ├── index.ts
│   ├── code-block-extension.ts  # (moved)
│   ├── code-block-shiki.tsx     # (moved)
│   ├── custom-caret-extension.ts # (moved)
│   ├── link-extension.ts        # (moved)
│   └── paste-handler-extension.ts # (moved)
├── table/                       # Table-specific components (web-only UI enhancements)
│   ├── index.ts
│   ├── table-state.ts           # @tanstack/react-table bridge
│   └── table.css                # Web-specific table styles
└── slash-command.tsx            # Keep at root (legacy, may migrate later)
```

## Implementation Steps

### Phase 1: Dependencies & Types

#### 1.1 Install TipTap table extensions
**File:** `packages/editor-react/package.json`
```json
"@tiptap/extension-table": "^3.14.0",
"@tiptap/extension-table-cell": "^3.14.0",
"@tiptap/extension-table-header": "^3.14.0",
"@tiptap/extension-table-row": "^3.14.0"
```

#### 1.2 Add `table` to IconId type
**File:** `packages/editor-core/src/types.ts`
```typescript
export type IconId =
  | 'heading1'
  // ... existing ...
  | 'table'  // ADD
```

#### 1.3 Add table types to editor-core
**New file:** `packages/editor-core/src/table/types.ts`
```typescript
export type TableCellData = {
  id: string
  content: string
  rowIndex: number
  colIndex: number
  isHeader: boolean
}

export type TableRowData = {
  id: string
  index: number
  cells: TableCellData[]
}

export type TableData = {
  rows: TableRowData[]
  headerRow: boolean
  columnCount: number
}

export type TableAction =
  | { type: 'addRowBefore'; rowIndex: number }
  | { type: 'addRowAfter'; rowIndex: number }
  | { type: 'deleteRow'; rowIndex: number }
  | { type: 'addColumnBefore'; colIndex: number }
  | { type: 'addColumnAfter'; colIndex: number }
  | { type: 'deleteColumn'; colIndex: number }
  | { type: 'toggleHeaderRow' }
  | { type: 'toggleHeaderColumn' }
```

**New file:** `packages/editor-core/src/table/index.ts` - Export types
**Update:** `packages/editor-core/src/index.ts` - Re-export table types

### Phase 2: Slash Command

#### 2.1 Add table command definition
**File:** `packages/editor-core/src/commands/defaults.ts`
```typescript
{
  id: 'table',
  titleKey: 'editor.slashCommand.table',
  descriptionKey: 'editor.slashCommand.tableDesc',
  iconId: 'table',
  keywords: ['table', 'grid', 'spreadsheet', '表格'],
  groupKey: 'editor.slashCommand.basicBlocks',
  execute: ({ editor, range }) => {
    ;(editor.chain().focus().deleteRange(range) as any)
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
      .run()
  },
},
```

#### 2.2 Add table icon mapping
**File:** `packages/editor-react/src/components/icon-map.tsx`
```typescript
import { Table01Icon } from '@hugeicons/core-free-icons'
// Add to defaultIconMap:
table: <HugeiconsIcon className="size-4" icon={Table01Icon} />,
```

#### 2.3 Add i18n translations
**Files:** `packages/locales/src/resources/{en-US,zh-CN,ja-JP}.json`
```json
"editor": {
  "slashCommand": {
    "table": "Table",
    "tableDesc": "Insert a table"
  },
  "table": {
    "addRowBefore": "Add row above",
    "addRowAfter": "Add row below",
    "deleteRow": "Delete row",
    "addColumnBefore": "Add column left",
    "addColumnAfter": "Add column right",
    "deleteColumn": "Delete column",
    "toggleHeaderRow": "Toggle header row"
  }
}
```

### Phase 3: Table Extension (editor-react)

#### 3.1 Create table extension with NodeView
**New file:** `packages/editor-react/src/extensions/table-extension.ts`
- Extend `@tiptap/extension-table` with custom React NodeView
- Configure resizable: true, handleWidth: 5, cellMinWidth: 50
- Export TableKit array with all table extensions

#### 3.2 Create TableNodeView component
**New file:** `packages/editor-react/src/components/table-node-view.tsx`
- React NodeViewWrapper for table
- Row hover state and column hover state
- Menu position state for context menus
- Extract tableData from TipTap node content
- Render TableControls for row/column manipulation
- Render TableMenu for context actions

#### 3.3 Create TableControls component
**New file:** `packages/editor-react/src/components/table-controls.tsx`
- Props: type ('row' | 'column'), count, hoveredIndex, onAdd, onMenuOpen
- Render + buttons between rows/columns
- Render three-dot menu triggers
- Show on hover

#### 3.4 Create TableMenu component
**New file:** `packages/editor-react/src/components/table-menu.tsx`
- Fixed position context menu
- Row actions: Add row before/after, toggle header, delete row
- Column actions: Add column before/after, delete column
- Click outside and Escape to close

#### 3.5 Export new components
**Update:** `packages/editor-react/src/extensions/index.ts`
**Update:** `packages/editor-react/src/components/index.ts`
**Update:** `packages/editor-react/src/index.ts`

### Phase 4: @tanstack/react-table Integration

#### 4.1 Create table state bridge
**New file:** `apps/web/src/components/editor/table/table-state.ts`
```typescript
export function useTableState(tableData: TableData) {
  // Convert TipTap table to react-table format
  // Return table instance with column resizing enabled
  return {
    table,
    columnWidths: table.getState().columnSizing,
    selectedRows: table.getState().rowSelection,
  }
}
```

### Phase 5: Styles

#### 5.1 Add table CSS
**New file:** `apps/web/src/styles/table.css`
- .table-node-wrapper positioning
- .editor-table border-collapse styling
- .table-controls row/column control buttons
- .table-control-add hover states with + buttons
- .table-control-menu three-dot buttons
- .table-menu context menu styling
- Column resize handle styling
- Selected cell highlighting

**Update:** `apps/web/src/index.css`
```css
@import "./styles/table.css";
```

### Phase 6: Integration

#### 6.1 Update entry-editor to include TableKit
**File:** `apps/web/src/components/entry-editor.tsx`
```typescript
import { TableKit } from '@folionote/editor-react/extensions'

// In useEditor extensions array:
...TableKit,
```

### Phase 7: Folder Migration

#### 7.1 Move existing files to new structure
- `tag-command.tsx` → `commands/tag-command.tsx`
- `ref-command.tsx` → `commands/ref-command.tsx`
- `source-command.tsx` → `commands/source-command.tsx`
- `code-block-extension.ts` → `extensions/code-block-extension.ts`
- `code-block-shiki.tsx` → `extensions/code-block-shiki.tsx`
- `custom-caret-extension.ts` → `extensions/custom-caret-extension.ts`
- `link-extension.ts` → `extensions/link-extension.ts`
- `paste-handler-extension.ts` → `extensions/paste-handler-extension.ts`

#### 7.2 Update imports throughout codebase
- Search for imports from `@/components/editor/` and update paths

## Critical Files to Modify

| File | Action |
|------|--------|
| `packages/editor-core/src/types.ts` | Add `table` to IconId |
| `packages/editor-core/src/commands/defaults.ts` | Add table command |
| `packages/editor-core/src/table/types.ts` | NEW - Table types |
| `packages/editor-react/package.json` | Add tiptap table deps |
| `packages/editor-react/src/components/icon-map.tsx` | Add table icon |
| `packages/editor-react/src/extensions/table-extension.ts` | NEW - Table extension |
| `packages/editor-react/src/components/table-node-view.tsx` | NEW - NodeView |
| `packages/editor-react/src/components/table-controls.tsx` | NEW - Controls |
| `packages/editor-react/src/components/table-menu.tsx` | NEW - Menu |
| `apps/web/src/components/entry-editor.tsx` | Integrate TableKit |
| `apps/web/src/components/editor/table/table-state.ts` | NEW - react-table bridge |
| `apps/web/src/styles/table.css` | NEW - Table styles |
| `packages/locales/src/resources/*.json` | Add i18n keys |

## Verification

### 1. Type Check
```bash
pnpm run check-types
```

### 2. Dev Server
```bash
pnpm run dev:web
```

### 3. Manual Testing
1. Open an entry editor
2. Type `/table` and select the table command
3. Verify 3x3 table with header row is inserted
4. Hover over rows/columns to see + buttons and menu triggers
5. Click + to add rows/columns
6. Click three-dot menu to see context actions
7. Drag column borders to resize
8. Test delete row/column from menu
9. Test toggle header row

### 4. Cross-Browser
Test in Chrome, Firefox, Safari

### 5. Lint/Format
```bash
pnpm x ultracite fix
```
