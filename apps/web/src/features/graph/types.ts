import type { Edge, Node } from '@xyflow/react'

export type GraphNodeData = {
	title: string
	isInbox: boolean
	isStarred: boolean
	isPinned: boolean
	tags: Array<{ id: string; name: string; color: string | null }>
	updatedAt: string
}

export type GraphEdgeData = {
	linkType: 'ref' | 'manual' | 'shared-tag' | 'shared-source'
	label?: string
}

export type EntryFlowNode = Node<GraphNodeData, 'entry'>
export type EntryFlowEdge = Edge<GraphEdgeData>
