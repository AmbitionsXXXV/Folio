import type { TranslateFunction } from "@folionote/editor-core"
import type { Editor } from "@tiptap/core"
import { createRoot } from "react-dom/client"
import tippy from "tippy.js"

import { TableGridPicker } from "../components/table-grid-picker"

export interface OpenTableGridPickerOptions {
  /** Translation function passed to the picker. */
  t?: TranslateFunction
  /** Whether the inserted table's first row is a header row (default true). */
  withHeaderRow?: boolean
}

/**
 * Open the table size picker in a popover anchored to the current caret.
 *
 * Used by the web `/table` slash command in place of an immediate insert:
 * the user drags to choose a size and the table is inserted on click. The
 * popover closes on outside click, on Escape, or after a size is chosen.
 */
export function openTableGridPicker(
  editor: Editor,
  options: OpenTableGridPickerOptions = {}
) {
  const container = document.createElement("div")
  container.className = "table-grid-picker-container"
  document.body.append(container)
  const root = createRoot(container)

  const popup = tippy("body", {
    getReferenceClientRect: () => {
      const { from } = editor.state.selection
      const coords = editor.view.coordsAtPos(from)
      return new DOMRect(coords.left, coords.top, 0, coords.bottom - coords.top)
    },
    appendTo: () => document.body,
    content: container,
    showOnCreate: true,
    interactive: true,
    trigger: "manual",
    placement: "bottom-start",
    animation: "shift-away",
    maxWidth: "none",
    offset: [0, 8]
  })

  const teardown = () => {
    document.removeEventListener("pointerdown", handlePointerDown, true)
    document.removeEventListener("keydown", handleKeyDown, true)
    popup[0]?.destroy()
    root.unmount()
    container.remove()
  }

  function handlePointerDown(event: MouseEvent) {
    if (!container.contains(event.target as Node)) {
      teardown()
      editor.commands.focus()
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault()
      teardown()
      editor.commands.focus()
    }
  }

  const handleSelect = (rows: number, cols: number) => {
    teardown()
    editor
      .chain()
      .focus()
      .insertTable({
        rows,
        cols,
        withHeaderRow: options.withHeaderRow ?? true
      })
      .run()
  }

  root.render(<TableGridPicker onSelect={handleSelect} t={options.t} />)

  // Defer global listeners so the click that opened the picker (e.g. selecting
  // the slash-command item) does not immediately dismiss it.
  setTimeout(() => {
    document.addEventListener("pointerdown", handlePointerDown, true)
    document.addEventListener("keydown", handleKeyDown, true)
  }, 0)
}
