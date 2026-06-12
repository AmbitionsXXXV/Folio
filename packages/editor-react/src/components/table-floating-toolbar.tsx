import { Add01Icon } from "@hugeicons/core-free-icons"
import { HugeiconsIcon } from "@hugeicons/react"
import { useCallback, useEffect, useRef, useState } from "react"

export interface TableFloatingToolbarProps {
  tableElement: HTMLTableElement | null
  /** Add a column at the table's right edge. */
  onAddColumn: () => void
  /** Add a row at the table's bottom edge. */
  onAddRow: () => void
  /** Add a row and a column at once (bottom-right corner). */
  onAddBoth: () => void
}

interface ToolbarPosition {
  addColumn: { top: number; left: number } | null
  addRow: { top: number; left: number } | null
  addBoth: { top: number; left: number } | null
}

// 延迟隐藏的时间（毫秒）- 给用户足够时间移动到 toolbar
const HIDE_DELAY_MS = 150

/**
 * TableFloatingToolbar component
 * Displays floating + buttons at the edges of a table for quick row/column addition
 * Inspired by AFFiNE's table add-button implementation
 */
export function TableFloatingToolbar({
  tableElement,
  onAddColumn,
  onAddRow,
  onAddBoth
}: TableFloatingToolbarProps) {
  const [position, setPosition] = useState<ToolbarPosition>({
    addColumn: null,
    addRow: null,
    addBoth: null
  })
  const [isHoveringTable, setIsHoveringTable] = useState(false)
  const [isHoveringToolbar, setIsHoveringToolbar] = useState(false)

  // 用于延迟隐藏的 timer ref
  const hideTableTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hideToolbarTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const updatePosition = useCallback(() => {
    if (!tableElement) {
      setPosition({ addColumn: null, addRow: null, addBoth: null })
      return
    }

    const tableRect = tableElement.getBoundingClientRect()

    // Check if we are inside a positioned wrapper
    const wrapper = tableElement.closest(".table-node-wrapper")
    let relativeTop = 0
    let relativeLeft = 0

    if (wrapper) {
      // Calculate relative to the wrapper
      const wrapperRect = wrapper.getBoundingClientRect()
      relativeTop = tableRect.top - wrapperRect.top
      relativeLeft = tableRect.left - wrapperRect.left
    } else {
      // Fallback to relative to editor
      const editorElement = tableElement.closest(".ProseMirror")
      if (!editorElement) {
        return
      }
      const editorRect = editorElement.getBoundingClientRect()
      relativeTop = tableRect.top - editorRect.top
      relativeLeft = tableRect.left - editorRect.left
    }

    setPosition({
      addColumn: {
        top: relativeTop,
        left: relativeLeft + tableRect.width + 4
      },
      addRow: {
        top: relativeTop + tableRect.height + 4,
        left: relativeLeft
      },
      addBoth: {
        top: relativeTop + tableRect.height + 4,
        left: relativeLeft + tableRect.width + 4
      }
    })
  }, [tableElement])

  // 清理所有 timers
  useEffect(
    () => () => {
      if (hideTableTimerRef.current) {
        clearTimeout(hideTableTimerRef.current)
      }
      if (hideToolbarTimerRef.current) {
        clearTimeout(hideToolbarTimerRef.current)
      }
    },
    []
  )

  useEffect(() => {
    if (!tableElement) {
      return
    }

    updatePosition()

    // Update position on scroll and resize
    const handleUpdate = () => updatePosition()
    window.addEventListener("scroll", handleUpdate, true)
    window.addEventListener("resize", handleUpdate)

    const resizeObserver =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(handleUpdate)
    if (resizeObserver) {
      resizeObserver.observe(tableElement)
    }

    // Listen for table hover with delayed hide
    const handleMouseEnter = () => {
      // 立即取消隐藏 timer
      if (hideTableTimerRef.current) {
        clearTimeout(hideTableTimerRef.current)
        hideTableTimerRef.current = null
      }
      setIsHoveringTable(true)
    }

    const handleMouseLeave = () => {
      // 延迟隐藏，给用户时间移动到 toolbar
      hideTableTimerRef.current = setTimeout(() => {
        setIsHoveringTable(false)
      }, HIDE_DELAY_MS)
    }

    tableElement.addEventListener("mouseenter", handleMouseEnter)
    tableElement.addEventListener("mouseleave", handleMouseLeave)

    return () => {
      window.removeEventListener("scroll", handleUpdate, true)
      window.removeEventListener("resize", handleUpdate)
      resizeObserver?.disconnect()
      tableElement.removeEventListener("mouseenter", handleMouseEnter)
      tableElement.removeEventListener("mouseleave", handleMouseLeave)

      // 清理 timer
      if (hideTableTimerRef.current) {
        clearTimeout(hideTableTimerRef.current)
      }
    }
  }, [tableElement, updatePosition])

  // Toolbar hover handlers with delayed hide
  const handleToolbarMouseEnter = useCallback(() => {
    // 立即取消所有隐藏 timers
    if (hideTableTimerRef.current) {
      clearTimeout(hideTableTimerRef.current)
      hideTableTimerRef.current = null
    }
    if (hideToolbarTimerRef.current) {
      clearTimeout(hideToolbarTimerRef.current)
      hideToolbarTimerRef.current = null
    }
    setIsHoveringToolbar(true)
  }, [])

  const handleToolbarMouseLeave = useCallback(() => {
    // 延迟隐藏
    hideToolbarTimerRef.current = setTimeout(() => {
      setIsHoveringToolbar(false)
    }, HIDE_DELAY_MS)
  }, [])

  const isVisible = isHoveringTable || isHoveringToolbar

  if (!(tableElement && isVisible)) {
    return null
  }

  return (
    <div
      className="table-floating-toolbar"
      onMouseEnter={handleToolbarMouseEnter}
      onMouseLeave={handleToolbarMouseLeave}
      role="toolbar"
    >
      {/* Add Column Button - Right edge */}
      {position.addColumn && (
        <button
          aria-label="Add column"
          className="table-floating-btn table-floating-btn-column"
          onClick={onAddColumn}
          style={{
            top: position.addColumn.top,
            left: position.addColumn.left,
            height: tableElement.offsetHeight
          }}
          title="Add column"
          type="button"
        >
          <HugeiconsIcon className="size-3.5" icon={Add01Icon} />
        </button>
      )}

      {/* Add Row Button - Bottom edge */}
      {position.addRow && (
        <button
          aria-label="Add row"
          className="table-floating-btn table-floating-btn-row"
          onClick={onAddRow}
          style={{
            top: position.addRow.top,
            left: position.addRow.left,
            width: tableElement.offsetWidth
          }}
          title="Add row"
          type="button"
        >
          <HugeiconsIcon className="size-3.5" icon={Add01Icon} />
        </button>
      )}

      {/* Add Both Button - Corner */}
      {position.addBoth && (
        <button
          aria-label="Add row and column"
          className="table-floating-btn table-floating-btn-corner"
          onClick={onAddBoth}
          style={{
            top: position.addBoth.top,
            left: position.addBoth.left
          }}
          title="Add row and column"
          type="button"
        >
          <HugeiconsIcon className="size-3.5" icon={Add01Icon} />
        </button>
      )}
    </div>
  )
}
