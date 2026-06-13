import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from "@xyflow/react"
import type { EdgeProps } from "@xyflow/react"
import { memo } from "react"

import type { EntryFlowEdge, GraphEdgeType } from "./types"

interface EdgeStyle {
  stroke: string
  dashArray?: string
  markerEnd?: string
  /** Inferred edges are thinner and fainter than explicit links. */
  inferred?: boolean
}

const EDGE_STYLES: Record<GraphEdgeType, EdgeStyle> = {
  ref: { stroke: "var(--color-primary)", markerEnd: "url(#arrow-ref)" },
  manual: {
    stroke: "var(--color-foreground)",
    markerEnd: "url(#arrow-manual)"
  },
  "shared-tag": {
    stroke: "var(--color-muted-foreground)",
    dashArray: "5,5",
    inferred: true
  },
  "shared-source": {
    stroke: "var(--color-muted-foreground)",
    dashArray: "2,6",
    inferred: true
  }
}

function GraphEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected
}: EdgeProps<EntryFlowEdge>) {
  const linkType = data?.linkType ?? "ref"
  const style = EDGE_STYLES[linkType] ?? EDGE_STYLES.ref
  const emphasized = Boolean(selected || data?.highlighted)

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 12
  })

  let opacity = style.inferred ? 0.4 : 0.65
  if (emphasized) {
    opacity = 1
  } else if (data?.dimmed) {
    opacity = 0.07
  }

  const baseWidth = style.inferred ? 1.3 : 1.6
  const strokeWidth = emphasized ? baseWidth + 1 : baseWidth

  return (
    <>
      <BaseEdge
        id={id}
        markerEnd={emphasized || !data?.dimmed ? style.markerEnd : undefined}
        path={edgePath}
        style={{
          stroke: style.stroke,
          strokeDasharray: style.dashArray,
          strokeWidth,
          opacity,
          transition: "opacity 200ms ease, stroke-width 200ms ease"
        }}
      />
      {data?.label && emphasized && (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none absolute rounded-md border border-border/60 bg-card/90 px-1.5 py-0.5 text-[10px] text-muted-foreground shadow-sm backdrop-blur-sm"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`
            }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  )
}

export const EntryEdge = memo(GraphEdgeComponent)

export { EDGE_STYLES }
