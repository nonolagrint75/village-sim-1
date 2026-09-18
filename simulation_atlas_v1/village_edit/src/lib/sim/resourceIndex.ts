import { BUSH, GOLD, IRON, LOOT, MOUNTAIN, STONE, TREE, WATER, type WorldGrid } from './types'

export const CELL = 16

export type ResourceKind = 'tree' | 'bush' | 'stone' | 'gold' | 'iron' | 'mountain'

const KINDS: ResourceKind[] = ['tree', 'bush', 'stone', 'gold', 'iron', 'mountain']

export function terrainForKind(kind: ResourceKind): number {
  if (kind === 'tree') return TREE
  if (kind === 'bush') return BUSH
  if (kind === 'stone') return STONE
  if (kind === 'iron') return IRON
  if (kind === 'mountain') return MOUNTAIN
  return GOLD
}

export function kindForTerrain(terrain: number): ResourceKind | null {
  if (terrain === TREE) return 'tree'
  if (terrain === BUSH) return 'bush'
  if (terrain === STONE) return 'stone'
  if (terrain === IRON) return 'iron'
  if (terrain === MOUNTAIN) return 'mountain'
  if (terrain === GOLD || terrain === LOOT) return 'gold'
  return null
}

export interface ResourceIndex {
  cols: number
  rows: number
  buckets: Record<ResourceKind, number[][]>
  churn: number
}

export function createIndex(grid: WorldGrid): ResourceIndex {
  const cols = Math.ceil(grid.width / CELL)
  const rows = Math.ceil(grid.height / CELL)
  const buckets = {} as Record<ResourceKind, number[][]>
  for (const k of KINDS) {
    buckets[k] = Array.from({ length: cols * rows }, () => [] as number[])
  }
  const index: ResourceIndex = { cols, rows, buckets, churn: 0 }

  for (let i = 0; i < grid.terrain.length; i++) {
    const kind = kindForTerrain(grid.terrain[i])
    if (!kind) continue
    const x = i % grid.width
    const y = (i / grid.width) | 0
    buckets[kind][((y / CELL) | 0) * cols + ((x / CELL) | 0)].push(i)
  }
  return index
}

export function indexTile(index: ResourceIndex, grid: WorldGrid, x: number, y: number, terrain: number) {
  const kind = kindForTerrain(terrain)
  if (!kind) {
    index.churn++
    return
  }
  const cell = ((y / CELL) | 0) * index.cols + ((x / CELL) | 0)
  const bucket = index.buckets[kind][cell]
  if (bucket) bucket.push(y * grid.width + x)
}

export function compactIndex(index: ResourceIndex, grid: WorldGrid, cursor: number): number {
  const total = index.cols * index.rows
  for (const kind of KINDS) {
    const want = terrainForKind(kind)
    const bucket = index.buckets[kind][cursor % total]
    if (!bucket || bucket.length === 0) continue
    let write = 0
    for (let read = 0; read < bucket.length; read++) {
      const i = bucket[read]
      const t = grid.terrain[i]
      if (t === want || (kind === 'gold' && t === LOOT)) bucket[write++] = i
    }
    bucket.length = write
  }
  index.churn = 0
  return (cursor + 1) % total
}

export function findNearestResource(
  index: ResourceIndex,
  grid: WorldGrid,
  fromX: number,
  fromY: number,
  kind: ResourceKind,
  maxRadius: number,
): { x: number; y: number } | null {
  const want = terrainForKind(kind)
  const cx = (fromX / CELL) | 0
  const cy = (fromY / CELL) | 0
  const maxRing = Math.ceil(maxRadius / CELL)
  let best: { x: number; y: number } | null = null
  let bestD = maxRadius * maxRadius

  for (let ring = 0; ring <= maxRing; ring++) {
    if (best && (ring - 1) * CELL * ((ring - 1) * CELL) > bestD) break

    for (let gy = cy - ring; gy <= cy + ring; gy++) {
      for (let gx = cx - ring; gx <= cx + ring; gx++) {
        if (ring > 0 && gx !== cx - ring && gx !== cx + ring && gy !== cy - ring && gy !== cy + ring) continue
        if (gx < 0 || gy < 0 || gx >= index.cols || gy >= index.rows) continue
        const bucket = index.buckets[kind][gy * index.cols + gx]
        if (!bucket || bucket.length === 0) continue

        for (let n = 0; n < bucket.length; n++) {
          const i = bucket[n]
          const t = grid.terrain[i]
          if (t !== want && !(kind === 'gold' && t === LOOT)) continue
          const x = i % grid.width
          const y = (i / grid.width) | 0
          const dx = x - fromX
          const dy = y - fromY
          const d = dx * dx + dy * dy
          if (d < bestD) {
            bestD = d
            best = { x, y }
          }
        }
      }
    }
  }
  return best
}

export function countResourceNear(index: ResourceIndex, grid: WorldGrid, x: number, y: number, kind: ResourceKind, radius: number): number {
  const want = terrainForKind(kind)
  const cx = (x / CELL) | 0
  const cy = (y / CELL) | 0
  const ring = Math.ceil(radius / CELL)
  let n = 0
  const r2 = radius * radius
  for (let gy = cy - ring; gy <= cy + ring; gy++) {
    for (let gx = cx - ring; gx <= cx + ring; gx++) {
      if (gx < 0 || gy < 0 || gx >= index.cols || gy >= index.rows) continue
      const bucket = index.buckets[kind][gy * index.cols + gx]
      for (let k = 0; k < bucket.length; k++) {
        const i = bucket[k]
        if (grid.terrain[i] !== want) continue
        const tx = i % grid.width
        const ty = (i / grid.width) | 0
        const dx = tx - x
        const dy = ty - y
        if (dx * dx + dy * dy <= r2) n++
      }
    }
  }
  return n
}

export function isShore(grid: WorldGrid, x: number, y: number): boolean {
  if (x < 1 || y < 1 || x >= grid.width - 1 || y >= grid.height - 1) return false
  if (grid.terrain[y * grid.width + x] === WATER) return false
  return (
    grid.terrain[y * grid.width + x + 1] === WATER ||
    grid.terrain[y * grid.width + x - 1] === WATER ||
    grid.terrain[(y + 1) * grid.width + x] === WATER ||
    grid.terrain[(y - 1) * grid.width + x] === WATER
  )
}
