/**
 * Furniture craft + placement into house rooms.
 * Jobs target RoomKind zones from rooms.ts (API for AI builders).
 */

import { mirrorTerrainToBlocks, type ChunkStore } from './build'
import type { HouseLayout, RoomKind } from './rooms'
import { pickCellInRoom, ROOM_FURNITURE, type RoomFurnitureKind } from './rooms'
import { BED, CHEST, HEARTH, HOUSE, TABLE, WALL_STONE, WALL_WOOD, WORKBENCH, type TaskKind } from './types'
import { getTerrain, inBounds, setTerrain, type WorldGrid } from './world'

export type FurnitureKind =
  | 'workbench'
  | 'chest'
  | 'bed'
  | 'table'
  | 'bench'
  | 'stool'
  | 'shelf'
  | 'cupboard'
  | 'hearth'
  | 'loom'
  | 'cradle'
  | 'tub'
  | 'sconce'
  | 'chandelier'

export type FurnitureJob = {
  kind: FurnitureKind
  roomKind: RoomKind
  x: number
  y: number
  done: boolean
}

/** Extra placeables tracked on the villager (beyond bed/chest/workbench/table flags). */
export type FurniturePlacement = {
  id: Exclude<FurnitureKind, 'workbench' | 'chest' | 'bed' | 'table'>
  x: number
  y: number
}

type FurnitureDef = {
  kind: FurnitureKind
  labelFr: string
  buildTask: TaskKind
  wood: number
  room: RoomKind
  terrain: number | null
}

/** Core defs used by builders today (terrain-backed). Soft kinds keep room targets for AI. */
export const FURNITURE_DEFS: Record<FurnitureKind, FurnitureDef> = {
  workbench: {
    kind: 'workbench',
    labelFr: 'établi',
    buildTask: 'buildWorkbench',
    wood: 4,
    room: 'atelier',
    terrain: WORKBENCH,
  },
  chest: {
    kind: 'chest',
    labelFr: 'coffre',
    buildTask: 'buildChest',
    wood: 5,
    room: 'reserve',
    terrain: CHEST,
  },
  bed: {
    kind: 'bed',
    labelFr: 'lit',
    buildTask: 'buildBed',
    wood: 2,
    room: 'chambre',
    terrain: BED,
  },
  table: {
    kind: 'table',
    labelFr: 'table',
    buildTask: 'buildTable',
    wood: 4,
    room: 'salle_a_manger',
    terrain: TABLE,
  },
  bench: {
    kind: 'bench',
    labelFr: 'banc',
    buildTask: 'buildBench',
    wood: 3,
    room: 'salle_a_manger',
    terrain: null,
  },
  stool: {
    kind: 'stool',
    labelFr: 'tabouret',
    buildTask: 'buildStool',
    wood: 1,
    room: 'hall',
    terrain: null,
  },
  shelf: {
    kind: 'shelf',
    labelFr: 'étagère',
    buildTask: 'buildShelf',
    wood: 2,
    room: 'reserve',
    terrain: null,
  },
  cupboard: {
    kind: 'cupboard',
    labelFr: 'armoire',
    buildTask: 'buildCupboard',
    wood: 5,
    room: 'reserve',
    terrain: null,
  },
  hearth: {
    kind: 'hearth',
    labelFr: 'âtre',
    buildTask: 'buildHearth',
    wood: 2,
    room: 'cuisine',
    terrain: HEARTH,
  },
  loom: {
    kind: 'loom',
    labelFr: 'métier à tisser',
    buildTask: 'buildLoom',
    wood: 5,
    room: 'atelier',
    terrain: null,
  },
  cradle: {
    kind: 'cradle',
    labelFr: 'berceau',
    buildTask: 'buildCradle',
    wood: 2,
    room: 'chambre',
    terrain: null,
  },
  tub: {
    kind: 'tub',
    labelFr: 'cuve',
    buildTask: 'buildWashingTub',
    wood: 3,
    room: 'latrines',
    terrain: null,
  },
  sconce: {
    kind: 'sconce',
    labelFr: 'applique',
    buildTask: 'buildWorkbench',
    wood: 1,
    room: 'hall',
    terrain: null,
  },
  chandelier: {
    kind: 'chandelier',
    labelFr: 'lustre',
    buildTask: 'buildWorkbench',
    wood: 4,
    room: 'hall',
    terrain: null,
  },
}

const PLACEABLE_NOW: FurnitureKind[] = ['workbench', 'chest', 'bed', 'table', 'hearth']
/** Soft props (no terrain tile) — planned after the core shell furniture. */
const PLACEABLE_SOFT: FurnitureKind[] = ['bench', 'stool', 'shelf', 'cupboard', 'cradle', 'loom', 'tub']

/** Instant cutaway props when a shell closes — AI can still craft workbench / extras later. */
export const STARTER_FURNITURE: FurnitureKind[] = ['bed', 'chest', 'table', 'hearth']

export function furnitureLabelFr(kind: FurnitureKind): string {
  return FURNITURE_DEFS[kind].labelFr
}

/**
 * Stamp bed + chest + table + hearth onto interior cells from the furniture queue.
 * Ensures RimWorld-style cutaway shows furniture immediately (no waiting on AI wood/labor).
 * Marks those jobs done; leaves workbench / soft kinds for villagers to build.
 */
export function stampStarterFurniture(
  grid: WorldGrid,
  queue: FurnitureJob[],
  onPlaced?: (job: FurnitureJob) => void,
  blocks?: ChunkStore | null,
): number {
  let stamped = 0
  for (const job of queue) {
    if (job.done) continue
    if (!STARTER_FURNITURE.includes(job.kind)) continue
    const terrain = FURNITURE_DEFS[job.kind].terrain
    if (terrain == null) continue
    if (!inBounds(grid, job.x, job.y)) continue
    const cur = getTerrain(grid, job.x, job.y)
    if (cur === HOUSE || cur === WALL_WOOD || cur === WALL_STONE) continue
    if (cur !== terrain) {
      setTerrain(grid, job.x, job.y, terrain)
      if (blocks) mirrorTerrainToBlocks(blocks, job.x, job.y, terrain, 0)
      stamped++
    }
    job.done = true
    onPlaced?.(job)
  }
  return stamped
}

export function woodCostOf(kind: FurnitureKind): number {
  return FURNITURE_DEFS[kind].wood
}

function preferredRoom(kind: FurnitureKind, layout: HouseLayout, opts: { wantWorkshop: boolean; wantStore: boolean }): RoomKind {
  const def = FURNITURE_DEFS[kind]
  if (layout.rooms.some((r) => r.kind === def.room)) return def.room
  if (kind === 'workbench' && opts.wantWorkshop && layout.rooms.some((r) => r.kind === 'atelier')) return 'atelier'
  if (kind === 'chest' && opts.wantStore && layout.rooms.some((r) => r.kind === 'reserve')) return 'reserve'
  if (kind === 'bed' && layout.rooms.some((r) => r.kind === 'chambre')) return 'chambre'
  if (kind === 'table') {
    if (layout.rooms.some((r) => r.kind === 'salle_a_manger')) return 'salle_a_manger'
    if (layout.rooms.some((r) => r.kind === 'cuisine')) return 'cuisine'
  }
  return layout.rooms[0]?.kind ?? def.room
}

/**
 * Plan furniture jobs into rooms — primary API for AI / household builders.
 * Placement is craft-only (no stamp): beds/chests/hearth against walls, table centered.
 */
export function planFurnitureJobs(
  layout: HouseLayout,
  opts: { beds: number; wantWorkshop: boolean; wantStore: boolean; household: number },
): FurnitureJob[] {
  const used = new Set<string>()
  const jobs: FurnitureJob[] = []

  const push = (kind: FurnitureKind, prefer: 'first' | 'last' | 'center' | 'edge' = 'edge') => {
    const allowed = PLACEABLE_NOW.includes(kind) || PLACEABLE_SOFT.includes(kind) || kind === 'table'
    if (!allowed) return
    const roomKind = preferredRoom(kind, layout, opts)
    const cell = pickCellInRoom(layout, roomKind, used, prefer)
    if (!cell) return
    jobs.push({ kind, roomKind, x: cell.x, y: cell.y, done: false })
  }

  // Bed against wall in chambre; hearth against wall in cuisine; table centered for walk space.
  push('bed', 'edge')
  push('hearth', 'edge')
  push('table', 'center')
  push('chest', 'edge')

  if (opts.wantWorkshop || layout.rooms.some((r) => r.kind === 'atelier')) {
    push('workbench', 'edge')
  }

  const bedCount = Math.max(1, Math.min(6, opts.beds))
  for (let i = 1; i < bedCount; i++) push('bed', 'edge')

  if (opts.wantStore || layout.rooms.some((r) => r.kind === 'reserve')) {
    push('chest', 'edge')
  }

  // Soft furnishings once the shell has rooms — craft-only, no terrain stamp.
  if (layout.rooms.some((r) => r.kind === 'salle_a_manger' || r.kind === 'hall')) {
    push('bench', 'edge')
    push('stool', 'edge')
  }
  if (opts.wantStore || layout.rooms.some((r) => r.kind === 'reserve' || r.kind === 'cuisine')) {
    push('shelf', 'edge')
  }
  if (opts.wantStore || opts.household >= 3) {
    push('cupboard', 'edge')
  }
  if (opts.beds >= 2 || opts.household >= 2) {
    push('cradle', 'edge')
  }
  if (opts.wantWorkshop || layout.rooms.some((r) => r.kind === 'atelier')) {
    push('loom', 'edge')
  }
  if (layout.rooms.some((r) => r.kind === 'latrines' || r.kind === 'cuisine')) {
    push('tub', 'edge')
  }

  return jobs
}

export function nextFurnitureJob(queue: FurnitureJob[]): FurnitureJob | null {
  return queue.find((j) => !j.done) ?? null
}

export function markFurnitureDone(queue: FurnitureJob[], x: number, y: number): FurnitureJob | null {
  const job = queue.find((j) => !j.done && j.x === x && j.y === y)
  if (job) {
    job.done = true
    return job
  }
  const any = queue.find((j) => !j.done)
  if (any) {
    any.done = true
    return any
  }
  return null
}

function spotFromQueue(
  queue: FurnitureJob[],
  layout: HouseLayout | null,
  kind: FurnitureKind,
  fallbackRoom: RoomKind,
): { x: number; y: number } | null {
  const job = queue.find((j) => j.kind === kind)
  if (job) return { x: job.x, y: job.y }
  if (!layout) return null
  const used = new Set<string>()
  const cell = pickCellInRoom(layout, fallbackRoom, used, 'center')
  return cell
}

export function sleepSpot(queue: FurnitureJob[], layout: HouseLayout | null): { x: number; y: number } | null {
  return spotFromQueue(queue, layout, 'bed', 'chambre')
}

export function hearthSpot(queue: FurnitureJob[], layout: HouseLayout | null): { x: number; y: number } | null {
  return spotFromQueue(queue, layout, 'hearth', 'cuisine')
}

export function eatSpot(queue: FurnitureJob[], layout: HouseLayout | null): { x: number; y: number } | null {
  return spotFromQueue(queue, layout, 'table', 'salle_a_manger')
}

export function craftSpot(queue: FurnitureJob[], layout: HouseLayout | null): { x: number; y: number } | null {
  return spotFromQueue(queue, layout, 'workbench', 'atelier')
}

export function storeSpot(queue: FurnitureJob[], layout: HouseLayout | null): { x: number; y: number } | null {
  return spotFromQueue(queue, layout, 'chest', 'reserve')
}

/** Catalog entry for external AI room builders. */
export type PlaceableFurnitureType = {
  kind: FurnitureKind
  labelFr: string
  room: RoomKind
  buildTask: TaskKind
  wood: number
  allowedIn: RoomFurnitureKind[]
}

export function placeableFurnitureTypes(): PlaceableFurnitureType[] {
  return (Object.keys(FURNITURE_DEFS) as FurnitureKind[]).map((kind) => {
    const d = FURNITURE_DEFS[kind]
    return {
      kind,
      labelFr: d.labelFr,
      room: d.room,
      buildTask: d.buildTask,
      wood: d.wood,
      allowedIn: ROOM_FURNITURE[d.room],
    }
  })
}
