import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath } from "@xyflow/react"
import type { EdgeProps } from "@xyflow/react"
import { memo } from "react"

import type { EntryFlowEdge, GraphEdgeData } from "./types"

const EDGE_STYLES: Record<
  GraphEdgeData["linkType"],
  { stroke: string; strokeDasharray?: string; markerEnd?: string }
> = {
  ref: { stroke: "var(--color-primary)", markerEnd: "url(#arrow-ref)" },
  manual: { stroke: "var(--color-muted-foreground)" },
  "shared-tag": {
    stroke: "var(--color-muted-foreground)",
    strokeDasharray: "5,5"
  },
  "shared-source": {
    stroke: "var(--color-muted-foreground)",
    strokeDasharray: "3,6"
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
  const style = EDGE_STYLES[linkType]

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition
  })

  return (
    <>
      <BaseEdge
        id={id}
        markerEnd={style.markerEnd}
        path={edgePath}
        style={{
          stroke: style.stroke,
          strokeDasharray: style.strokeDasharray,
          strokeWidth: selected ? 2.5 : 1.5,
          opacity: selected ? 1 : 0.6
        }}
      />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none absolute rounded bg-muted/80 px-1 py-0.5 text-[10px] text-muted-foreground"
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
