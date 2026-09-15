/**
 * Furniture craft + placement into house rooms.
 * Jobs target RoomKind zones from rooms.ts (API for AI / multi-room builders).
 */

import type { HouseLayout, RoomKind } from './rooms'
import { pickCellInRoom, ROOM_FURNITURE, type RoomFurnitureKind } from './rooms'
import { BED, BENCH, CHEST, HEARTH, TABLE, WORKBENCH, type TaskKind } from './types'

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
    labelFr: 'etabli',
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
    wood: 3,
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
    terrain: BENCH,
  },
  stool: {
    kind: 'stool',
    labelFr: 'tabouret',
    buildTask: 'buildTable',
    wood: 1,
    room: 'hall',
    terrain: null,
  },
  shelf: {
    kind: 'shelf',
    labelFr: 'etagere',
    buildTask: 'buildChest',
    wood: 2,
    room: 'reserve',
    terrain: null,
  },
  cupboard: {
    kind: 'cupboard',
    labelFr: 'armoire',
    buildTask: 'buildChest',
    wood: 5,
    room: 'reserve',
    terrain: null,
  },
  hearth: {
    kind: 'hearth',
    labelFr: 'atre',
    buildTask: 'buildHearth',
    wood: 2,
    room: 'cuisine',
    terrain: HEARTH,
  },
  loom: {
    kind: 'loom',
    labelFr: 'metier a tisser',
    buildTask: 'buildWorkbench',
    wood: 5,
    room: 'atelier',
    terrain: null,
  },
  cradle: {
    kind: 'cradle',
    labelFr: 'berceau',
    buildTask: 'buildBed',
    wood: 2,
    room: 'chambre',
    terrain: null,
  },
  tub: {
    kind: 'tub',
    labelFr: 'cuve',
    buildTask: 'buildChest',
    wood: 3,
    room: 'latrines',
    terrain: null,
  },
}

/** Terrain-backed pieces households can actually stamp this tick. */
const PLACEABLE_NOW: FurnitureKind[] = ['workbench', 'chest', 'bed', 'table', 'hearth', 'bench']

export function furnitureLabelFr(kind: FurnitureKind): string {
  return FURNITURE_DEFS[kind].labelFr
}

export function woodCostOf(kind: FurnitureKind): number {
  return FURNITURE_DEFS[kind].wood
}

function preferredRoom(
  kind: FurnitureKind,
  layout: HouseLayout,
  opts: { wantWorkshop: boolean; wantStore: boolean },
): RoomKind {
  const def = FURNITURE_DEFS[kind]
  if (layout.rooms.some((r) => r.kind === def.room)) return def.room
  if (kind === 'workbench' && opts.wantWorkshop && layout.rooms.some((r) => r.kind === 'atelier')) return 'atelier'
  if (kind === 'chest' && opts.wantStore && layout.rooms.some((r) => r.kind === 'reserve')) return 'reserve'
  if (kind === 'bed' && layout.rooms.some((r) => r.kind === 'chambre')) return 'chambre'
  if (kind === 'table' || kind === 'bench') {
    if (layout.rooms.some((r) => r.kind === 'salle_a_manger')) return 'salle_a_manger'
    if (layout.rooms.some((r) => r.kind === 'cuisine')) return 'cuisine'
    if (layout.rooms.some((r) => r.kind === 'hall')) return 'hall'
  }
  if (kind === 'hearth') {
    if (layout.rooms.some((r) => r.kind === 'cuisine')) return 'cuisine'
    if (layout.rooms.some((r) => r.kind === 'hall')) return 'hall'
  }
  return layout.rooms[0]?.kind ?? def.room
}

/**
 * Plan furniture jobs into rooms — primary API for AI / household builders.
 */
export function planFurnitureJobs(
  layout: HouseLayout,
  opts: { beds: number; wantWorkshop: boolean; wantStore: boolean; household: number },
): FurnitureJob[] {
  const used = new Set<string>()
  const jobs: FurnitureJob[] = []

  const push = (kind: FurnitureKind, prefer: 'first' | 'last' | 'center' = 'first') => {
    if (!PLACEABLE_NOW.includes(kind)) return
    const roomKind = preferredRoom(kind, layout, opts)
    const cell = pickCellInRoom(layout, roomKind, used, prefer)
    if (!cell) return
    jobs.push({ kind, roomKind, x: cell.x, y: cell.y, done: false })
  }

  push('workbench', 'first')
  push('chest', 'last')
  const bedCount = Math.max(1, Math.min(6, opts.beds))
  for (let i = 0; i < bedCount; i++) push('bed', 'center')
  push('hearth', 'first')
  if (layout.rooms.some((r) => r.kind === 'salle_a_manger' || r.kind === 'cuisine' || r.kind === 'hall') || opts.household >= 2) {
    push('table', 'center')
  }
  if (opts.household >= 2) push('bench', 'center')

  return jobs
}

export function furnitureAlreadyOwned(
  v: {
    hasWorkbench: boolean
    hasChest: boolean
    bedCount: number
    hasTable: boolean
    homeFurniture: FurniturePlacement[]
  },
  kind: FurnitureKind,
): boolean {
  if (kind === 'workbench') return v.hasWorkbench
  if (kind === 'chest') return v.hasChest
  if (kind === 'bed') return v.bedCount > 0
  if (kind === 'table') return v.hasTable
  return v.homeFurniture.some((p) => p.id === kind)
}

/** Mark queue jobs done when the household already owns that piece (pioneers / inheritance). */
export function syncFurnitureQueueWithOwned(
  queue: FurnitureJob[],
  v: {
    hasWorkbench: boolean
    hasChest: boolean
    bedCount: number
    hasTable: boolean
    homeFurniture: FurniturePlacement[]
  },
): void {
  let bedsMarked = 0
  for (const j of queue) {
    if (j.done) {
      if (j.kind === 'bed') bedsMarked++
      continue
    }
    if (j.kind === 'bed') {
      if (bedsMarked < v.bedCount) {
        j.done = true
        bedsMarked++
      }
      continue
    }
    if (furnitureAlreadyOwned(v, j.kind)) j.done = true
  }
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
    any.x = x
    any.y = y
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
  const done = queue.find((j) => j.kind === kind && j.done)
  if (done) return { x: done.x, y: done.y }
  const job = queue.find((j) => j.kind === kind)
  if (job) return { x: job.x, y: job.y }
  if (!layout) return null
  const used = new Set<string>()
  return pickCellInRoom(layout, fallbackRoom, used, 'center')
}

export function sleepSpot(queue: FurnitureJob[], layout: HouseLayout | null): { x: number; y: number } | null {
  return spotFromQueue(queue, layout, 'bed', 'chambre')
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

export function warmthSpot(queue: FurnitureJob[], layout: HouseLayout | null): { x: number; y: number } | null {
  return spotFromQueue(queue, layout, 'hearth', 'cuisine')
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
      allowedIn: ROOM_FURNITURE[d.room] ?? [],
    }
  })
}
