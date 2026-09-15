/**
 * Craftable medieval furniture with utility hooks.
 * Stubs + catalog — parallel agents can flesh recipes / art.
 * Placement targets rooms from rooms.ts.
 */

import type { Cell } from './architecture'
import type { ResourceType } from './inventory'
import {
  findRoom,
  pickRoomCell,
  type HouseLayout,
  type RoomKind,
  type RoomNeed,
} from './rooms'
import { BED, CHEST, WORKBENCH, type TerrainCode } from './types'

/** Dining / social surface — new terrain code (28). */
export const TABLE = 28 as TerrainCode

export type FurnitureKind =
  | 'bed'
  | 'table'
  | 'bench'
  | 'chest'
  | 'cupboard'
  | 'workbench'
  | 'stool'
  | 'shelf'
  | 'cradle'
  | 'loom'
  | 'hearth'
  | 'tub'

export type FurnitureUtility = RoomNeed | 'warmth' | 'childcare' | 'textile'

export interface FurnitureDef {
  kind: FurnitureKind
  labelFr: string
  /** Preferred rooms (first match wins for auto-placement). */
  rooms: RoomKind[]
  utility: FurnitureUtility[]
  /** Wood cost (minimal stub — parallel agent may expand recipes). */
  woodCost: number
  extras?: Partial<Record<ResourceType, number>>
  terrain: TerrainCode
  /** Maps to existing build* task when possible. */
  buildTask: 'buildBed' | 'buildChest' | 'buildWorkbench' | 'buildTable'
}

export interface FurnitureJob {
  kind: FurnitureKind
  x: number
  y: number
  roomKind: RoomKind
  done: boolean
}

export const FURNITURE_DEFS: Record<FurnitureKind, FurnitureDef> = {
  bed: {
    kind: 'bed',
    labelFr: 'lit',
    rooms: ['chambre'],
    utility: ['sleep'],
    woodCost: 3,
    extras: { cloth: 0 },
    terrain: BED,
    buildTask: 'buildBed',
  },
  table: {
    kind: 'table',
    labelFr: 'table',
    rooms: ['salle_a_manger', 'cuisine', 'hall'],
    utility: ['eat', 'social'],
    woodCost: 4,
    terrain: TABLE,
    buildTask: 'buildTable',
  },
  bench: {
    kind: 'bench',
    labelFr: 'banc',
    rooms: ['salle_a_manger', 'hall'],
    utility: ['social', 'eat'],
    woodCost: 2,
    terrain: TABLE,
    buildTask: 'buildTable',
  },
  chest: {
    kind: 'chest',
    labelFr: 'coffre',
    rooms: ['reserve', 'chambre', 'hall'],
    utility: ['store'],
    woodCost: 5,
    terrain: CHEST,
    buildTask: 'buildChest',
  },
  cupboard: {
    kind: 'cupboard',
    labelFr: 'armoire',
    rooms: ['reserve', 'cuisine'],
    utility: ['store'],
    woodCost: 6,
    terrain: CHEST,
    buildTask: 'buildChest',
  },
  workbench: {
    kind: 'workbench',
    labelFr: 'établi',
    rooms: ['atelier', 'hall'],
    utility: ['craft'],
    woodCost: 4,
    terrain: WORKBENCH,
    buildTask: 'buildWorkbench',
  },
  stool: {
    kind: 'stool',
    labelFr: 'tabouret',
    rooms: ['atelier', 'cuisine', 'salle_a_manger'],
    utility: ['craft', 'social'],
    woodCost: 1,
    terrain: TABLE,
    buildTask: 'buildTable',
  },
  shelf: {
    kind: 'shelf',
    labelFr: 'étagère',
    rooms: ['reserve', 'atelier', 'cuisine'],
    utility: ['store'],
    woodCost: 3,
    terrain: CHEST,
    buildTask: 'buildChest',
  },
  cradle: {
    kind: 'cradle',
    labelFr: 'berceau',
    rooms: ['chambre'],
    utility: ['childcare', 'sleep'],
    woodCost: 2,
    terrain: BED,
    buildTask: 'buildBed',
  },
  loom: {
    kind: 'loom',
    labelFr: 'métier à tisser',
    rooms: ['atelier'],
    utility: ['textile', 'craft'],
    woodCost: 5,
    extras: { wool: 1 },
    terrain: WORKBENCH,
    buildTask: 'buildWorkbench',
  },
  hearth: {
    kind: 'hearth',
    labelFr: 'âtre',
    rooms: ['cuisine', 'hall', 'salle_a_manger'],
    utility: ['warmth', 'cook'],
    woodCost: 2,
    extras: { stone: 2 },
    terrain: WORKBENCH,
    buildTask: 'buildWorkbench',
  },
  tub: {
    kind: 'tub',
    labelFr: 'cuvette',
    rooms: ['latrines', 'cuisine'],
    utility: ['hygiene'],
    woodCost: 3,
    terrain: CHEST,
    buildTask: 'buildChest',
  },
}

/** Core set every finished house should try to place (order = priority). */
export const CORE_FURNITURE_PLAN: { kind: FurnitureKind; room: RoomKind }[] = [
  { kind: 'bed', room: 'chambre' },
  { kind: 'table', room: 'salle_a_manger' },
  { kind: 'chest', room: 'reserve' },
  { kind: 'workbench', room: 'atelier' },
  { kind: 'cupboard', room: 'cuisine' },
  { kind: 'hearth', room: 'cuisine' },
]

export function furnitureLabelFr(kind: FurnitureKind): string {
  return FURNITURE_DEFS[kind].labelFr
}

export function woodCostOf(kind: FurnitureKind): number {
  return FURNITURE_DEFS[kind].woodCost
}

/**
 * Build a placement queue for a house layout.
 * Skips rooms that are missing; places into best available room.
 */
export function planFurnitureJobs(
  layout: HouseLayout,
  opts: { beds: number; wantWorkshop: boolean; wantStore: boolean; household: number },
): FurnitureJob[] {
  const jobs: FurnitureJob[] = []
  const occupied = new Set<string>()

  const tryPlace = (kind: FurnitureKind, preferred: RoomKind): boolean => {
    const def = FURNITURE_DEFS[kind]
    let room = findRoom(layout, preferred)
    if (!room) {
      for (const rk of def.rooms) {
        room = findRoom(layout, rk)
        if (room) break
      }
    }
    // Fallback: any room
    if (!room && layout.rooms.length > 0) room = layout.rooms[0]
    if (!room) return false
    const cell = pickRoomCell(room, occupied, kind === 'table' || kind === 'hearth' ? 'center' : 'edge')
    if (!cell) return false
    occupied.add(`${cell.x},${cell.y}`)
    jobs.push({ kind, x: cell.x, y: cell.y, roomKind: room.kind, done: false })
    return true
  }

  // Beds — one per bed slot, prefer chambres
  const bedTarget = Math.max(1, opts.beds)
  let bedsPlaced = 0
  for (const room of layout.rooms.filter((r) => r.kind === 'chambre')) {
    while (bedsPlaced < bedTarget) {
      if (!tryPlace(bedsPlaced === 0 ? 'bed' : opts.household > 3 && bedsPlaced === 1 ? 'cradle' : 'bed', room.kind)) break
      bedsPlaced++
      if (bedsPlaced >= bedTarget) break
    }
  }
  while (bedsPlaced < bedTarget) {
    if (!tryPlace('bed', 'chambre')) break
    bedsPlaced++
  }

  if (findRoom(layout, 'salle_a_manger') || findRoom(layout, 'hall')) {
    tryPlace('table', 'salle_a_manger')
    if (opts.household >= 3) tryPlace('bench', 'salle_a_manger')
  }

  if (opts.wantStore || findRoom(layout, 'reserve')) {
    tryPlace('chest', 'reserve')
    if (opts.household >= 3 || findRoom(layout, 'cuisine')) tryPlace('cupboard', 'cuisine')
  }

  if (opts.wantWorkshop || findRoom(layout, 'atelier')) {
    tryPlace('workbench', 'atelier')
  }

  if (findRoom(layout, 'cuisine')) {
    tryPlace('hearth', 'cuisine')
  }

  if (findRoom(layout, 'latrines')) {
    tryPlace('tub', 'latrines')
  }

  return jobs
}

export function nextFurnitureJob(queue: FurnitureJob[] | null | undefined): FurnitureJob | null {
  if (!queue) return null
  return queue.find((j) => !j.done) ?? null
}

export function markFurnitureDone(queue: FurnitureJob[], x: number, y: number, kind?: FurnitureKind) {
  for (const j of queue) {
    if (j.done) continue
    if (j.x === x && j.y === y && (!kind || j.kind === kind)) {
      j.done = true
      return j
    }
  }
  return null
}

export function furnitureCell(queue: FurnitureJob[] | null | undefined, kind: FurnitureKind): Cell | null {
  if (!queue) return null
  const j = queue.find((q) => q.kind === kind && q.done)
  if (j) return { x: j.x, y: j.y }
  return null
}

/** Sleep target: completed bed job, else any bed job cell, else null. */
export function sleepSpot(queue: FurnitureJob[] | null | undefined, layout: HouseLayout | null | undefined): Cell | null {
  const done = furnitureCell(queue, 'bed')
  if (done) return done
  const room = findRoom(layout ?? null, 'chambre')
  if (room) return { x: room.cx, y: room.cy }
  return null
}

export function eatSpot(queue: FurnitureJob[] | null | undefined, layout: HouseLayout | null | undefined): Cell | null {
  const done = furnitureCell(queue, 'table') ?? furnitureCell(queue, 'bench')
  if (done) return done
  const room = findRoom(layout ?? null, 'salle_a_manger')
  if (room) return { x: room.cx, y: room.cy }
  return null
}

export function storeSpot(queue: FurnitureJob[] | null | undefined, layout: HouseLayout | null | undefined): Cell | null {
  const done = furnitureCell(queue, 'chest') ?? furnitureCell(queue, 'cupboard')
  if (done) return done
  const room = findRoom(layout ?? null, 'reserve')
  if (room) return { x: room.cx, y: room.cy }
  return null
}

export function craftSpot(queue: FurnitureJob[] | null | undefined, layout: HouseLayout | null | undefined): Cell | null {
  const done = furnitureCell(queue, 'workbench') ?? furnitureCell(queue, 'loom')
  if (done) return done
  const room = findRoom(layout ?? null, 'atelier')
  if (room) return { x: room.cx, y: room.cy }
  return null
}
