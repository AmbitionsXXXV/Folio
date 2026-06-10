/**
 * Table cell data for state management
 */
export interface TableCellData {
  id: string
  content: string
  rowIndex: number
  colIndex: number
  isHeader: boolean
}

/**
 * Table row data for state management
 */
export interface TableRowData {
  id: string
  index: number
  cells: TableCellData[]
}

/**
 * Table data structure for state management
 */
export interface TableData {
  rows: TableRowData[]
  headerRow: boolean
  columnCount: number
}

/**
 * Actions that can be performed on a table
 */
export type TableAction =
  | { type: "addRowBefore"; rowIndex: number }
  | { type: "addRowAfter"; rowIndex: number }
  | { type: "deleteRow"; rowIndex: number }
  | { type: "addColumnBefore"; colIndex: number }
  | { type: "addColumnAfter"; colIndex: number }
  | { type: "deleteColumn"; colIndex: number }
  | { type: "toggleHeaderRow" }
  | { type: "toggleHeaderColumn" }
