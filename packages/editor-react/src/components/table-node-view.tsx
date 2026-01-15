import type { Editor } from '@tiptap/core'
import { NodeViewContent, NodeViewWrapper } from '@tiptap/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { TableControls } from './table-controls'
import { TableFloatingToolbar } from './table-floating-toolbar'
import { TableMenu } from './table-menu'

export type TableNodeViewProps = {
	editor: Editor
	isDarkMode?: boolean
}

export type MenuState = {
	type: 'row' | 'column'
	index: number
	position: { x: number; y: number }
} | null

type ControlPosition = {
	top: number
	left: number
}

const POSITION_EPSILON_PX = 0.5

/**
 * Enhanced TableNodeView wrapper component
 * Provides row/column controls, context menus, and floating toolbar for table manipulation
 * Inspired by AFFiNE's table implementation
 */
export function TableNodeView({ editor, isDarkMode = false }: TableNodeViewProps) {
	const [tableElement, setTableElement] = useState<HTMLTableElement | null>(null)
	const [hoveredRow, setHoveredRow] = useState<number | null>(null)
	const [hoveredColumn, setHoveredColumn] = useState<number | null>(null)
	const [rowControlPosition, setRowControlPosition] =
		useState<ControlPosition | null>(null)
	const [columnControlPosition, setColumnControlPosition] =
		useState<ControlPosition | null>(null)
	const [menuState, setMenuState] = useState<MenuState>(null)
	const contentRef = useRef<HTMLTableSectionElement>(null)
	const hoveredRowIndexRef = useRef<number | null>(null)
	const hoveredColumnIndexRef = useRef<number | null>(null)

	// Update table element ref when mounted
	useEffect(() => {
		if (contentRef.current) {
			const table = contentRef.current.closest('table')
			setTableElement(table)
		}
	}, [])

	const updateControlPositions = useCallback(
		(rowIndex: number, columnIndex: number) => {
			if (!tableElement) return

			const wrapperElement = tableElement.closest(
				'.table-node-wrapper'
			) as HTMLElement | null
			if (!wrapperElement) return

			const wrapperRect = wrapperElement.getBoundingClientRect()
			const tableRect = tableElement.getBoundingClientRect()
			const tableRows = Array.from(tableElement.rows)
			const rowElement = tableRows[rowIndex]

			if (!rowElement) {
				setRowControlPosition(null)
				setColumnControlPosition(null)
				return
			}

			const rowRect = rowElement.getBoundingClientRect()
			const nextRowPosition = {
				top: rowRect.top - wrapperRect.top + rowRect.height / 2,
				left: tableRect.left - wrapperRect.left,
			}

			setRowControlPosition((current) => {
				if (
					current &&
					Math.abs(current.top - nextRowPosition.top) < POSITION_EPSILON_PX &&
					Math.abs(current.left - nextRowPosition.left) < POSITION_EPSILON_PX
				) {
					return current
				}
				return nextRowPosition
			})

			const columnCell =
				rowElement.cells[columnIndex] ?? tableRows[0]?.cells[columnIndex]
			if (!columnCell) {
				setColumnControlPosition(null)
				return
			}

			const columnRect = columnCell.getBoundingClientRect()
			const nextColumnPosition = {
				top: tableRect.top - wrapperRect.top,
				left: columnRect.left - wrapperRect.left + columnRect.width / 2,
			}

			setColumnControlPosition((current) => {
				if (
					current &&
					Math.abs(current.top - nextColumnPosition.top) < POSITION_EPSILON_PX &&
					Math.abs(current.left - nextColumnPosition.left) < POSITION_EPSILON_PX
				) {
					return current
				}
				return nextColumnPosition
			})
		},
		[tableElement]
	)

	useEffect(() => {
		if (!tableElement) return

		const wrapperElement = tableElement.closest(
			'.table-node-wrapper'
		) as HTMLElement | null
		if (!wrapperElement) return

		const handleMouseMove = (event: Event) => {
			const eventTarget = event.target as HTMLElement | null
			if (!eventTarget) return

			const cellElement = eventTarget.closest(
				'td, th'
			) as HTMLTableCellElement | null
			if (!cellElement) {
				return
			}

			if (!tableElement.contains(cellElement)) {
				return
			}

			const rowElement = cellElement.parentElement as HTMLTableRowElement | null
			if (!rowElement) return

			const rowIndex = rowElement.rowIndex
			const columnIndex = cellElement.cellIndex

			if (hoveredRowIndexRef.current !== rowIndex) {
				hoveredRowIndexRef.current = rowIndex
				setHoveredRow(rowIndex)
			}

			if (hoveredColumnIndexRef.current !== columnIndex) {
				hoveredColumnIndexRef.current = columnIndex
				setHoveredColumn(columnIndex)
			}

			updateControlPositions(rowIndex, columnIndex)
		}

		const handleMouseLeave = () => {
			hoveredRowIndexRef.current = null
			hoveredColumnIndexRef.current = null
			setHoveredRow(null)
			setHoveredColumn(null)
			setRowControlPosition(null)
			setColumnControlPosition(null)
		}

		wrapperElement.addEventListener('mousemove', handleMouseMove)
		wrapperElement.addEventListener('mouseleave', handleMouseLeave)

		return () => {
			wrapperElement.removeEventListener('mousemove', handleMouseMove)
			wrapperElement.removeEventListener('mouseleave', handleMouseLeave)
		}
	}, [tableElement, updateControlPositions])

	useEffect(() => {
		if (!tableElement) return

		const handleLayoutUpdate = () => {
			const rowIndex = hoveredRowIndexRef.current
			const columnIndex = hoveredColumnIndexRef.current
			if (rowIndex === null || columnIndex === null) return

			updateControlPositions(rowIndex, columnIndex)
		}

		window.addEventListener('scroll', handleLayoutUpdate, true)
		window.addEventListener('resize', handleLayoutUpdate)

		const resizeObserver =
			typeof ResizeObserver === 'undefined'
				? null
				: new ResizeObserver(handleLayoutUpdate)
		if (resizeObserver) {
			resizeObserver.observe(tableElement)
		}

		return () => {
			window.removeEventListener('scroll', handleLayoutUpdate, true)
			window.removeEventListener('resize', handleLayoutUpdate)
			resizeObserver?.disconnect()
		}
	}, [tableElement, updateControlPositions])

	// Row operations
	const handleAddRowBefore = useCallback(
		(_index: number) => {
			// biome-ignore lint/suspicious/noExplicitAny: TipTap extension commands
			;(editor.chain().focus() as any).addRowBefore().run()
		},
		[editor]
	)

	const handleAddRowAfter = useCallback(
		(_index: number) => {
			// biome-ignore lint/suspicious/noExplicitAny: TipTap extension commands
			;(editor.chain().focus() as any).addRowAfter().run()
		},
		[editor]
	)

	const handleDeleteRow = useCallback(() => {
		// biome-ignore lint/suspicious/noExplicitAny: TipTap extension commands
		;(editor.chain().focus() as any).deleteRow().run()
		setMenuState(null)
	}, [editor])

	const handleMoveRowUp = useCallback(() => {
		// Move row up by deleting and inserting
		// Note: TipTap doesn't have built-in move commands, this is a workaround
		// For a full implementation, you'd need to implement custom commands
		setMenuState(null)
	}, [])

	const handleMoveRowDown = useCallback(() => {
		setMenuState(null)
	}, [])

	// Column operations
	const handleAddColumnBefore = useCallback(
		(_index: number) => {
			// biome-ignore lint/suspicious/noExplicitAny: TipTap extension commands
			;(editor.chain().focus() as any).addColumnBefore().run()
		},
		[editor]
	)

	const handleAddColumnAfter = useCallback(
		(_index: number) => {
			// biome-ignore lint/suspicious/noExplicitAny: TipTap extension commands
			;(editor.chain().focus() as any).addColumnAfter().run()
		},
		[editor]
	)

	const handleDeleteColumn = useCallback(() => {
		// biome-ignore lint/suspicious/noExplicitAny: TipTap extension commands
		;(editor.chain().focus() as any).deleteColumn().run()
		setMenuState(null)
	}, [editor])

	const handleMoveColumnLeft = useCallback(() => {
		setMenuState(null)
	}, [])

	const handleMoveColumnRight = useCallback(() => {
		setMenuState(null)
	}, [])

	// Header operations
	const handleToggleHeaderRow = useCallback(() => {
		// biome-ignore lint/suspicious/noExplicitAny: TipTap extension commands
		;(editor.chain().focus() as any).toggleHeaderRow().run()
		setMenuState(null)
	}, [editor])

	// Cell operations
	const handleSetBackgroundColor = useCallback(
		(color: string | null) => {
			// biome-ignore lint/suspicious/noExplicitAny: TipTap extension commands
			const chain = editor.chain().focus() as any
			if (color) {
				chain.setCellAttribute('backgroundColor', color).run()
			} else {
				chain.setCellAttribute('backgroundColor', null).run()
			}
			setMenuState(null)
		},
		[editor]
	)

	const handleClearContents = useCallback(() => {
		// Clear the contents of selected cells
		// This would require custom implementation
		setMenuState(null)
	}, [])

	const handleDuplicate = useCallback(() => {
		// Duplicate row or column
		// This would require custom implementation
		setMenuState(null)
	}, [])

	// Menu handlers
	const handleOpenMenu = useCallback(
		(type: 'row' | 'column', index: number, event: React.MouseEvent) => {
			event.preventDefault()
			event.stopPropagation()
			setMenuState({
				type,
				index,
				position: { x: event.clientX, y: event.clientY },
			})
		},
		[]
	)

	const handleCloseMenu = useCallback(() => {
		setMenuState(null)
	}, [])

	return (
		<NodeViewWrapper className="table-node-wrapper">
			{/* Row Controls - Left side */}
			<TableControls
				hoveredIndex={hoveredRow}
				onAdd={handleAddRowAfter}
				onHover={setHoveredRow}
				onMenuOpen={(index, event) => handleOpenMenu('row', index, event)}
				position={rowControlPosition}
				type="row"
			/>

			{/* Column Controls - Top side */}
			<TableControls
				hoveredIndex={hoveredColumn}
				onAdd={handleAddColumnAfter}
				onHover={setHoveredColumn}
				onMenuOpen={(index, event) => handleOpenMenu('column', index, event)}
				position={columnControlPosition}
				type="column"
			/>

			{/* Table Content */}
			<table
				ref={(element) => {
					if (element) setTableElement(element)
				}}
			>
				{/* 
					Render the content (rows) into the tbody 
					Tiptap/ProseMirror expects the content to be the rows 
				*/}
				{/* @ts-ignore - tbody is a valid HTML tag but not typed in NodeViewContent props */}
				<NodeViewContent as="tbody" ref={contentRef} />
			</table>

			{/* Floating Toolbar - Add buttons at edges */}
			<TableFloatingToolbar editor={editor} tableElement={tableElement} />

			{/* Context Menu */}
			{menuState && (
				<TableMenu
					currentBackgroundColor={null}
					isDarkMode={isDarkMode}
					onAddAfter={
						menuState.type === 'row'
							? () => {
									handleAddRowAfter(menuState.index)
									handleCloseMenu()
								}
							: () => {
									handleAddColumnAfter(menuState.index)
									handleCloseMenu()
								}
					}
					onAddBefore={
						menuState.type === 'row'
							? () => {
									handleAddRowBefore(menuState.index)
									handleCloseMenu()
								}
							: () => {
									handleAddColumnBefore(menuState.index)
									handleCloseMenu()
								}
					}
					onClearContents={handleClearContents}
					onClose={handleCloseMenu}
					onDelete={menuState.type === 'row' ? handleDeleteRow : handleDeleteColumn}
					onDuplicate={handleDuplicate}
					onMoveDown={menuState.type === 'row' ? handleMoveRowDown : undefined}
					onMoveLeft={menuState.type === 'column' ? handleMoveColumnLeft : undefined}
					onMoveRight={
						menuState.type === 'column' ? handleMoveColumnRight : undefined
					}
					onMoveUp={menuState.type === 'row' ? handleMoveRowUp : undefined}
					onSetBackgroundColor={handleSetBackgroundColor}
					onToggleHeader={
						menuState.type === 'row' ? handleToggleHeaderRow : undefined
					}
					position={menuState.position}
					type={menuState.type}
				/>
			)}
		</NodeViewWrapper>
	)
}
