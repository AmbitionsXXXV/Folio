import type { Edge, Node } from "@xyflow/react"

// Extend Record<string, unknown> so these satisfy @xyflow/react's node/edge
// data constraint, which requires an index signature.
export interface GraphNodeData extends Record<string, unknown> {
  title: string
  isInbox: boolean
  isStarred: boolean
  isPinned: boolean
  tags: Array<{ id: string; name: string; color: string | null }>
  updatedAt: string
  /** Incident-edge count, used for hub emphasis and node sizing. */
  degree: number
  /** Focus mode: a node is selected and this one is outside its neighborhood. */
  dimmed?: boolean
  /** Focus mode: this is the selected node. */
  focused?: boolean
}

export type GraphEdgeType = "ref" | "manual" | "shared-tag" | "shared-source"

export interface GraphEdgeData extends Record<string, unknown> {
  linkType: GraphEdgeType
  label?: string
  /** Focus mode: this edge is outside the selected node's neighborhood. */
  dimmed?: boolean
  /** Focus mode: this edge connects to the selected node. */
  highlighted?: boolean
}

export type EntryFlowNode = Node<GraphNodeData, "entry">
export type EntryFlowEdge = Edge<GraphEdgeData>

/** All edge link types, in legend display order. */
export const GRAPH_EDGE_TYPES: GraphEdgeType[] = [
  "ref",
  "manual",
  "shared-tag",
  "shared-source"
]
