/**
 * Table cell data for state management
 */
export type TableCellData = {
	id: string
	content: string
	rowIndex: number
	colIndex: number
	isHeader: boolean
}

/**
 * Table row data for state management
 */
export type TableRowData = {
	id: string
	index: number
	cells: TableCellData[]
}

/**
 * Table data structure for state management
 */
export type TableData = {
	rows: TableRowData[]
	headerRow: boolean
	columnCount: number
}

/**
 * Actions that can be performed on a table
 */
export type TableAction =
	| { type: 'addRowBefore'; rowIndex: number }
	| { type: 'addRowAfter'; rowIndex: number }
	| { type: 'deleteRow'; rowIndex: number }
	| { type: 'addColumnBefore'; colIndex: number }
	| { type: 'addColumnAfter'; colIndex: number }
	| { type: 'deleteColumn'; colIndex: number }
	| { type: 'toggleHeaderRow' }
	| { type: 'toggleHeaderColumn' }
