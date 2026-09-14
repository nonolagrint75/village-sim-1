import { CLAIM_NONE, DIRT, GRASS, PATH, ROAD, SAND, TRAIL, WATER, type WorldGrid } from './types'
import { getClaim, getTerrain, idx, inBounds, isBuildableGround, setTerrain } from './world'

export const TRAFFIC_TRAIL = 40
export const TRAFFIC_PATH = 160
export const TRAFFIC_ROAD = 520
const TRAFFIC_CAP = 4000
const TRAFFIC_DECAY = 0.985

export function markTraffic(grid: WorldGrid, x: number, y: number, weight = 1) {
  if (!inBounds(grid, x, y)) return
  const i = idx(grid, x, y)
  const t = grid.traffic[i] + weight
  grid.traffic[i] = t > TRAFFIC_CAP ? TRAFFIC_CAP : t
  if (t >= TRAFFIC_TRAIL && !grid.walked.has(i)) {
    grid.walked.add(i)
    grid.walkedList.push(i)
  }
}

export function markCrossingDemand(grid: WorldGrid, x: number, y: number) {
  if (!inBounds(grid, x, y)) return
  const i = idx(grid, x, y)
  if (grid.terrain[i] !== WATER) return
  const next = grid.crossing.get(i) ?? 0
  grid.crossing.set(i, next + 1)
}

export function bestCrossing(grid: WorldGrid, fromX: number, fromY: number, radius: number, minDemand: number) {
  let best: { x: number; y: number; demand: number } | null = null
  for (const [i, demand] of grid.crossing) {
    if (demand < minDemand) continue
    if (grid.terrain[i] !== WATER) continue
    const x = i % grid.width
    const y = (i / grid.width) | 0
    if (Math.abs(x - fromX) > radius || Math.abs(y - fromY) > radius) continue
    if (!best || demand > best.demand) best = { x, y, demand }
  }
  return best
}

export function tickRoadWear(grid: WorldGrid, _tick: number) {
  const list = grid.walkedList
  if (list.length === 0) return
  const slice = 400
  let cursor = grid.walkedCursor % list.length
  const budget = Math.min(slice, list.length)

  for (let n = 0; n < budget; n++) {
    if (list.length === 0) break
    if (cursor >= list.length) cursor = 0
    const i = list[cursor]
    const t = grid.traffic[i] * TRAFFIC_DECAY
    grid.traffic[i] = t

    const x = i % grid.width
    const y = (i / grid.width) | 0
    const terrain = grid.terrain[i]
    const claim = grid.claim[i]
    const paveable = terrain === GRASS || terrain === DIRT || terrain === SAND || terrain === TRAIL || terrain === PATH || terrain === ROAD
    if (paveable && claim === CLAIM_NONE) {
      const want = t >= TRAFFIC_ROAD ? ROAD : t >= TRAFFIC_PATH ? PATH : t >= TRAFFIC_TRAIL ? TRAIL : GRASS
      if (want !== terrain) setTerrain(grid, x, y, want)
    }
    if (t < TRAFFIC_TRAIL * 0.5) {
      grid.walked.delete(i)
      const last = list.pop()!
      if (cursor < list.length) list[cursor] = last
      continue
    }
    cursor++
  }
  grid.walkedCursor = list.length === 0 ? 0 : cursor % list.length
}

export function surfaceSpeedBonus(grid: WorldGrid, x: number, y: number): number {
  const t = getTerrain(grid, x, y)
  if (t === ROAD) return 3
  if (t === PATH) return 2
  if (t === TRAIL) return 1
  return 0
}
