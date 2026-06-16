import { Extension } from "@tiptap/core"
import { Fragment } from "@tiptap/pm/model"
import type { Node as ProseMirrorNode } from "@tiptap/pm/model"
import { TextSelection } from "@tiptap/pm/state"

import { TABLE_CONSTANTS } from "./table-extension"

/**
 * Position-based table manipulation commands.
 *
 * Built-in `@tiptap/extension-table` commands (addRowAfter, deleteColumn, …)
 * operate on the current selection. These commands instead take the absolute
 * position of the table node (`pos`, as returned by a node view's `getPos()`)
 * plus an explicit row/column index, so the table can be edited from a hover
 * menu without first moving the selection.
 *
 * They rebuild the affected table node and replace it in a single transaction.
 * This is robust for simple grids; operations that cannot be expressed safely
 * on merged cells are skipped (guarded by {@link hasMergedCells}).
 */

declare module "@tiptap/core" {
  // biome-ignore lint/correctness/noUnusedVariables: module augmentation requires the generic
  interface Commands<ReturnType> {
    tableCommands: {
      /** Move the row at `from` to position `to` within the table at `pos`. */
      moveTableRow: (options: {
        pos: number
        from: number
        to: number
      }) => ReturnType
      /** Insert a copy of the row at `index` directly below it. */
      duplicateTableRow: (options: { pos: number; index: number }) => ReturnType
      /** Move the column at `from` to position `to` within the table at `pos`. */
      moveTableColumn: (options: {
        pos: number
        from: number
        to: number
      }) => ReturnType
      /** Insert a copy of the column at `index` directly to its right. */
      duplicateTableColumn: (options: {
        pos: number
        index: number
      }) => ReturnType
      /** Empty every cell in the row at `index`. */
      clearTableRow: (options: { pos: number; index: number }) => ReturnType
      /** Empty every cell in the column at `index`. */
      clearTableColumn: (options: { pos: number; index: number }) => ReturnType
      /** Set an attribute on every cell in the row at `index`. */
      setTableRowAttribute: (options: {
        pos: number
        index: number
        name: string
        value: unknown
      }) => ReturnType
      /** Set an attribute on every cell in the column at `index`. */
      setTableColumnAttribute: (options: {
        pos: number
        index: number
        name: string
        value: unknown
      }) => ReturnType
      /** Give every column an equal width that fills `totalWidth`. */
      distributeTableColumns: (options: {
        pos: number
        totalWidth?: number
      }) => ReturnType
      /** Insert a copy of the whole table directly below it. */
      duplicateTableBlock: (options: { pos: number }) => ReturnType
      /** Delete the whole table node at `pos`. */
      deleteTableBlock: (options: { pos: number }) => ReturnType
      /** Insert an empty paragraph below the table and place the cursor in it. */
      insertParagraphAfterTable: (options: { pos: number }) => ReturnType
    }
  }
}

/** Read the table node at `pos`, or `null` if it is not a table. */
function tableAt(doc: ProseMirrorNode, pos: number): ProseMirrorNode | null {
  const node = pos >= 0 && pos < doc.content.size ? doc.nodeAt(pos) : null
  return node && node.type.name === "table" ? node : null
}

/** Direct children of a node as a fresh, mutable array. */
function childrenOf(node: ProseMirrorNode): ProseMirrorNode[] {
  const out: ProseMirrorNode[] = []
  for (let i = 0; i < node.childCount; i++) {
    out.push(node.child(i))
  }
  return out
}

/** Number of columns, inferred from the first row (valid for unmerged grids). */
function columnCount(table: ProseMirrorNode): number {
  return table.childCount > 0 ? table.child(0).childCount : 0
}

/** True when any cell spans more than one row or column. */
function hasMergedCells(table: ProseMirrorNode): boolean {
  return childrenOf(table).some((row) =>
    childrenOf(row).some(
      (cell) =>
        (cell.attrs.colspan ?? 1) !== 1 || (cell.attrs.rowspan ?? 1) !== 1
    )
  )
}

/** Build a new table node from the given row nodes. */
function buildTable(
  table: ProseMirrorNode,
  rows: ProseMirrorNode[]
): ProseMirrorNode {
  return table.type.create(table.attrs, Fragment.fromArray(rows), table.marks)
}

/** Build a new row node from the given cell nodes. */
function buildRow(
  row: ProseMirrorNode,
  cells: ProseMirrorNode[]
): ProseMirrorNode {
  return row.copy(Fragment.fromArray(cells))
}

/** A cell of the same type/attrs as `cell` but with empty (default) content. */
function emptyCell(cell: ProseMirrorNode): ProseMirrorNode {
  return cell.type.createAndFill(cell.attrs) ?? cell
}

/** A cell of the same type/marks as `cell` with one attribute overridden. */
function cellWithAttr(
  cell: ProseMirrorNode,
  name: string,
  value: unknown
): ProseMirrorNode {
  return cell.type.create(
    { ...cell.attrs, [name]: value },
    cell.content,
    cell.marks
  )
}

/** Move an element within a copy of `items`, returning the new array. */
function moveWithin<T>(items: T[], from: number, to: number): T[] {
  const next = items.slice()
  const [moved] = next.splice(from, 1)
  if (moved === undefined) {
    return items
  }
  next.splice(to, 0, moved)
  return next
}

export const TableCommands = Extension.create({
  name: "tableCommands",

  addCommands() {
    return {
      moveTableRow:
        ({ pos, from, to }) =>
        ({ tr, dispatch }) => {
          const table = tableAt(tr.doc, pos)
          if (!table) {
            return false
          }
          const rows = childrenOf(table)
          if (
            from < 0 ||
            from >= rows.length ||
            to < 0 ||
            to >= rows.length ||
            from === to
          ) {
            return false
          }
          if (dispatch) {
            const next = buildTable(table, moveWithin(rows, from, to))
            tr.replaceWith(pos, pos + table.nodeSize, next)
          }
          return true
        },

      duplicateTableRow:
        ({ pos, index }) =>
        ({ tr, dispatch }) => {
          const table = tableAt(tr.doc, pos)
          if (!table) {
            return false
          }
          const rows = childrenOf(table)
          const source = rows[index]
          if (!source) {
            return false
          }
          if (dispatch) {
            const next = rows.slice()
            next.splice(index + 1, 0, source.copy(source.content))
            tr.replaceWith(pos, pos + table.nodeSize, buildTable(table, next))
          }
          return true
        },

      moveTableColumn:
        ({ pos, from, to }) =>
        ({ tr, dispatch }) => {
          const table = tableAt(tr.doc, pos)
          if (!table || hasMergedCells(table)) {
            return false
          }
          const cols = columnCount(table)
          if (from < 0 || from >= cols || to < 0 || to >= cols || from === to) {
            return false
          }
          if (dispatch) {
            const rows = childrenOf(table).map((row) =>
              buildRow(row, moveWithin(childrenOf(row), from, to))
            )
            tr.replaceWith(pos, pos + table.nodeSize, buildTable(table, rows))
          }
          return true
        },

      duplicateTableColumn:
        ({ pos, index }) =>
        ({ tr, dispatch }) => {
          const table = tableAt(tr.doc, pos)
          if (!table || hasMergedCells(table)) {
            return false
          }
          const cols = columnCount(table)
          if (index < 0 || index >= cols) {
            return false
          }
          if (dispatch) {
            const rows = childrenOf(table).map((row) => {
              const cells = childrenOf(row)
              const source = cells[index]
              if (source) {
                cells.splice(index + 1, 0, source.copy(source.content))
              }
              return buildRow(row, cells)
            })
            tr.replaceWith(pos, pos + table.nodeSize, buildTable(table, rows))
          }
          return true
        },

      clearTableRow:
        ({ pos, index }) =>
        ({ tr, dispatch }) => {
          const table = tableAt(tr.doc, pos)
          if (!table) {
            return false
          }
          const rows = childrenOf(table)
          if (index < 0 || index >= rows.length) {
            return false
          }
          if (dispatch) {
            const next = rows.map((row, r) =>
              r === index ? buildRow(row, childrenOf(row).map(emptyCell)) : row
            )
            tr.replaceWith(pos, pos + table.nodeSize, buildTable(table, next))
          }
          return true
        },

      clearTableColumn:
        ({ pos, index }) =>
        ({ tr, dispatch }) => {
          const table = tableAt(tr.doc, pos)
          if (!table) {
            return false
          }
          if (index < 0 || index >= columnCount(table)) {
            return false
          }
          if (dispatch) {
            const rows = childrenOf(table).map((row) =>
              buildRow(
                row,
                childrenOf(row).map((cell, c) =>
                  c === index ? emptyCell(cell) : cell
                )
              )
            )
            tr.replaceWith(pos, pos + table.nodeSize, buildTable(table, rows))
          }
          return true
        },

      setTableRowAttribute:
        ({ pos, index, name, value }) =>
        ({ tr, dispatch }) => {
          const table = tableAt(tr.doc, pos)
          if (!table) {
            return false
          }
          const rows = childrenOf(table)
          if (index < 0 || index >= rows.length) {
            return false
          }
          if (dispatch) {
            const next = rows.map((row, r) =>
              r === index
                ? buildRow(
                    row,
                    childrenOf(row).map((cell) =>
                      cellWithAttr(cell, name, value)
                    )
                  )
                : row
            )
            tr.replaceWith(pos, pos + table.nodeSize, buildTable(table, next))
          }
          return true
        },

      setTableColumnAttribute:
        ({ pos, index, name, value }) =>
        ({ tr, dispatch }) => {
          const table = tableAt(tr.doc, pos)
          if (!table) {
            return false
          }
          if (index < 0 || index >= columnCount(table)) {
            return false
          }
          if (dispatch) {
            const rows = childrenOf(table).map((row) =>
              buildRow(
                row,
                childrenOf(row).map((cell, c) =>
                  c === index ? cellWithAttr(cell, name, value) : cell
                )
              )
            )
            tr.replaceWith(pos, pos + table.nodeSize, buildTable(table, rows))
          }
          return true
        },

      distributeTableColumns:
        ({ pos, totalWidth }) =>
        ({ tr, dispatch }) => {
          const table = tableAt(tr.doc, pos)
          if (!table || hasMergedCells(table)) {
            return false
          }
          const cols = columnCount(table)
          if (cols === 0) {
            return false
          }
          if (dispatch) {
            const total =
              totalWidth && totalWidth > 0
                ? totalWidth
                : cols * TABLE_CONSTANTS.DEFAULT_COLUMN_WIDTH
            const width = Math.max(
              TABLE_CONSTANTS.MIN_COLUMN_WIDTH,
              Math.floor(total / cols)
            )
            const rows = childrenOf(table).map((row) =>
              buildRow(
                row,
                childrenOf(row).map((cell) =>
                  cellWithAttr(cell, "colwidth", [width])
                )
              )
            )
            tr.replaceWith(pos, pos + table.nodeSize, buildTable(table, rows))
          }
          return true
        },

      duplicateTableBlock:
        ({ pos }) =>
        ({ tr, dispatch }) => {
          const table = tableAt(tr.doc, pos)
          if (!table) {
            return false
          }
          if (dispatch) {
            tr.insert(pos + table.nodeSize, table.copy(table.content))
          }
          return true
        },

      deleteTableBlock:
        ({ pos }) =>
        ({ tr, dispatch }) => {
          const table = tableAt(tr.doc, pos)
          if (!table) {
            return false
          }
          if (dispatch) {
            tr.delete(pos, pos + table.nodeSize)
          }
          return true
        },

      insertParagraphAfterTable:
        ({ pos }) =>
        ({ tr, dispatch, state }) => {
          const table = tableAt(tr.doc, pos)
          if (!table) {
            return false
          }
          const paragraph = state.schema.nodes.paragraph?.createAndFill()
          if (!paragraph) {
            return false
          }
          if (dispatch) {
            const insertPos = pos + table.nodeSize
            tr.insert(insertPos, paragraph)
            tr.setSelection(TextSelection.near(tr.doc.resolve(insertPos + 1)))
            tr.scrollIntoView()
          }
          return true
        }
    }
  }
})
