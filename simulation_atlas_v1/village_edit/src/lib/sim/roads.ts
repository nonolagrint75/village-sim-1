import {
  CLAIM_FIELD,
  CLAIM_HOUSE,
  CLAIM_MILL,
  CLAIM_NONE,
  CLAIM_PATH,
  CLAIM_PEN,
  DIRT,
  GRASS,
  PATH,
  ROAD,
  SAND,
  TRAIL,
  WATER,
  type WorldGrid,
} from './types'
import { getClaim, getTerrain, idx, inBounds, setClaim, setTerrain } from './world'

export const TRAFFIC_TRAIL = 4
export const TRAFFIC_PATH = 18
export const TRAFFIC_ROAD = 68
const TRAFFIC_CAP = 4000
const TRAFFIC_DECAY_WILD = 0.968
const TRAFFIC_DECAY_PAVED = 0.99

const OX = [1, -1, 0, 0]
const OY = [0, 0, 1, -1]

export function isWornRoad(t: number) {
  return t === TRAIL || t === PATH || t === ROAD
}

function roadRank(t: number) {
  if (t === ROAD) return 3
  if (t === PATH) return 2
  if (t === TRAIL) return 1
  return 0
}

function canPave(t: number, claim: number, amount = 0) {
  if (claim === CLAIM_HOUSE || claim === CLAIM_PEN || claim === CLAIM_FIELD || claim === CLAIM_MILL) return false
  if (amount > 0 && (t === DIRT || t === GRASS)) return false
  return t === GRASS || t === DIRT || t === SAND || t === TRAIL || t === PATH || t === ROAD
}

export function markTraffic(grid: WorldGrid, x: number, y: number, weight = 1) {
  if (!inBounds(grid, x, y)) return
  const i = idx(grid, x, y)
  const t = grid.traffic[i] + weight
  grid.traffic[i] = t > TRAFFIC_CAP ? TRAFFIC_CAP : t
  if (t >= TRAFFIC_TRAIL && !grid.walked.has(i)) {
    grid.walked.add(i)
    grid.walkedList.push(i)
  }
  // Desire-path lateral bleed (agent wear → wider corridor) — mirrors pedestrian ABM affordance.
  if (weight >= 1 && t >= TRAFFIC_TRAIL * 0.6) {
    const bleed = weight * 0.18
    for (let k = 0; k < 4; k++) {
      const nx = x + OX[k]
      const ny = y + OY[k]
      if (!inBounds(grid, nx, ny)) continue
      const ni = idx(grid, nx, ny)
      const nt = grid.traffic[ni] + bleed
      grid.traffic[ni] = nt > TRAFFIC_CAP ? TRAFFIC_CAP : nt
      if (nt >= TRAFFIC_TRAIL && !grid.walked.has(ni)) {
        grid.walked.add(ni)
        grid.walkedList.push(ni)
      }
    }
  }
}

export function tryPave(grid: WorldGrid, x: number, y: number, grade: 0 | 1 | 2) {
  if (!inBounds(grid, x, y)) return
  const i = idx(grid, x, y)
  const t = grid.terrain[i]
  const claim = grid.claim[i]
  if (!canPave(t, claim, grid.amount[i])) return
  let want = t
  if (grade >= 2) want = ROAD
  else if (grade >= 1) want = t === ROAD ? ROAD : PATH
  else if (t !== PATH && t !== ROAD) want = TRAIL
  if (want !== t) setTerrain(grid, x, y, want)
  if ((want === PATH || want === ROAD) && (claim === CLAIM_NONE || claim === CLAIM_PATH)) {
    setClaim(grid, x, y, CLAIM_PATH)
  }
  markTraffic(grid, x, y, grade === 2 ? 24 : grade === 1 ? 16 : 8)
}

export function stampPlaza(grid: WorldGrid, cx: number, cy: number) {
  tryPave(grid, cx, cy, 1)
  tryPave(grid, cx + 1, cy, 1)
  tryPave(grid, cx - 1, cy, 1)
  tryPave(grid, cx, cy + 1, 1)
  tryPave(grid, cx, cy - 1, 1)
}

export function nearestPaveable(grid: WorldGrid, x: number, y: number, radius = 2): { x: number; y: number } | null {
  if (inBounds(grid, x, y) && canPave(getTerrain(grid, x, y), getClaim(grid, x, y), grid.amount[idx(grid, x, y)])) return { x, y }
  for (let r = 1; r <= radius; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue
        const nx = x + dx
        const ny = y + dy
        if (!inBounds(grid, nx, ny)) continue
        if (canPave(getTerrain(grid, nx, ny), getClaim(grid, nx, ny), grid.amount[idx(grid, nx, ny)])) return { x: nx, y: ny }
      }
    }
  }
  return null
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

function neighborWorn(grid: WorldGrid, i: number, x: number, y: number) {
  const w = grid.width
  const t = grid.terrain
  return {
    e: x < w - 1 && isWornRoad(t[i + 1]),
    west: x > 0 && isWornRoad(t[i - 1]),
    s: y < grid.height - 1 && isWornRoad(t[i + w]),
    n: y > 0 && isWornRoad(t[i - w]),
  }
}

export function tickRoadWear(grid: WorldGrid, _tick: number) {
  const list = grid.walkedList
  if (list.length === 0) return
  // Cap work per tick so Speed Max does not stall on huge trail networks.
  const slice = list.length > 12000 ? 420 : list.length > 8000 ? 520 : list.length > 3000 ? 700 : 900
  let cursor = grid.walkedCursor % list.length
  const budget = Math.min(slice, list.length)
  const w = grid.width

  for (let n = 0; n < budget; n++) {
    if (list.length === 0) break
    if (cursor >= list.length) cursor = 0
    const i = list[cursor]
    const terrain = grid.terrain[i]
    const paved = isWornRoad(terrain)
    const t = grid.traffic[i] * (paved ? TRAFFIC_DECAY_PAVED : TRAFFIC_DECAY_WILD)
    grid.traffic[i] = t

    const x = i % w
    const y = (i / w) | 0
    const claim = grid.claim[i]
    if (canPave(terrain, claim, grid.amount[i])) {
      let want = t >= TRAFFIC_ROAD ? ROAD : t >= TRAFFIC_PATH ? PATH : t >= TRAFFIC_TRAIL ? TRAIL : terrain
      if (!paved && want === terrain) {
        const nb = neighborWorn(grid, i, x, y)
        if ((nb.n && nb.s) || (nb.e && nb.west)) want = TRAIL
        else {
          let worn = 0
          if (nb.n) worn++
          if (nb.s) worn++
          if (nb.e) worn++
          if (nb.west) worn++
          if (worn >= 2 && t >= TRAFFIC_TRAIL * 0.35) want = TRAIL
        }
      }
      if (paved && t < TRAFFIC_TRAIL * 0.35 && terrain === TRAIL) {
        const nb = neighborWorn(grid, i, x, y)
        const links = (nb.n ? 1 : 0) + (nb.s ? 1 : 0) + (nb.e ? 1 : 0) + (nb.west ? 1 : 0)
        if (links === 0) want = GRASS
      }
      if (want !== terrain) {
        if (want === GRASS || roadRank(want) < roadRank(terrain)) {
          setTerrain(grid, x, y, want)
          if (want !== PATH && want !== ROAD && claim === CLAIM_PATH) setClaim(grid, x, y, CLAIM_NONE)
        } else {
          tryPave(grid, x, y, want === ROAD ? 2 : want === PATH ? 1 : 0)
        }
      }
      if (terrain === ROAD || (terrain === PATH && t >= TRAFFIC_ROAD * 0.7)) {
        const nb = neighborWorn(grid, i, x, y)
        const spineNS = nb.n && nb.s && !nb.e && !nb.west
        const spineEW = nb.e && nb.west && !nb.n && !nb.s
        if (spineNS || spineEW) {
          for (let k = 0; k < 4; k++) {
            const nx = x + OX[k]
            const ny = y + OY[k]
            if (!inBounds(grid, nx, ny)) continue
            const nt = grid.terrain[ny * w + nx]
            if (nt !== GRASS && nt !== DIRT && nt !== SAND) continue
            if (spineNS && OY[k] === 0) tryPave(grid, nx, ny, 0)
            if (spineEW && OX[k] === 0) tryPave(grid, nx, ny, 0)
          }
        }
      }
    }
    if (t < TRAFFIC_TRAIL * 0.4 && !isWornRoad(grid.terrain[i])) {
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
  if (t === SAND) return -0.5
  return 0
}
