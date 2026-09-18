/**
 * Orphan / abandoned home-shell cleanup — prevents wall spam on grass.
 * Incomplete footprints must not persist after scrap / death / stall.
 */

import {
  houseFootprint,
  type Cell,
  type HouseDesign,
  type HouseFootprint,
} from '../architecture'
import {
  BED,
  BENCH,
  CHEST,
  CLAIM_HOUSE,
  CLAIM_NONE,
  CRADLE,
  CUPBOARD,
  GRASS,
  HEARTH,
  HOUSE,
  LOOM,
  PLANK,
  SHELF,
  STOOL,
  TABLE,
  WALL_STONE,
  WALL_WOOD,
  WASHING_TUB,
  WORKBENCH,
  type SimState,
  type Villager,
  type WorldGrid,
} from '../types'
import { getClaim, getTerrain, inBounds, setClaim, setTerrain } from '../world'
import type { ChunkStore } from './blockWorld'
import {
  MIN_SHELL_WALL_CELLS,
  STRAY_CLEANUP_PERIOD,
} from './buildTypes'
import { mirrorTerrainToBlocks } from './chunks'
import { allFootprintWalls, footprintFromPlan } from './tasks'
import type { SpatialHomePlan } from './types'

const WALL = new Set([HOUSE, WALL_WOOD, WALL_STONE])
const FURN = new Set([
  BED,
  CHEST,
  WORKBENCH,
  TABLE,
  HEARTH,
  BENCH,
  STOOL,
  SHELF,
  CUPBOARD,
  CRADLE,
  LOOM,
  WASHING_TUB,
])
const CLEARABLE = new Set([...WALL, PLANK, ...FURN])

function cellKey(c: Cell) {
  return `${c.x},${c.y}`
}

export function isShellWallTerrain(t: number): boolean {
  return WALL.has(t)
}

export function countPlacedShellWalls(grid: WorldGrid, cells: Cell[]): number {
  let n = 0
  for (const c of cells) {
    if (!inBounds(grid, c.x, c.y)) continue
    if (isShellWallTerrain(getTerrain(grid, c.x, c.y))) n++
  }
  return n
}

export function incompleteShellShouldReclaim(placed: number, planned: number): boolean {
  if (placed <= 0) return false
  // Only tiny stub fragments — never wipe a living mid-build scaffold (S1 ≠ thrash).
  if (placed < MIN_SHELL_WALL_CELLS) return true
  void planned
  return false
}

export function footprintCells(fp: HouseFootprint): Cell[] {
  return [...allFootprintWalls(fp), ...fp.interior, ...fp.open, fp.door]
}

/** Wipe one unfinished home footprint back to grass (no orphan stubs). */
export function clearHomeFootprintTerrain(
  grid: WorldGrid,
  fp: HouseFootprint,
  blocks?: ChunkStore | null,
): number {
  let n = 0
  for (const c of footprintCells(fp)) {
    if (!inBounds(grid, c.x, c.y)) continue
    const t = getTerrain(grid, c.x, c.y)
    if (!CLEARABLE.has(t)) {
      if (getClaim(grid, c.x, c.y) === CLAIM_HOUSE) setClaim(grid, c.x, c.y, CLAIM_NONE)
      continue
    }
    setTerrain(grid, c.x, c.y, GRASS, 0)
    setClaim(grid, c.x, c.y, CLAIM_NONE)
    if (blocks) {
      mirrorTerrainToBlocks(blocks, c.x, c.y, GRASS, 0)
      mirrorTerrainToBlocks(blocks, c.x, c.y, GRASS, 1)
    }
    n++
  }
  return n
}

/** Remove wall / plank debris on arbitrary cells (civic projects, etc.). */
export function reclaimShellCells(
  grid: WorldGrid,
  cells: Cell[],
  blocks?: ChunkStore | null,
): number {
  let removed = 0
  for (const c of cells) {
    if (!inBounds(grid, c.x, c.y)) continue
    const t = getTerrain(grid, c.x, c.y)
    const claim = getClaim(grid, c.x, c.y)
    if (!WALL.has(t) && !(t === PLANK && claim === CLAIM_HOUSE)) {
      if (claim === CLAIM_HOUSE) setClaim(grid, c.x, c.y, CLAIM_NONE)
      continue
    }
    setTerrain(grid, c.x, c.y, GRASS, 0)
    setClaim(grid, c.x, c.y, CLAIM_NONE)
    if (blocks) {
      mirrorTerrainToBlocks(blocks, c.x, c.y, GRASS, 0)
      mirrorTerrainToBlocks(blocks, c.x, c.y, GRASS, 1)
    }
    removed++
  }
  return removed
}

export function villagerHomeFootprint(v: Villager): HouseFootprint | null {
  if (!v.house || v.homeX < 0) return null
  if (v.homePlan) return footprintFromPlan(v.homePlan, v.homeX, v.homeY)
  return houseFootprint(v.house, v.homeX, v.homeY)
}

/** Collect world cells that belong to any villager's planned / owned / late home. */
function protectedHomeCells(state: SimState): Set<string> {
  const keep = new Set<string>()
  for (const v of state.villagers) {
    if (!v.house || v.homeX < 0) continue
    // Dead unfinished already reclaimed on death; skip.
    if (!v.alive && !v.hasHome) continue
    const fp = villagerHomeFootprint(v)
    if (!fp) continue
    // Always protect living / finished footprints — mid-build scaffolds stay intentional.
    for (const c of footprintCells(fp)) keep.add(cellKey(c))
  }
  for (const p of state.projects) {
    if (p.phase === 'done') continue
    for (const c of [
      ...p.footprint.walls,
      ...p.footprint.towers,
      ...p.footprint.interior,
      ...p.footprint.open,
      ...(p.footprint.door ? [p.footprint.door] : []),
    ]) {
      keep.add(cellKey(c))
    }
  }
  for (const vg of state.villages) {
    for (const c of vg.perimeter) keep.add(cellKey(c))
  }
  return keep
}

/**
 * Remove CLAIM_HOUSE wall connected-components that are tiny and unowned.
 * Targets 1×1 / stub lines left by abandoned progressive builds.
 */
export function cleanupOrphanHomeWalls(state: SimState): number {
  const grid = state.grid
  const gw = grid.width
  const gh = grid.height
  const terrain = grid.terrain
  const claim = grid.claim
  const keep = protectedHomeCells(state)
  const visited = new Uint8Array(terrain.length)
  let cleared = 0

  const isOrphanCandidate = (i: number) =>
    WALL.has(terrain[i]!) && (claim[i] === CLAIM_HOUSE || claim[i] === CLAIM_NONE)

  for (let y = 0; y < gh; y++) {
    for (let x = 0; x < gw; x++) {
      const i0 = y * gw + x
      if (visited[i0] || !isOrphanCandidate(i0)) continue

      const cells: number[] = []
      const stack = [i0]
      visited[i0] = 1
      let minX = x
      let maxX = x
      let minY = y
      let maxY = y
      let protectedHit = false
      let anyHouseClaim = false

      while (stack.length) {
        const i = stack.pop()!
        cells.push(i)
        const cx = i % gw
        const cy = (i / gw) | 0
        if (cx < minX) minX = cx
        if (cx > maxX) maxX = cx
        if (cy < minY) minY = cy
        if (cy > maxY) maxY = cy
        if (keep.has(`${cx},${cy}`)) protectedHit = true
        if (claim[i] === CLAIM_HOUSE) anyHouseClaim = true

        for (const [dx, dy] of [
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
        ] as const) {
          const nx = cx + dx
          const ny = cy + dy
          if (nx < 0 || ny < 0 || nx >= gw || ny >= gh) continue
          const ni = ny * gw + nx
          if (visited[ni] || !isOrphanCandidate(ni)) continue
          visited[ni] = 1
          stack.push(ni)
        }
      }

      if (protectedHit) continue
      // Pure CLAIM_NONE clusters may be village walls mid-build — only scrap if tiny & isolated.
      const w = maxX - minX + 1
      const h = maxY - minY + 1
      const size = cells.length
      const orphan =
        size <= 4 ||
        (size <= 10 && (w === 1 || h === 1)) ||
        (size <= 8 && w * h > size * 2)
      if (!orphan) continue
      if (!anyHouseClaim && size > 1) continue // leave connected unclaimed civic stubs alone

      for (const i of cells) {
        const cx = i % gw
        const cy = (i / gw) | 0
        setTerrain(grid, cx, cy, GRASS, 0)
        setClaim(grid, cx, cy, CLAIM_NONE)
        if (state.blocks) {
          mirrorTerrainToBlocks(state.blocks, cx, cy, GRASS, 0)
          mirrorTerrainToBlocks(state.blocks, cx, cy, GRASS, 1)
        }
        cleared++
      }
    }
  }

  return cleared
}

/** Scrap an unfinished home plan and erase its terrain stubs. */
export function abandonIncompleteHome(state: SimState, v: Villager): void {
  if (v.hasHome) return
  const fp = villagerHomeFootprint(v)
  if (fp) clearHomeFootprintTerrain(state.grid, fp, state.blocks)
  v.house = null
  v.homePlan = null
  v.buildQueue = []
  v.homeX = -1
  v.homeY = -1
  v.homeLayout = null
  v.furnitureQueue = []
}

/** On death: if shell never closed, erase stubs so heirs don't inherit debris. */
export function clearDeadBuilderShell(state: SimState, v: Villager): void {
  if (v.hasHome) return
  abandonIncompleteHome(state, v)
}

/**
 * Reclaim incomplete home shell (threshold-aware unless force).
 * Used by scrap / death / stall paths.
 */
export function reclaimIncompleteHome(state: SimState, v: Villager, force = false): number {
  if (v.hasHome && !force) return 0
  const fp = villagerHomeFootprint(v)
  if (!fp) return 0
  const walls = allFootprintWalls(fp)
  const placed = countPlacedShellWalls(state.grid, walls)
  if (!force && !incompleteShellShouldReclaim(placed, walls.length)) {
    if (placed === 0) {
      for (const c of footprintCells(fp)) {
        if (inBounds(state.grid, c.x, c.y) && getClaim(state.grid, c.x, c.y) === CLAIM_HOUSE) {
          setClaim(state.grid, c.x, c.y, CLAIM_NONE)
        }
      }
    }
    return 0
  }
  return clearHomeFootprintTerrain(state.grid, fp, state.blocks)
}

/** After shell close: fill accidental mid-side gaps; only planned door stays open. */
export function sealAccidentalWallGaps(
  grid: WorldGrid,
  fp: HouseFootprint,
  wallCode: number,
  blocks?: ChunkStore | null,
): number {
  let sealed = 0
  const doorK = cellKey(fp.door)
  for (const c of fp.walls) {
    if (cellKey(c) === doorK) continue
    if (!inBounds(grid, c.x, c.y)) continue
    const t = getTerrain(grid, c.x, c.y)
    if (WALL.has(t) || FURN.has(t)) continue
    setTerrain(grid, c.x, c.y, wallCode)
    setClaim(grid, c.x, c.y, CLAIM_HOUSE)
    if (blocks) mirrorTerrainToBlocks(blocks, c.x, c.y, wallCode, 1)
    sealed++
  }
  // Door must stay an opening (plank threshold).
  if (inBounds(grid, fp.door.x, fp.door.y)) {
    const dt = getTerrain(grid, fp.door.x, fp.door.y)
    if (WALL.has(dt)) {
      setTerrain(grid, fp.door.x, fp.door.y, PLANK)
      if (blocks) mirrorTerrainToBlocks(blocks, fp.door.x, fp.door.y, PLANK, 0)
    }
  }
  return sealed
}

/**
 * Periodic: scrap stalled tiny shells + sweep orphan wall components.
 */
/**
 * Periodic: sweep unowned orphan wall components only.
 * Living mid-build scaffolds are never scrapped here (avoids homeWall regress + S2 thrash).
 */
export function tickStrayConstructionCleanup(state: SimState): void {
  if (state.tick % STRAY_CLEANUP_PERIOD !== 0) return
  cleanupOrphanHomeWalls(state)
}

export type { HouseDesign, SpatialHomePlan }
