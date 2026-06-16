import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

import { EDGE_STYLES } from "./graph-edge"
import type { GraphEdgeType } from "./types"
import { GRAPH_EDGE_TYPES } from "./types"

const EDGE_TYPE_LABEL_KEY: Record<GraphEdgeType, string> = {
  ref: "graph.edgeTypes.ref",
  manual: "graph.edgeTypes.manual",
  "shared-tag": "graph.edgeTypes.sharedTag",
  "shared-source": "graph.edgeTypes.sharedSource"
}

interface GraphLegendProps {
  typeCounts: Record<GraphEdgeType, number>
  hiddenTypes: Set<GraphEdgeType>
  onToggleType: (type: GraphEdgeType) => void
}

function EdgeSwatch({ type }: { type: GraphEdgeType }) {
  const style = EDGE_STYLES[type]
  return (
    <svg
      aria-hidden="true"
      className="shrink-0"
      height="6"
      viewBox="0 0 22 6"
      width="22"
    >
      <line
        stroke={style.stroke}
        strokeDasharray={style.dashArray}
        strokeWidth={style.inferred ? 1.5 : 2}
        x1="0"
        x2="22"
        y1="3"
        y2="3"
      />
    </svg>
  )
}

export function GraphLegend({
  typeCounts,
  hiddenTypes,
  onToggleType
}: GraphLegendProps) {
  const { t } = useTranslation()
  const presentTypes = GRAPH_EDGE_TYPES.filter((type) => typeCounts[type] > 0)

  if (presentTypes.length === 0) {
    return null
  }

  return (
    <div className="rounded-xl border border-border/60 bg-card/85 p-2 shadow-sm backdrop-blur-sm">
      <p className="mb-1.5 px-1 text-[11px] font-medium tracking-wide text-muted-foreground/90 uppercase">
        {t("graph.legendTitle")}
      </p>
      <ul className="flex flex-col gap-0.5">
        {presentTypes.map((type) => {
          const hidden = hiddenTypes.has(type)
          return (
            <li key={type}>
              <button
                aria-pressed={!hidden}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-xs transition-colors hover:bg-surface-secondary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                  hidden && "opacity-40"
                )}
                onClick={() => onToggleType(type)}
                type="button"
              >
                <EdgeSwatch type={type} />
                <span className="flex-1 truncate text-secondary-foreground">
                  {t(EDGE_TYPE_LABEL_KEY[type])}
                </span>
                <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                  {typeCounts[type]}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
