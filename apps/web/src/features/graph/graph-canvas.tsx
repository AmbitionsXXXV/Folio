import { useNavigate } from "@tanstack/react-router"
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  useEdgesState,
  useNodesState,
  useReactFlow
} from "@xyflow/react"

import "@xyflow/react/dist/style.css"
import type { Connection } from "@xyflow/react"
import { useCallback, useEffect, useMemo, useState } from "react"

import { GraphDetailPanel } from "./graph-detail-panel"
import { EntryEdge } from "./graph-edge"
import { EntryNode } from "./graph-node"
import type {
  EntryFlowEdge,
  EntryFlowNode,
  GraphEdgeData,
  GraphNodeData
} from "./types"

interface ApiGraphNode {
  id: string
  title: string
  isInbox: boolean
  isStarred: boolean
  isPinned: boolean
  tags: Array<{ id: string; name: string; color: string | null }>
  updatedAt: string
}

interface ApiGraphEdge {
  id: string
  source: string
  target: string
  linkType: string
  label?: string
}

interface GraphCanvasProps {
  graphNodes: ApiGraphNode[]
  graphEdges: ApiGraphEdge[]
  searchHighlight: string
  isConnecting: boolean
  onConnect: (sourceId: string, targetId: string) => void
}

const nodeTypes = { entry: EntryNode } as const
const edgeTypes = { entry: EntryEdge } as const

const GRID_COLS = 5
const NODE_X_SPACING = 280
const NODE_Y_SPACING = 120

function layoutNodes(apiNodes: ApiGraphNode[]): EntryFlowNode[] {
  return apiNodes.map((node, i) => ({
    id: node.id,
    type: "entry",
    position: {
      x: (i % GRID_COLS) * NODE_X_SPACING,
      y: Math.floor(i / GRID_COLS) * NODE_Y_SPACING
    },
    data: {
      title: node.title,
      isInbox: node.isInbox,
      isStarred: node.isStarred,
      isPinned: node.isPinned,
      tags: node.tags,
      updatedAt: node.updatedAt
    }
  }))
}

function toFlowEdges(apiEdges: ApiGraphEdge[]): EntryFlowEdge[] {
  return apiEdges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    type: "entry",
    data: {
      linkType: edge.linkType as GraphEdgeData["linkType"],
      label: edge.label
    }
  }))
}

export function GraphCanvas({
  graphNodes: apiNodes,
  graphEdges: apiEdges,
  searchHighlight,
  isConnecting,
  onConnect
}: GraphCanvasProps) {
  const navigate = useNavigate()
  const rfInstance = useReactFlow<EntryFlowNode, EntryFlowEdge>()
  const [nodes, setNodes, onNodesChange] = useNodesState<EntryFlowNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<EntryFlowEdge>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  useEffect(() => {
    setNodes(layoutNodes(apiNodes))
    setEdges(toFlowEdges(apiEdges))
  }, [apiNodes, apiEdges, setNodes, setEdges])

  useEffect(() => {
    if (!searchHighlight.trim()) {
      return
    }

    const target = nodes.find((n) =>
      n.data.title.toLowerCase().includes(searchHighlight.toLowerCase())
    )
    if (target) {
      rfInstance.fitView({
        nodes: [{ id: target.id }],
        duration: 400,
        padding: 0.5
      })
      setSelectedNodeId(target.id)
    }
  }, [searchHighlight, nodes, rfInstance])

  const handleNodeDoubleClick = useCallback(
    (_event: React.MouseEvent, node: EntryFlowNode) => {
      navigate({ to: "/entries/$id", params: { id: node.id } })
    },
    [navigate]
  )

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes }: { nodes: EntryFlowNode[] }) => {
      const first = selectedNodes[0]
      setSelectedNodeId(first?.id ?? null)
    },
    []
  )

  const handleConnect = useCallback(
    (connection: Connection) => {
      if (!isConnecting) {
        return
      }
      if (connection.source && connection.target) {
        onConnect(connection.source, connection.target)
      }
    },
    [isConnecting, onConnect]
  )

  const selectedNode = useMemo(() => {
    if (!selectedNodeId) {
      return null
    }
    const node = nodes.find((n) => n.id === selectedNodeId)
    if (!node) {
      return null
    }
    return { id: node.id, data: node.data }
  }, [selectedNodeId, nodes])

  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNodeData>()
    for (const node of nodes) {
      map.set(node.id, node.data)
    }
    return map
  }, [nodes])

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        connectOnClick={isConnecting}
        edges={edges}
        edgeTypes={edgeTypes}
        fitView
        nodes={nodes}
        nodeTypes={nodeTypes}
        onConnect={handleConnect}
        onEdgesChange={onEdgesChange}
        onNodeDoubleClick={handleNodeDoubleClick}
        onNodesChange={onNodesChange}
        onSelectionChange={handleSelectionChange}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={20} variant={BackgroundVariant.Dots} />
        <Controls
          className="!rounded-lg !border !shadow-sm"
          showInteractive={false}
        />
        <MiniMap
          className="!rounded-lg !border !shadow-sm"
          maskColor="rgba(0, 0, 0, 0.1)"
          nodeColor={(node) => {
            const data = node.data as GraphNodeData | undefined
            if (data?.isStarred) {
              return "#facc15"
            }
            if (data?.isInbox) {
              return "#a1a1aa"
            }
            return "var(--color-primary)"
          }}
          pannable
          zoomable
        />
        <svg aria-hidden="true">
          <defs>
            <marker
              id="arrow-ref"
              markerHeight="8"
              markerWidth="8"
              orient="auto-start-reverse"
              refX="8"
              refY="4"
              viewBox="0 0 8 8"
            >
              <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--color-primary)" />
            </marker>
          </defs>
        </svg>
      </ReactFlow>

      <GraphDetailPanel
        edges={edges}
        nodeMap={nodeMap}
        onClose={() => setSelectedNodeId(null)}
        selectedNode={selectedNode}
      />
    </div>
  )
}
