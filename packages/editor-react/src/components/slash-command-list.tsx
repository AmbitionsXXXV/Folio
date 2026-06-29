import type {
  IconId,
  SlashCommandItem,
  TranslateFunction
} from "@folionote/editor-core"
import type { Editor, Range } from "@tiptap/core"
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState
} from "react"
import type { ReactNode, Ref } from "react"

import { defaultIconMap } from "./icon-map"
import type { IconMapType } from "./icon-map"
import { TableGridPicker } from "./table-grid-picker"

/**
 * Ref methods for the command list
 */
export interface CommandListRef {
  onKeyDown: (event: KeyboardEvent) => boolean
}

/**
 * Props passed to the command list component
 */
interface SlashCommandListProps {
  items: SlashCommandItem[]
  command: (item: SlashCommandItem) => void
  ref?: Ref<CommandListRef>
  /** Custom icon map, defaults to defaultIconMap */
  iconMap?: IconMapType
  /** Translation function for empty state */
  emptyText?: string
  /** Default group name */
  defaultGroupName?: string
  /** Editor instance — lets submenu items (e.g. the table grid) act directly. */
  editor?: Editor
  /** The range the trigger occupies, replaced when a submenu item commits. */
  range?: Range
  /** Translation function for submenu labels. */
  t?: TranslateFunction
}

/**
 * Slash command list component with keyboard navigation and an optional
 * flyout submenu (used by the "Table" item to show a size grid à la Lark).
 */
export function SlashCommandList({
  items,
  command,
  ref,
  iconMap = defaultIconMap,
  emptyText = "No matching commands",
  defaultGroupName = "Basic",
  editor,
  range,
  t
}: SlashCommandListProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const menuRef = useRef<HTMLDivElement>(null)

  // Build flat items list with correct index mapping (grouped by group)
  const flatItems = useMemo(() => {
    const groupedItems = items.reduce<Record<string, SlashCommandItem[]>>(
      (acc, item) => {
        const group = item.group ?? defaultGroupName
        if (!acc[group]) {
          acc[group] = []
        }
        acc[group].push(item)
        return acc
      },
      {}
    )

    const result: { item: SlashCommandItem; group: string; index: number }[] =
      []
    let idx = 0
    for (const [group, groupItemsList] of Object.entries(groupedItems)) {
      for (const item of groupItemsList) {
        result.push({ item, group, index: idx })
        idx += 1
      }
    }
    return result
  }, [items, defaultGroupName])

  const selectItem = useCallback(
    (index: number) => {
      const flatItem = flatItems[index]
      if (flatItem) {
        command(flatItem.item)
      }
    },
    [flatItems, command]
  )

  const upHandler = useCallback(() => {
    setSelectedIndex((prev) => (prev + flatItems.length - 1) % flatItems.length)
  }, [flatItems.length])

  const downHandler = useCallback(() => {
    setSelectedIndex((prev) => (prev + 1) % flatItems.length)
  }, [flatItems.length])

  const enterHandler = useCallback(() => {
    selectItem(selectedIndex)
  }, [selectItem, selectedIndex])

  const [prevItems, setPrevItems] = useState(items)
  if (items !== prevItems) {
    setPrevItems(items)
    setSelectedIndex(0)
  }

  // Scroll selected item into view
  useEffect(() => {
    const menu = menuRef.current
    if (!menu) {
      return
    }

    const selectedItem = menu.querySelector(".slash-command-item.is-selected")
    if (selectedItem) {
      selectedItem.scrollIntoView({
        block: "nearest",
        behavior: "smooth"
      })
    }
  }, [selectedIndex])

  useImperativeHandle(ref, () => ({
    onKeyDown: (event: KeyboardEvent) => {
      if (event.key === "ArrowUp") {
        upHandler()
        return true
      }

      if (event.key === "ArrowDown") {
        downHandler()
        return true
      }

      if (event.key === "Enter") {
        enterHandler()
        return true
      }

      return false
    }
  }))

  // Get icon for an item
  const getIcon = (iconId: IconId): ReactNode => iconMap[iconId] ?? null

  if (items.length === 0) {
    return (
      <div className="slash-command-root">
        <div className="slash-command-menu">
          <div className="slash-command-empty">{emptyText}</div>
        </div>
      </div>
    )
  }

  // Group flat items for rendering
  const groupedFlat = flatItems.reduce<
    Record<string, { item: SlashCommandItem; index: number }[]>
  >((acc, { item, group, index }) => {
    if (!acc[group]) {
      acc[group] = []
    }
    acc[group].push({ item, index })
    return acc
  }, {})

  const selectedItem = flatItems[selectedIndex]?.item
  const showTableGrid =
    selectedItem?.submenuType === "tableGrid" &&
    Boolean(editor) &&
    Boolean(range)

  const handlePickTableSize = (rows: number, cols: number) => {
    if (!(editor && range)) {
      return
    }
    editor
      .chain()
      .focus()
      .deleteRange(range)
      .insertTable({ rows, cols, withHeaderRow: true })
      .run()
  }

  return (
    <div className="slash-command-root">
      <div className="slash-command-menu" ref={menuRef}>
        {Object.entries(groupedFlat).map(([group, groupEntries]) => (
          <div className="slash-command-group" key={group}>
            <div className="slash-command-group-label">{group}</div>
            {groupEntries.map(({ item, index }) => (
              <button
                className={`slash-command-item ${
                  index === selectedIndex ? "is-selected" : ""
                }`}
                data-index={index}
                key={item.id}
                onClick={() => selectItem(index)}
                onMouseEnter={() => setSelectedIndex(index)}
                type="button"
              >
                <span className="slash-command-item-icon">
                  {getIcon(item.iconId)}
                </span>
                <div className="slash-command-item-content">
                  <span className="slash-command-item-title">{item.title}</span>
                  <span className="slash-command-item-description">
                    {item.description}
                  </span>
                </div>
                {item.submenuType ? (
                  <span className="slash-command-item-chevron">›</span>
                ) : null}
              </button>
            ))}
          </div>
        ))}
      </div>

      {showTableGrid ? (
        <div className="slash-command-submenu">
          <TableGridPicker
            onSelect={handlePickTableSize}
            t={t}
            title={t?.("editor.tableGrid.insert") ?? "Insert table"}
          />
        </div>
      ) : null}
    </div>
  )
}
