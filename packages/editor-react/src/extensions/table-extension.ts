import { Table } from "@tiptap/extension-table"
import { TableCell } from "@tiptap/extension-table-cell"
import { TableHeader } from "@tiptap/extension-table-header"
import { TableRow } from "@tiptap/extension-table-row"
import { ReactNodeViewRenderer } from "@tiptap/react"

import { TableNodeView } from "../components/table-node-view"

/**
 * Table extension constants
 */
export const TABLE_CONSTANTS = {
  /** Default column width in pixels */
  DEFAULT_COLUMN_WIDTH: 100,
  /** Minimum column width in pixels */
  MIN_COLUMN_WIDTH: 50,
  /** Maximum column width in pixels */
  MAX_COLUMN_WIDTH: 500,
  /** Default row height in pixels */
  DEFAULT_ROW_HEIGHT: 40,
  /** Resize handle width in pixels */
  RESIZE_HANDLE_WIDTH: 5
} as const

/**
 * Custom table extension with enhanced configuration
 * Inspired by AFFiNE's table implementation
 */
export const CustomTable = Table.extend({
  addNodeView() {
    return ReactNodeViewRenderer(TableNodeView)
  }
}).configure({
  /** Enable column resizing */
  resizable: true,
  /** Width of the resize handle */
  handleWidth: TABLE_CONSTANTS.RESIZE_HANDLE_WIDTH,
  /** Minimum width for table cells */
  cellMinWidth: TABLE_CONSTANTS.MIN_COLUMN_WIDTH,
  /** Allow resizing the last column */
  lastColumnResizable: true,
  /** Allow cell selection */
  allowTableNodeSelection: true
})

/**
 * Custom table cell extension with enhanced styling support
 */
export const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      /** Background color for the cell */
      backgroundColor: {
        default: null,
        parseHTML: (element) => element.dataset.backgroundColor,
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) {
            return {}
          }
          return {
            "data-background-color": attributes.backgroundColor,
            style: `background-color: ${attributes.backgroundColor}`
          }
        }
      },
      /** Text alignment for the cell */
      textAlign: {
        default: "left",
        parseHTML: (element) => element.dataset.textAlign || "left",
        renderHTML: (attributes) => {
          if (!attributes.textAlign || attributes.textAlign === "left") {
            return {}
          }
          return {
            "data-text-align": attributes.textAlign,
            style: `text-align: ${attributes.textAlign}`
          }
        }
      }
    }
  }
})

/**
 * Custom table header extension with enhanced styling support
 */
export const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      /** Background color for the header cell */
      backgroundColor: {
        default: null,
        parseHTML: (element) => element.dataset.backgroundColor,
        renderHTML: (attributes) => {
          if (!attributes.backgroundColor) {
            return {}
          }
          return {
            "data-background-color": attributes.backgroundColor,
            style: `background-color: ${attributes.backgroundColor}`
          }
        }
      },
      /** Text alignment for the header cell */
      textAlign: {
        default: "left",
        parseHTML: (element) => element.dataset.textAlign || "left",
        renderHTML: (attributes) => {
          if (!attributes.textAlign || attributes.textAlign === "left") {
            return {}
          }
          return {
            "data-text-align": attributes.textAlign,
            style: `text-align: ${attributes.textAlign}`
          }
        }
      }
    }
  }
})

/**
 * Custom table row extension
 */
export const CustomTableRow = TableRow.configure({})

/**
 * Table extension kit - includes all table-related extensions
 * Use this to add table support to your editor
 */
export const TableKit = [
  CustomTable,
  CustomTableCell,
  CustomTableHeader,
  CustomTableRow
]

/**
 * Color palette for table cell backgrounds
 * Inspired by AFFiNE's color system
 */
export const TABLE_COLORS = [
  { name: "Red", value: "rgba(255, 226, 221, 0.8)" },
  { name: "Orange", value: "rgba(255, 234, 213, 0.8)" },
  { name: "Yellow", value: "rgba(255, 250, 205, 0.8)" },
  { name: "Green", value: "rgba(219, 237, 219, 0.8)" },
  { name: "Blue", value: "rgba(221, 235, 255, 0.8)" },
  { name: "Purple", value: "rgba(238, 224, 255, 0.8)" },
  { name: "Pink", value: "rgba(255, 224, 240, 0.8)" },
  { name: "Gray", value: "rgba(235, 235, 235, 0.8)" }
] as const

/**
 * Dark mode color palette for table cell backgrounds
 */
export const TABLE_COLORS_DARK = [
  { name: "Red", value: "rgba(127, 66, 66, 0.4)" },
  { name: "Orange", value: "rgba(127, 89, 56, 0.4)" },
  { name: "Yellow", value: "rgba(127, 115, 51, 0.4)" },
  { name: "Green", value: "rgba(66, 96, 66, 0.4)" },
  { name: "Blue", value: "rgba(66, 89, 127, 0.4)" },
  { name: "Purple", value: "rgba(89, 66, 127, 0.4)" },
  { name: "Pink", value: "rgba(127, 66, 102, 0.4)" },
  { name: "Gray", value: "rgba(96, 96, 96, 0.4)" }
] as const

export type TableColor = (typeof TABLE_COLORS)[number]
export type TableColorDark = (typeof TABLE_COLORS_DARK)[number]
