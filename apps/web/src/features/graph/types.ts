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
}

export interface GraphEdgeData extends Record<string, unknown> {
  linkType: "ref" | "manual" | "shared-tag" | "shared-source"
  label?: string
}

export type EntryFlowNode = Node<GraphNodeData, "entry">
export type EntryFlowEdge = Edge<GraphEdgeData>
