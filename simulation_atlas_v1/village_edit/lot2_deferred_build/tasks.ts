/**
 * Emit progressive block-by-block build queues from a spatial plan.
 */

import { houseFootprint, type Cell, type HouseFootprint } from '../architecture'
import type { WorldGrid } from '../types'
import { getTerrain, inBounds } from '../world'
import { HOUSE, PLANK, WALL_STONE, WALL_WOOD } from '../types'
import { blockNeedsWork, defaultMaterialForKind } from './chunks'
import type { BuildBlock, DoorSide, SpatialHomePlan } from './types'

function cellKey(c: Cell) {
  return `${c.x},${c.y}`
}

/** Relocate door on a footprint according to planned facing. */
export function applyDoorSide(fp: HouseFootprint, cx: number, cy: number, side: DoorSide, designRx: number, designRy: number): HouseFootprint {
  const door: Cell =
    side === 'N'
      ? { x: cx, y: cy - designRy }
      : side === 'E'
        ? { x: cx + designRx, y: cy }
        : side === 'W'
          ? { x: cx - designRx, y: cy }
          : { x: cx, y: cy + designRy }

  const walls = fp.walls.filter((c) => !(c.x === door.x && c.y === door.y))
  // Ensure old south door cell becomes a wall if door moved.
  const oldDoor = fp.door
  if (oldDoor.x !== door.x || oldDoor.y !== door.y) {
    const onPerimeter =
      oldDoor.x === cx - designRx ||
      oldDoor.x === cx + designRx ||
      oldDoor.y === cy - designRy ||
      oldDoor.y === cy + designRy
    if (onPerimeter && !walls.some((c) => c.x === oldDoor.x && c.y === oldDoor.y)) {
      walls.push({ ...oldDoor })
    }
  }
  const partitions = (fp.partitions ?? []).filter((c) => !(c.x === door.x && c.y === door.y))
  return { ...fp, walls, partitions, door }
}

function pickWindowCells(walls: Cell[], door: Cell, count: number, rng: () => number): Cell[] {
  if (count <= 0 || walls.length === 0) return []
  const candidates = walls.filter((c) => Math.abs(c.x - door.x) + Math.abs(c.y - door.y) > 1)
  const shuffled = [...candidates].sort(() => rng() - 0.5)
  const out: Cell[] = []
  const used = new Set<string>()
  for (const c of shuffled) {
    if (out.length >= count) break
    const k = cellKey(c)
    if (used.has(k)) continue
    // Prefer spaced windows.
    if (out.some((w) => Math.abs(w.x - c.x) + Math.abs(w.y - c.y) < 2)) continue
    used.add(k)
    out.push(c)
  }
  return out
}

/**
 * Order exterior walls as a contiguous ring from the door — mid-build reads as
 * intentional scaffold (MC/RW), not scanline debris (S1/S2).
 */
export function orderShellFromDoor(walls: Cell[], door: Cell): Cell[] {
  if (walls.length <= 1) return [...walls]
  const set = new Map(walls.map((c) => [cellKey(c), c] as const))
  const dirs: [number, number][] = [
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, -1],
  ]
  let start: Cell | null = null
  for (const [dx, dy] of dirs) {
    const hit = set.get(`${door.x + dx},${door.y + dy}`)
    if (hit) {
      start = hit
      break
    }
  }
  if (!start) start = walls[0]!

  const ordered: Cell[] = []
  const used = new Set<string>()
  let cur: Cell | null = start
  let guard = walls.length + 4
  while (cur && ordered.length < walls.length && guard-- > 0) {
    ordered.push(cur)
    used.add(cellKey(cur))
    let next: Cell | null = null
    for (const [dx, dy] of dirs) {
      const n = set.get(`${cur.x + dx},${cur.y + dy}`)
      if (n && !used.has(cellKey(n))) {
        next = n
        break
      }
    }
    if (!next) {
      for (const w of walls) {
        if (!used.has(cellKey(w))) {
          next = w
          break
        }
      }
    }
    cur = next
  }
  return ordered
}

/**
 * Build ordered placement queue:
 * exterior walls → door → floors → windows → partitions
 * Shell becomes livable before interior dividers (avoids wood-starved fragment spam).
 */
export function emitBuildQueue(
  plan: SpatialHomePlan,
  cx: number,
  cy: number,
  rng: () => number,
  opts?: { onlyMissing?: boolean; grid?: WorldGrid; previousWalls?: Set<string> },
): BuildBlock[] {
  let fp = houseFootprint(plan.design, cx, cy)
  fp = applyDoorSide(fp, cx, cy, plan.doorSide, plan.design.rx, plan.design.ry)

  const windowCells = pickWindowCells(fp.walls, fp.door, plan.windowCount, rng)
  const windowKeys = new Set(windowCells.map(cellKey))
  const partitions = fp.partitions ?? []

  const queue: BuildBlock[] = []
  const push = (kind: BuildBlock['kind'], c: Cell) => {
    if (opts?.previousWalls?.has(cellKey(c)) && kind !== 'floor') return
    const material = defaultMaterialForKind(kind, plan.wallMaterial, plan.floorMaterial)
    const block: BuildBlock = { kind, x: c.x, y: c.y, material, done: false }
    if (opts?.onlyMissing && opts.grid && !blockNeedsWork(opts.grid, block)) {
      block.done = true
    }
    queue.push(block)
  }

  // 1) Full exterior shell first — including future window cells as walls.
  //    (Excluding them left mid-side grass holes until late window jobs.)
  //    Door is the sole intentional opening; ring order avoids scanline debris.
  const exterior = orderShellFromDoor(fp.walls, fp.door)
  for (const c of exterior) push('wall', c)

  // 2) Door threshold — single planned opening (not a random gap).
  push('door', fp.door)

  // 3) Floors so interiors read as rooms (never leave grass).
  if (plan.floorMaterial !== 'none') {
    const floors = [...fp.interior].sort((a, b) => a.y - b.y || a.x - b.x)
    for (const c of floors) push('floor', c)
  }

  // 4) Windows — already walled in step 1; mark done when onlyMissing / after shell.
  for (const c of windowCells.sort((a, b) => a.y - b.y || a.x - b.x)) {
    push('window', c)
  }

  // 5) Interior partitions last — after the home is already livable.
  for (const c of [...partitions].sort((a, b) => a.y - b.y || a.x - b.x)) {
    if (windowKeys.has(cellKey(c))) continue
    push('partition', c)
  }

  return queue
}

/** Next unfinished block that still needs grid work. */
export function nextBuildBlock(queue: BuildBlock[], grid?: WorldGrid): BuildBlock | null {
  for (const b of queue) {
    if (b.done) continue
    if (grid && !blockNeedsWork(grid, b)) {
      b.done = true
      continue
    }
    return b
  }
  return null
}

/** Mark matching queue entry done after placement. */
export function markBlockDone(queue: BuildBlock[], x: number, y: number, kind?: BuildBlock['kind']): void {
  for (const b of queue) {
    if (b.done) continue
    if (b.x === x && b.y === y && (!kind || b.kind === kind)) {
      b.done = true
      return
    }
  }
}

/**
 * Exterior shell remaining — partitions/windows do NOT block livability.
 * (Partitions are finished after floors + furniture.)
 */
export function structuralBlocksRemaining(queue: BuildBlock[]): number {
  return queue.filter((b) => !b.done && b.kind === 'wall').length
}

export function shellClosed(queue: BuildBlock[], grid: WorldGrid, fp: HouseFootprint): boolean {
  if (queue.length > 0) {
    return structuralBlocksRemaining(queue) === 0
  }
  return fp.walls.every((c) => {
    if (!inBounds(grid, c.x, c.y)) return true
    const t = getTerrain(grid, c.x, c.y)
    return t === HOUSE || t === WALL_WOOD || t === WALL_STONE
  })
}

export function footprintFromPlan(plan: SpatialHomePlan, cx: number, cy: number): HouseFootprint {
  const raw = houseFootprint(plan.design, cx, cy)
  return applyDoorSide(raw, cx, cy, plan.doorSide, plan.design.rx, plan.design.ry)
}

/** Regenerate queue from an existing design (migration / empty-queue repair). */
export function rebuildQueueFromDesign(
  design: SpatialHomePlan['design'],
  cx: number,
  cy: number,
  rng: () => number,
  grid?: WorldGrid,
): BuildBlock[] {
  const plan: SpatialHomePlan = {
    design,
    doorSide: design.doorSide ?? 'S',
    wallMaterial: design.wallMaterial ?? 'timber',
    floorMaterial: design.floorMaterial ?? 'plank',
    windowCount: 1,
    reasons: ['reprise de file'],
    mode: 'new',
    cultureTags: [],
  }
  return emitBuildQueue(plan, cx, cy, rng, { onlyMissing: true, grid })
}

export function isWallTerrain(t: number): boolean {
  return t === HOUSE || t === WALL_WOOD || t === WALL_STONE || t === PLANK
}

/** All structural wall cells (exterior + partitions). */
export function allFootprintWalls(fp: HouseFootprint): Cell[] {
  return [...fp.walls, ...(fp.partitions ?? [])]
}
