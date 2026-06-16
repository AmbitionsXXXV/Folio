/**
 * Dependency-free force-directed layout (Fruchterman–Reingold).
 *
 * React Flow does not position nodes for you; the previous implementation used
 * a fixed 5-column grid that ignored connectivity. This spreads nodes by mutual
 * repulsion while edges act as springs, so clusters and hubs emerge naturally.
 * Initial placement uses a deterministic phyllotaxis spiral (no RNG) so the
 * same graph always settles to the same shape across reloads.
 */

export interface LayoutPoint {
  x: number
  y: number
}

export interface LayoutEdgeInput {
  source: string
  target: string
}

const INITIAL_RADIUS = 260
const MAX_ITERATIONS = 300
const LARGE_GRAPH_ITERATIONS = 120
const LARGE_GRAPH_THRESHOLD = 400

interface Spring {
  a: LayoutPoint
  b: LayoutPoint
  da: LayoutPoint
  db: LayoutPoint
}

export function forceLayout(
  nodeIds: string[],
  edges: LayoutEdgeInput[],
  spacing = 190
): Map<string, LayoutPoint> {
  const positions = new Map<string, LayoutPoint>()
  const count = nodeIds.length

  if (count === 0) {
    return positions
  }
  if (count === 1) {
    for (const id of nodeIds) {
      positions.set(id, { x: 0, y: 0 })
    }
    return positions
  }

  const indexById = new Map<string, number>()
  for (let i = 0; i < count; i += 1) {
    const id = nodeIds[i]
    if (id !== undefined) {
      indexById.set(id, i)
    }
  }

  const goldenAngle = Math.PI * (3 - Math.sqrt(5))
  const pos: LayoutPoint[] = []
  const disp: LayoutPoint[] = []
  for (let i = 0; i < count; i += 1) {
    const radius = INITIAL_RADIUS * Math.sqrt((i + 0.5) / count)
    const angle = i * goldenAngle
    pos.push({ x: radius * Math.cos(angle), y: radius * Math.sin(angle) })
    disp.push({ x: 0, y: 0 })
  }

  // Resolve edge endpoints to object references once, so the hot loop avoids
  // (undefined-prone) array index reads entirely.
  const springs: Spring[] = []
  for (const edge of edges) {
    const sourceIndex = indexById.get(edge.source)
    const targetIndex = indexById.get(edge.target)
    if (
      sourceIndex === undefined ||
      targetIndex === undefined ||
      sourceIndex === targetIndex
    ) {
      continue
    }
    const a = pos[sourceIndex]
    const b = pos[targetIndex]
    const da = disp[sourceIndex]
    const db = disp[targetIndex]
    if (a && b && da && db) {
      springs.push({ a, b, da, db })
    }
  }

  const idealLength = spacing
  const iterations =
    count > LARGE_GRAPH_THRESHOLD ? LARGE_GRAPH_ITERATIONS : MAX_ITERATIONS
  let temperature = spacing * 2
  const cooling = temperature / (iterations + 1)
  const minTemperature = spacing * 0.05

  for (let iter = 0; iter < iterations; iter += 1) {
    for (const d of disp) {
      d.x = 0
      d.y = 0
    }

    // Repulsion between every pair (O(n^2); fine for app-scale graphs).
    for (let i = 0; i < count; i += 1) {
      const pi = pos[i]
      const di = disp[i]
      if (!(pi && di)) {
        continue
      }
      for (let j = i + 1; j < count; j += 1) {
        const pj = pos[j]
        const dj = disp[j]
        if (!(pj && dj)) {
          continue
        }
        const dx = pi.x - pj.x
        const dy = pi.y - pj.y
        const dist = Math.hypot(dx, dy) || 0.01
        const force = (idealLength * idealLength) / dist
        const fx = (dx / dist) * force
        const fy = (dy / dist) * force
        di.x += fx
        di.y += fy
        dj.x -= fx
        dj.y -= fy
      }
    }

    // Attraction along edges.
    for (const spring of springs) {
      const dx = spring.a.x - spring.b.x
      const dy = spring.a.y - spring.b.y
      const dist = Math.hypot(dx, dy) || 0.01
      const force = (dist * dist) / idealLength
      const fx = (dx / dist) * force
      const fy = (dy / dist) * force
      spring.da.x -= fx
      spring.da.y -= fy
      spring.db.x += fx
      spring.db.y += fy
    }

    // Apply displacement, capped by the cooling temperature.
    for (let i = 0; i < count; i += 1) {
      const p = pos[i]
      const d = disp[i]
      if (!(p && d)) {
        continue
      }
      const len = Math.hypot(d.x, d.y) || 0.01
      const capped = Math.min(len, temperature)
      p.x += (d.x / len) * capped
      p.y += (d.y / len) * capped
    }

    temperature = Math.max(temperature - cooling, minTemperature)
  }

  for (let i = 0; i < count; i += 1) {
    const id = nodeIds[i]
    const p = pos[i]
    if (id === undefined || !p) {
      continue
    }
    positions.set(id, { x: Math.round(p.x), y: Math.round(p.y) })
  }
  return positions
}

/** Count incident edges per node (used for hub emphasis / node sizing). */
export function computeDegrees(
  nodeIds: string[],
  edges: LayoutEdgeInput[]
): Map<string, number> {
  const degrees = new Map<string, number>()
  for (const id of nodeIds) {
    degrees.set(id, 0)
  }
  for (const edge of edges) {
    // Skip self-loops so degree matches the layout (which also ignores them).
    if (edge.source === edge.target) {
      continue
    }
    if (degrees.has(edge.source)) {
      degrees.set(edge.source, (degrees.get(edge.source) ?? 0) + 1)
    }
    if (degrees.has(edge.target)) {
      degrees.set(edge.target, (degrees.get(edge.target) ?? 0) + 1)
    }
  }
  return degrees
}
