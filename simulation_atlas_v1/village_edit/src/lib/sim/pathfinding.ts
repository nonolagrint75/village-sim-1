import { markCrossingDemand, markTraffic, tryPave } from './roads'
import { getSimPerfBudget } from './perfBudget'
import { pathTerrainTimeCost } from './physicsScale'
import {
  BRIDGE,
  BUSH,
  FENCE,
  GOLD,
  HOUSE,
  IRON,
  MILL,
  MOUNTAIN,
  PATH,
  PORT,
  ROAD,
  STONE,
  TRAIL,
  TREE,
  TUNNEL,
  WALL_STONE,
  WALL_WOOD,
  WATER,
  WORLD_SIZE,
  WORLD_SIZE_MAX,
  type WorldGrid,
} from './types'
import { getTerrain, inBounds, isLightVegetation } from './world'

/** 8-connected king-move offsets. Ortho first, then diagonals. */
const OX = [1, -1, 0, 0, 1, 1, -1, -1]
const OY = [0, 0, 1, -1, 1, -1, 1, -1]
const STEP_LEN = [10, 10, 10, 10, 14, 14, 14, 14]

const MIN_COST = 4
const PATH_STORE = 120
const REPATH_TICKS = 90
/** Base budgets — scaled each tick by live population (see resetPathBudget). */
const NODES_PER_TICK_BASE = 16000
const SEARCHES_PER_TICK_BASE = 9
const HEAP_CAP = 16384
const MAX_CELLS = WORLD_SIZE_MAX * WORLD_SIZE_MAX

export const VILLAGER_NODE_CAP = 3200
export const LOCAL_NODE_CAP = 240

export interface PathProfile {
  amphibious: boolean
  cargo: boolean
  cart: boolean
  boatX: number
  boatY: number
  /** Corridor laying: walk around forest instead of paving through it. */
  avoidVeg?: boolean
  /** Remembered danger tiles — extra A* cost (capped; keeps budgets stable). */
  dangerSpots?: ReadonlyArray<{ x: number; y: number; weight: number }>
  /** 0–1: higher courage → less path avoidance of danger. */
  dangerCourage?: number
}

export const LAND_PROFILE: PathProfile = {
  amphibious: false,
  cargo: false,
  cart: false,
  boatX: -1,
  boatY: -1,
}

export const CORRIDOR_PROFILE: PathProfile = {
  amphibious: false,
  cargo: false,
  cart: false,
  boatX: -1,
  boatY: -1,
  avoidVeg: true,
}

export interface PathCache {
  path: number[] | null
  pathI: number
  pathTx: number
  pathTy: number
  pathTick: number
}

const seen = new Int32Array(MAX_CELLS)
const closed = new Int32Array(MAX_CELLS)
const gScore = new Uint32Array(MAX_CELLS)
const parent = new Int32Array(MAX_CELLS)
const heap = new Int32Array(HEAP_CAP)
const heapF = new Int32Array(HEAP_CAP)

let stamp = 1
let heapN = 0
let nodesLeft = NODES_PER_TICK_BASE
let searchesLeft = SEARCHES_PER_TICK_BASE

/**
 * Reset A* budgets for this sim tick.
 * With more agents: slightly more total searches (sublinear), slightly fewer nodes per search
 * so Speed Max stays interactive. Ready to mirror in WASM kernel later.
 */
export function resetPathBudget(aliveAgents = 40) {
  const a = Math.max(20, aliveAgents)
  const scale = getSimPerfBudget().pathScale
  const tps = getSimPerfBudget().lastTps
  // High pop / low TPS: few A* searches — greedy covers the rest (causal motion kept).
  const popMul = a >= 400 ? 0.35 : a >= 280 ? 0.55 : a >= 180 ? 0.75 : 1
  const tpsMul = tps > 0 && tps < 50 ? 0.55 : tps > 0 && tps < 80 ? 0.75 : 1
  searchesLeft = Math.max(
    2,
    Math.min(8, Math.round((SEARCHES_PER_TICK_BASE + ((a / 100) | 0)) * scale * popMul * tpsMul)),
  )
  const nodeMul = a >= 400 ? 0.4 : a >= 280 ? 0.6 : 1
  nodesLeft = Math.max(
    2500,
    Math.min(14000, Math.round((NODES_PER_TICK_BASE + ((a * 8) | 0)) * scale * nodeMul * tpsMul)),
  )
}

export function chebyshev(x1: number, y1: number, x2: number, y2: number): number {
  const dx = x1 < x2 ? x2 - x1 : x1 - x2
  const dy = y1 < y2 ? y2 - y1 : y1 - y2
  return dx > dy ? dx : dy
}

export function landWalkable(t: number): boolean {
  return t !== WATER && t !== MOUNTAIN && t !== FENCE && t !== HOUSE && t !== WALL_WOOD && t !== WALL_STONE
}

function terrainCost(t: number, profile: PathProfile): number {
  return pathTerrainTimeCost(t, !!profile.cart, !!profile.cargo)
}

function trafficDiscount(traffic: number): number {
  if (traffic >= 100) return 2
  if (traffic >= 28) return 1
  return 0
}

/** Soft semantic danger cost — prefer roads/traffic around known wolf tiles. */
function dangerCost(x: number, y: number, profile: PathProfile): number {
  const spots = profile.dangerSpots
  if (!spots || spots.length === 0) return 0
  const scale = 1.2 - (profile.dangerCourage ?? 0.5) * 0.75
  let extra = 0
  // Cap iterations — tactics already packs few spots; keep A* inner loop tight.
  const n = spots.length < 6 ? spots.length : 6
  for (let i = 0; i < n; i++) {
    const s = spots[i]!
    const d = chebyshev(x, y, s.x, s.y)
    if (d > 9) continue
    const w = s.weight * scale
    if (d <= 2) extra += 16 * w
    else if (d <= 5) extra += 8 * w
    else extra += 3 * w
  }
  if (extra > 36) return 36
  return extra | 0
}

function heuristic(x: number, y: number, tx: number, ty: number): number {
  const dx = x < tx ? tx - x : x - tx
  const dy = y < ty ? ty - y : y - ty
  const max = dx > dy ? dx : dy
  const min = dx < dy ? dx : dy
  return MIN_COST * (10 * max + 4 * min)
}

function canEmbark(fx: number, fy: number, tx: number, ty: number, profile: PathProfile): boolean {
  if (profile.boatX < 0) return false
  return chebyshev(fx, fy, profile.boatX, profile.boatY) <= 1 && chebyshev(tx, ty, profile.boatX, profile.boatY) <= 1
}

function passable(terrain: Uint8Array, width: number, height: number, fx: number, fy: number, tx: number, ty: number, profile: PathProfile): boolean {
  if (tx < 0 || ty < 0 || tx >= width || ty >= height) return false
  const ft = terrain[fy * width + fx]
  const tt = terrain[ty * width + tx]
  const fromWater = ft === WATER
  const toWater = tt === WATER

  if (fromWater) {
    if (toWater) return profile.amphibious
    if (!profile.amphibious) return false
    if (tt === PORT) return true
    if (profile.cargo) return false
    return landWalkable(tt)
  }
  if (toWater) {
    if (!profile.amphibious) return false
    return canEmbark(fx, fy, tx, ty, profile)
  }
  if (profile.avoidVeg && isLightVegetation(tt)) return false
  return landWalkable(tt)
}

function heapPush(i: number, f: number) {
  if (heapN >= HEAP_CAP) return
  let n = heapN++
  heap[n] = i
  heapF[n] = f
  while (n > 0) {
    const p = (n - 1) >> 1
    if (heapF[p] <= heapF[n]) break
    const ti = heap[p]
    const tf = heapF[p]
    heap[p] = heap[n]
    heapF[p] = heapF[n]
    heap[n] = ti
    heapF[n] = tf
    n = p
  }
}

function heapPop(): number {
  const out = heap[0]
  heapN--
  if (heapN <= 0) return out
  heap[0] = heap[heapN]
  heapF[0] = heapF[heapN]
  let n = 0
  for (;;) {
    const l = n * 2 + 1
    if (l >= heapN) break
    let s = l
    const r = l + 1
    if (r < heapN && heapF[r] < heapF[l]) s = r
    if (heapF[n] <= heapF[s]) break
    const ti = heap[n]
    const tf = heapF[n]
    heap[n] = heap[s]
    heapF[n] = heapF[s]
    heap[s] = ti
    heapF[s] = tf
    n = s
  }
  return out
}

function reconstruct(end: number, start: number, maxSteps: number): number[] {
  const rev: number[] = []
  let cur = end
  let guard = 0
  while (cur !== start && cur >= 0 && guard++ < 8000) {
    rev.push(cur)
    cur = parent[cur]
  }
  rev.reverse()
  if (rev.length > maxSteps) rev.length = maxSteps
  return rev
}

export function findPath(
  grid: WorldGrid,
  x: number,
  y: number,
  tx: number,
  ty: number,
  profile: PathProfile,
  opts?: { nodeCap?: number; ignoreSearchBudget?: boolean; maxSteps?: number },
): number[] | null {
  const width = grid.width
  const height = grid.height
  if (x < 0 || y < 0 || x >= width || y >= height) return null
  if (chebyshev(x, y, tx, ty) <= 1) return []

  const ignore = opts?.ignoreSearchBudget === true
  if (!ignore) {
    if (searchesLeft <= 0 || nodesLeft <= 0) return null
    searchesLeft--
  }
  if (nodesLeft <= 0) return null

  const nodeCap = Math.min(opts?.nodeCap ?? VILLAGER_NODE_CAP, nodesLeft)
  const maxSteps = opts?.maxSteps ?? PATH_STORE
  const terrain = grid.terrain
  const traffic = grid.traffic
  const start = y * width + x

  stamp++
  if (stamp > 0x7ffff000) {
    seen.fill(0)
    closed.fill(0)
    stamp = 1
  }

  heapN = 0
  seen[start] = stamp
  gScore[start] = 0
  parent[start] = -1
  heapPush(start, heuristic(x, y, tx, ty))

  let expanded = 0
  let best = start
  let bestH = heuristic(x, y, tx, ty)
  let reached = -1

  while (heapN > 0 && expanded < nodeCap) {
    const i = heapPop()
    if (closed[i] === stamp) continue
    closed[i] = stamp
    const cx = i % width
    const cy = (i / width) | 0
    const h = heuristic(cx, cy, tx, ty)
    if (h < bestH) {
      bestH = h
      best = i
    }
    if (chebyshev(cx, cy, tx, ty) <= 1) {
      reached = i
      break
    }

    expanded++
    const g = gScore[i]
    for (let k = 0; k < 8; k++) {
      const nx = cx + OX[k]
      const ny = cy + OY[k]
      if (!passable(terrain, width, height, cx, cy, nx, ny, profile)) continue
      if (k >= 4) {
        if (!passable(terrain, width, height, cx, cy, cx + OX[k], cy, profile)) continue
        if (!passable(terrain, width, height, cx, cy, cx, cy + OY[k], profile)) continue
      }
      const ni = ny * width + nx
      if (closed[ni] === stamp) continue
      const tt = terrain[ni]
      let cost = terrainCost(tt, profile) - trafficDiscount(traffic[ni]) + dangerCost(nx, ny, profile)
      if (k >= 4 && tt !== ROAD && tt !== PATH && tt !== TRAIL && tt !== BRIDGE) cost += 5
      if (cost < MIN_COST) cost = MIN_COST
      const ng = g + cost * STEP_LEN[k]
      if (seen[ni] === stamp && ng >= gScore[ni]) continue
      seen[ni] = stamp
      gScore[ni] = ng
      parent[ni] = i
      heapPush(ni, ng + heuristic(nx, ny, tx, ty))
    }
  }

  nodesLeft -= expanded
  if (nodesLeft < 0) nodesLeft = 0

  if (reached < 0) {
    const bx = best % width
    const by = (best / width) | 0
    for (let k = 0; k < 4; k++) {
      const nx = bx + OX[k]
      const ny = by + OY[k]
      if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue
      if (terrain[ny * width + nx] === WATER) markCrossingDemand(grid, nx, ny)
    }
    if (best === start) return []
    const partial = reconstruct(best, start, maxSteps)
    return partial.length > 0 ? partial : []
  }
  return reconstruct(reached, start, maxSteps)
}

function greedyStep(
  grid: WorldGrid,
  x: number,
  y: number,
  tx: number,
  ty: number,
  profile: PathProfile,
): { x: number; y: number } | null {
  const sx = tx === x ? 0 : tx > x ? 1 : -1
  const sy = ty === y ? 0 : ty > y ? 1 : -1
  const candidates = [
    { x: x + sx, y: y + sy },
    { x: x + sx, y },
    { x, y: y + sy },
  ]
  let best: { x: number; y: number } | null = null
  let bestScore = 1e9
  for (const c of candidates) {
    if (c.x === x && c.y === y) continue
    if (!passable(grid.terrain, grid.width, grid.height, x, y, c.x, c.y, profile)) continue
    const ni = c.y * grid.width + c.x
    const score = terrainCost(grid.terrain[ni], profile) - trafficDiscount(grid.traffic[ni]) + dangerCost(c.x, c.y, profile)
    if (score < bestScore) {
      bestScore = score
      best = c
    }
  }
  return best
}

function kingPathClear(grid: WorldGrid, x: number, y: number, tx: number, ty: number, profile: PathProfile): boolean {
  let cx = x
  let cy = y
  const limit = chebyshev(x, y, tx, ty) + 2
  for (let n = 0; n < limit; n++) {
    if (chebyshev(cx, cy, tx, ty) <= 1) return true
    const next = greedyStep(grid, cx, cy, tx, ty, profile)
    if (!next) return false
    cx = next.x
    cy = next.y
  }
  return false
}

function applyStep(
  grid: WorldGrid,
  actor: { x: number; y: number },
  nx: number,
  ny: number,
  wear: number,
  onStep?: (nx: number, ny: number, fromX: number, fromY: number) => void,
) {
  const fromX = actor.x
  const fromY = actor.y
  actor.x = nx
  actor.y = ny
  if (wear > 0 && getTerrain(grid, nx, ny) !== WATER) markTraffic(grid, nx, ny, wear)
  if (onStep) onStep(nx, ny, fromX, fromY)
}

export function navigate(
  grid: WorldGrid,
  tick: number,
  actor: { x: number; y: number },
  cache: PathCache,
  tx: number,
  ty: number,
  speed: number,
  profile: PathProfile,
  wear: number,
  onStep?: (nx: number, ny: number, fromX: number, fromY: number) => void,
): boolean {
  const startX = actor.x
  const startY = actor.y
  if (chebyshev(actor.x, actor.y, tx, ty) <= 1) {
    // Amphibious embark: navigate normally refuses adjacent targets, but boarding a boat
    // requires stepping onto the water tile the boat occupies.
    if (
      profile.amphibious &&
      getTerrain(grid, tx, ty) === WATER &&
      getTerrain(grid, actor.x, actor.y) !== WATER &&
      passable(grid.terrain, grid.width, grid.height, actor.x, actor.y, tx, ty, profile)
    ) {
      applyStep(grid, actor, tx, ty, wear, onStep)
      return true
    }
    return false
  }

  const targetChanged = chebyshev(cache.pathTx, cache.pathTy, tx, ty) > 2
  const path = cache.path
  const remaining = path ? path.length - cache.pathI : 0
  const nextBlocked =
    remaining > 0 && path
      ? (() => {
          const i = path[cache.pathI]
          const nx = i % grid.width
          const ny = (i / grid.width) | 0
          return !passable(grid.terrain, grid.width, grid.height, actor.x, actor.y, nx, ny, profile)
        })()
      : false
  const stale = tick - cache.pathTick >= REPATH_TICKS
  const needPath = !path || remaining <= 0 || targetChanged || nextBlocked || (stale && remaining < 24)

  if (needPath) {
    const dist = chebyshev(actor.x, actor.y, tx, ty)
    const perf = getSimPerfBudget()
    // Under Max load: prefer greedy for mid-range — A* budget is scarce @500.
    const greedyPrefer =
      !profile.amphibious &&
      (dist <= 3 ||
        (perf.lastTps > 0 && perf.lastTps < 85 && dist <= 10) ||
        (perf.pathScale < 0.75 && dist <= 14 && searchesLeft <= 3))
    const shortOpen =
      greedyPrefer && (dist <= 3 || kingPathClear(grid, actor.x, actor.y, tx, ty, profile) || dist <= 8)
    if (shortOpen || (greedyPrefer && searchesLeft <= 0)) {
      cache.path = null
      cache.pathI = 0
      cache.pathTx = tx
      cache.pathTy = ty
      cache.pathTick = tick
      for (let s = 0; s < speed; s++) {
        if (chebyshev(actor.x, actor.y, tx, ty) <= 1) break
        const next = greedyStep(grid, actor.x, actor.y, tx, ty, profile)
        if (!next) break
        applyStep(grid, actor, next.x, next.y, wear, onStep)
      }
      return actor.x !== startX || actor.y !== startY
    }

    const found = findPath(grid, actor.x, actor.y, tx, ty, profile, {
      nodeCap: perf.lastTps > 0 && perf.lastTps < 80 ? Math.min(LOCAL_NODE_CAP * 4, 900) : undefined,
    })
    if (found && found.length > 0) {
      cache.path = found
      cache.pathI = 0
      cache.pathTx = tx
      cache.pathTy = ty
      cache.pathTick = tick
    } else if (targetChanged || nextBlocked || !path || remaining <= 0) {
      cache.path = found
      cache.pathI = 0
      cache.pathTx = tx
      cache.pathTy = ty
      cache.pathTick = tick
      for (let s = 0; s < speed; s++) {
        if (chebyshev(actor.x, actor.y, tx, ty) <= 1) break
        const next = greedyStep(grid, actor.x, actor.y, tx, ty, profile)
        if (!next) {
          const wx = actor.x + (tx === actor.x ? 0 : tx > actor.x ? 1 : -1)
          const wy = actor.y + (ty === actor.y ? 0 : ty > actor.y ? 1 : -1)
          if (inBounds(grid, wx, wy) && getTerrain(grid, wx, wy) === WATER) markCrossingDemand(grid, wx, wy)
          break
        }
        applyStep(grid, actor, next.x, next.y, wear, onStep)
      }
      return actor.x !== startX || actor.y !== startY
    }
  }

  const steps = cache.path
  if (!steps || cache.pathI >= steps.length) return actor.x !== startX || actor.y !== startY

  for (let s = 0; s < speed; s++) {
    if (chebyshev(actor.x, actor.y, tx, ty) <= 1) break
    if (cache.pathI >= steps.length) break
    const i = steps[cache.pathI]
    const nx = i % grid.width
    const ny = (i / grid.width) | 0
    if (chebyshev(actor.x, actor.y, nx, ny) > 1 || !passable(grid.terrain, grid.width, grid.height, actor.x, actor.y, nx, ny, profile)) {
      cache.path = null
      cache.pathI = 0
      break
    }
    applyStep(grid, actor, nx, ny, wear, onStep)
    cache.pathI++
  }
  return actor.x !== startX || actor.y !== startY
}

/** Greedy 8-dir step; if blocked, a cheap local A* around the obstacle. For animals and panic. */
export function nudgeToward(
  grid: WorldGrid,
  actor: { x: number; y: number },
  tx: number,
  ty: number,
  speed: number,
  profile: PathProfile = LAND_PROFILE,
  wear = 0,
  onStep?: (nx: number, ny: number, fromX: number, fromY: number) => void,
): boolean {
  const startX = actor.x
  const startY = actor.y
  let usedPath: number[] | null = null
  let cursor = 0

  for (let s = 0; s < speed; s++) {
    if (chebyshev(actor.x, actor.y, tx, ty) <= 1) break
    if (usedPath && cursor < usedPath.length) {
      const i = usedPath[cursor]
      const nx = i % grid.width
      const ny = (i / grid.width) | 0
      if (chebyshev(actor.x, actor.y, nx, ny) <= 1 && passable(grid.terrain, grid.width, grid.height, actor.x, actor.y, nx, ny, profile)) {
        applyStep(grid, actor, nx, ny, wear, onStep)
        cursor++
        continue
      }
      usedPath = null
    }
    const next = greedyStep(grid, actor.x, actor.y, tx, ty, profile)
    if (next) {
      applyStep(grid, actor, next.x, next.y, wear, onStep)
      continue
    }
    // Respect tick search budget — ignoreSearchBudget blew Max TPS @500 (local A* × N agents).
    if (searchesLeft > 0 && nodesLeft > 0) {
      const found = findPath(grid, actor.x, actor.y, tx, ty, profile, {
        nodeCap: LOCAL_NODE_CAP,
        maxSteps: 40,
      })
      if (found && found.length > 0) {
        usedPath = found
        cursor = 0
        const i = found[0]
        const nx = i % grid.width
        const ny = (i / grid.width) | 0
        if (passable(grid.terrain, grid.width, grid.height, actor.x, actor.y, nx, ny, profile)) {
          applyStep(grid, actor, nx, ny, wear, onStep)
          cursor = 1
          continue
        }
      }
    }
    break
  }
  return actor.x !== startX || actor.y !== startY
}

export function layCorridor(grid: WorldGrid, x0: number, y0: number, x1: number, y1: number, weight: number, grade: 0 | 1 | 2) {
  const path = findPath(grid, x0, y0, x1, y1, CORRIDOR_PROFILE, {
    nodeCap: 12000,
    ignoreSearchBudget: true,
    maxSteps: 8000,
  })
  if (!path || path.length === 0) return
  let px = x0
  let py = y0
  for (let n = 0; n < path.length; n++) {
    const i = path[n]
    const x = i % grid.width
    const y = (i / grid.width) | 0
    markTraffic(grid, x, y, weight)
    tryPave(grid, x, y, grade)
    const dx = x - px
    const dy = y - py
    if (dx !== 0 && dy !== 0) {
      tryPave(grid, px + dx, py, 0)
      tryPave(grid, px, py + dy, 0)
    }
    px = x
    py = y
  }
}

/** Hard obstacles a human community cannot flatten for a dirt lane. */
function laneHardBlock(t: number): boolean {
  return (
    t === WATER ||
    t === MOUNTAIN ||
    t === HOUSE ||
    t === FENCE ||
    t === WALL_WOOD ||
    t === WALL_STONE ||
    t === STONE ||
    t === IRON ||
    t === GOLD ||
    t === MILL
  )
}

const MAX_LANE_VEG = 4
const LANE_SCAN_MAX = 72

function inspectLane(grid: WorldGrid, x0: number, y0: number, x1: number, y1: number) {
  const veg: { x: number; y: number }[] = []
  let cx = x0
  let cy = y0
  const dist = chebyshev(x0, y0, x1, y1)
  for (let n = 0; n < dist + 2; n++) {
    if (cx === x1 && cy === y1) return { hard: false, veg }
    cx += Math.sign(x1 - cx)
    cy += Math.sign(y1 - cy)
    if (!inBounds(grid, cx, cy)) return { hard: true, veg }
    if (cx === x1 && cy === y1) return { hard: false, veg }
    const t = getTerrain(grid, cx, cy)
    if (laneHardBlock(t)) return { hard: true, veg }
    if (isLightVegetation(t)) {
      veg.push({ x: cx, y: cy })
      if (veg.length > MAX_LANE_VEG) return { hard: false, veg }
    }
  }
  return { hard: false, veg }
}

/**
 * If a short 1–2 tree belt sits on a useful straight lane and nearby gaps are not open,
 * return one tree/bush to chop. Never proposes razing a forest.
 */
export function findLaneBlocker(grid: WorldGrid, x0: number, y0: number, x1: number, y1: number): { x: number; y: number } | null {
  const dist = chebyshev(x0, y0, x1, y1)
  if (dist < 2 || dist > LANE_SCAN_MAX) return null
  const center = inspectLane(grid, x0, y0, x1, y1)
  if (!center.hard && center.veg.length === 0) return null

  const dx = Math.sign(x1 - x0)
  const dy = Math.sign(y1 - y0)
  let px = 0
  let py = 0
  if (dx === 0) px = 1
  else if (dy === 0) py = 1
  else {
    px = -dy
    py = dx
  }
  for (const off of [-1, 1, -2, 2]) {
    const gap = inspectLane(grid, x0 + px * off, y0 + py * off, x1 + px * off, y1 + py * off)
    if (!gap.hard && gap.veg.length === 0) return null
  }

  if (!center.hard && center.veg.length >= 1 && center.veg.length <= MAX_LANE_VEG) return center.veg[0]
  return null
}

export function seedTradeCorridor(grid: WorldGrid, x0: number, y0: number, x1: number, y1: number) {
  layCorridor(grid, x0, y0, x1, y1, 70, 1)
}
