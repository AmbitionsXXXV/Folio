import type { TranslateFunction } from "@folionote/editor-core"
import { useState } from "react"

/** Smallest grid shown before the pointer pushes the edges outward. */
const MIN_ROWS = 5
const MIN_COLS = 5
/** Largest grid the picker will grow to. */
const MAX_ROWS = 10
const MAX_COLS = 10

type HoverCell = { row: number; col: number } | null

export interface TableGridPickerProps {
  /** Called with 1-based row/column counts when a size is chosen. */
  onSelect: (rows: number, cols: number) => void
  /** Translation function for labels. */
  t?: TranslateFunction
  /** Optional header title; when set, shows a header row with the live size. */
  title?: string
}

/**
 * Drag/hover grid for choosing a table size before insertion, à la Lark.
 * The visible grid grows toward the pointer up to {@link MAX_ROWS}×{@link MAX_COLS}.
 */
export function TableGridPicker({ onSelect, t, title }: TableGridPickerProps) {
  const [hover, setHover] = useState<HoverCell>(null)

  const rowsToShow = Math.min(
    MAX_ROWS,
    Math.max(MIN_ROWS, (hover?.row ?? -1) + 2)
  )
  const colsToShow = Math.min(
    MAX_COLS,
    Math.max(MIN_COLS, (hover?.col ?? -1) + 2)
  )

  const hintLabel = t?.("editor.tableGrid.hint") ?? "Drag to choose size"
  const insertLabel = t?.("editor.tableGrid.insert") ?? "Insert table"
  const sizeLabel = hover ? `${hover.row + 1} × ${hover.col + 1}` : hintLabel

  return (
    <div aria-label={insertLabel} className="table-grid-picker" role="group">
      {title ? (
        <div className="table-grid-picker-header">
          <span className="table-grid-picker-title">{title}</span>
          <span className="table-grid-picker-size">
            {hover ? `${hover.row + 1} × ${hover.col + 1}` : ""}
          </span>
        </div>
      ) : null}
      <div className="table-grid" onMouseLeave={() => setHover(null)}>
        {Array.from({ length: rowsToShow }, (_, r) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: grid coordinates are stable identities
          <div className="table-grid-row" key={`row-${r}`}>
            {Array.from({ length: colsToShow }, (_, c) => {
              const active = hover ? r <= hover.row && c <= hover.col : false
              return (
                <button
                  aria-label={`${r + 1} × ${c + 1}`}
                  className={`table-grid-cell ${active ? "is-active" : ""}`}
                  // biome-ignore lint/suspicious/noArrayIndexKey: grid coordinates are stable identities
                  key={`cell-${r}-${c}`}
                  onClick={() => onSelect(r + 1, c + 1)}
                  onFocus={() => setHover({ row: r, col: c })}
                  onMouseEnter={() => setHover({ row: r, col: c })}
                  type="button"
                />
              )
            })}
          </div>
        ))}
      </div>
      {title ? null : <div className="table-grid-label">{sizeLabel}</div>}
    </div>
  )
}
