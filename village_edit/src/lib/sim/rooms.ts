/**
 * Multi-room house layout — zones with utility tied to needs.
 * Parallel furniture/AI agents place items into these rooms.
 */

import type { Cell, HouseDesign, HouseFootprint } from './architecture'

/** Medieval domestic room kinds (French keys for chronicle / UI). */
export type RoomKind =
  | 'chambre'
  | 'salle_a_manger'
  | 'cuisine'
  | 'reserve'
  | 'atelier'
  | 'hall'
  | 'latrines'

export type RoomNeed = 'sleep' | 'eat' | 'cook' | 'store' | 'craft' | 'social' | 'hygiene' | 'transit'

export interface RoomZone {
  id: number
  kind: RoomKind
  cells: Cell[]
  /** Soft centroid for pathing / furniture placement. */
  cx: number
  cy: number
}

export interface HouseLayout {
  rooms: RoomZone[]
  /** Interior partition wall cells (already stamped into footprint.walls when planned). */
  partitions: Cell[]
}

export const ROOM_LABEL_FR: Record<RoomKind, string> = {
  chambre: 'chambre',
  salle_a_manger: 'salle à manger',
  cuisine: 'cuisine',
  reserve: 'réserve',
  atelier: 'atelier',
  hall: "hall d'entrée",
  latrines: 'latrines',
}

export const ROOM_PRIMARY_NEED: Record<RoomKind, RoomNeed> = {
  chambre: 'sleep',
  salle_a_manger: 'eat',
  cuisine: 'cook',
  reserve: 'store',
  atelier: 'craft',
  hall: 'transit',
  latrines: 'hygiene',
}

export const NEED_TO_ROOM: Partial<Record<RoomNeed, RoomKind>> = {
  sleep: 'chambre',
  eat: 'salle_a_manger',
  cook: 'cuisine',
  store: 'reserve',
  craft: 'atelier',
  social: 'salle_a_manger',
  hygiene: 'latrines',
  transit: 'hall',
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v))
}

/**
 * Which rooms a household should plan, from wealth / family / métier.
 * Richer & larger households get more specialised spaces.
 */
export function planRoomKinds(opts: {
  household: number
  wealth: number
  artisan: boolean
  merchant: boolean
  ambition?: number
}): RoomKind[] {
  const rooms: RoomKind[] = ['hall', 'chambre']
  const wealth = opts.wealth
  const hh = opts.household

  if (hh >= 2 || wealth >= 2) rooms.push('salle_a_manger')
  if (hh >= 2 || wealth >= 3) rooms.push('cuisine')
  if (opts.merchant || wealth >= 8 || hh >= 3) rooms.push('reserve')
  if (opts.artisan || (opts.ambition ?? 0) > 0.55 || wealth >= 10) rooms.push('atelier')
  if (hh >= 4 || wealth >= 14) rooms.push('chambre') // second bedroom
  if (wealth >= 18 && hh >= 3) rooms.push('latrines')
  if (hh >= 5 || wealth >= 22) rooms.push('chambre') // third

  // Deduplicate consecutive kinds but keep multi-chambre
  return rooms
}

/** Desired exterior half-spans so the footprint can host `kinds.length` rooms. */
export function roomCountToSpan(kinds: number, baseRx: number, baseRy: number): { rx: number; ry: number } {
  const need = Math.max(2, Math.ceil(Math.sqrt(kinds * 4)))
  return {
    rx: clamp(Math.max(baseRx, need), 2, 8),
    ry: clamp(Math.max(baseRy, Math.max(2, need - 1)), 2, 7),
  }
}

function cellKey(c: Cell) {
  return `${c.x},${c.y}`
}

function centroid(cells: Cell[]): { cx: number; cy: number } {
  if (cells.length === 0) return { cx: 0, cy: 0 }
  let sx = 0
  let sy = 0
  for (const c of cells) {
    sx += c.x
    sy += c.y
  }
  return { cx: Math.round(sx / cells.length), cy: Math.round(sy / cells.length) }
}

/**
 * Partition interior cells into room zones along a grid of strips.
 * Returns rooms + partition wall cells that should be added to the footprint.
 */
export function layoutRoomsFromInterior(
  interior: Cell[],
  kinds: RoomKind[],
  door: Cell,
): HouseLayout {
  if (interior.length === 0 || kinds.length === 0) {
    return { rooms: [], partitions: [] }
  }

  const xs = interior.map((c) => c.x)
  const ys = interior.map((c) => c.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const w = maxX - minX + 1
  const h = maxY - minY + 1

  const n = Math.min(kinds.length, Math.max(1, interior.length))
  const useKinds = kinds.slice(0, n)

  // Prefer vertical strips when wider; horizontal when taller.
  const vertical = w >= h
  const strips = useKinds.length
  const partitions: Cell[] = []
  const interiorSet = new Set(interior.map(cellKey))
  const doorKey = cellKey(door)

  const bands: Cell[][] = Array.from({ length: strips }, () => [])

  if (vertical) {
    const bandW = w / strips
    for (const c of interior) {
      const bi = clamp(Math.floor((c.x - minX) / bandW), 0, strips - 1)
      bands[bi].push(c)
    }
    // Partition columns between bands (leave a doorway gap near door Y).
    for (let i = 1; i < strips; i++) {
      const px = minX + Math.round(i * bandW) - 1
      if (px <= minX || px >= maxX) continue
      for (let y = minY; y <= maxY; y++) {
        const key = `${px},${y}`
        if (!interiorSet.has(key)) continue
        if (y === door.y || Math.abs(y - door.y) <= 1) continue
        partitions.push({ x: px, y })
      }
    }
  } else {
    const bandH = h / strips
    for (const c of interior) {
      const bi = clamp(Math.floor((c.y - minY) / bandH), 0, strips - 1)
      bands[bi].push(c)
    }
    for (let i = 1; i < strips; i++) {
      const py = minY + Math.round(i * bandH) - 1
      if (py <= minY || py >= maxY) continue
      for (let x = minX; x <= maxX; x++) {
        const key = `${x},${py}`
        if (!interiorSet.has(key)) continue
        if (x === door.x || key === doorKey) continue
        partitions.push({ x, y: py })
      }
    }
  }

  const partSet = new Set(partitions.map(cellKey))
  const rooms: RoomZone[] = []
  for (let i = 0; i < useKinds.length; i++) {
    const cells = bands[i].filter((c) => !partSet.has(cellKey(c)))
    if (cells.length === 0) continue
    const { cx, cy } = centroid(cells)
    rooms.push({ id: i, kind: useKinds[i], cells, cx, cy })
  }

  // Ensure hall is near the door when present.
  const hall = rooms.find((r) => r.kind === 'hall')
  if (hall) {
    const doorRoom = rooms.find((r) => r.cells.some((c) => Math.abs(c.x - door.x) + Math.abs(c.y - door.y) <= 2))
    if (doorRoom && doorRoom !== hall) {
      const tmp = hall.kind
      hall.kind = doorRoom.kind
      doorRoom.kind = tmp
    }
  }

  return { rooms, partitions }
}

/** Build a full layout from a design + footprint interior. */
export function buildHouseLayout(design: HouseDesign, fp: HouseFootprint): HouseLayout {
  const kinds =
    design.roomKinds && design.roomKinds.length > 0
      ? design.roomKinds
      : planRoomKinds({
          household: design.bedSlots,
          wealth: design.hasStoreroom ? 12 : design.hasWorkshop ? 8 : 2,
          artisan: design.hasWorkshop,
          merchant: design.hasStoreroom,
        })
  return layoutRoomsFromInterior(fp.interior, kinds, fp.door)
}

export function findRoom(layout: HouseLayout | null | undefined, kind: RoomKind): RoomZone | null {
  if (!layout) return null
  return layout.rooms.find((r) => r.kind === kind) ?? null
}

export function roomForNeed(layout: HouseLayout | null | undefined, need: RoomNeed): RoomZone | null {
  const kind = NEED_TO_ROOM[need]
  if (!kind) return null
  return findRoom(layout, kind)
}

/** Pick a free-ish cell in a room (avoids occupied set). */
export function pickRoomCell(
  room: RoomZone,
  occupied: Set<string>,
  prefer: 'center' | 'edge' | 'any' = 'any',
): Cell | null {
  const sorted = [...room.cells].sort((a, b) => {
    const da = Math.hypot(a.x - room.cx, a.y - room.cy)
    const db = Math.hypot(b.x - room.cx, b.y - room.cy)
    if (prefer === 'center') return da - db
    if (prefer === 'edge') return db - da
    return a.y - b.y || a.x - b.x
  })
  for (const c of sorted) {
    if (!occupied.has(cellKey(c))) return c
  }
  return sorted[0] ?? null
}

/** Append a new chambre / atelier / réserve when household or wealth grows. */
export function expandRoomKinds(
  current: RoomKind[],
  opts: { household: number; wealth: number; artisan: boolean },
): RoomKind[] | null {
  const target = planRoomKinds({
    household: opts.household,
    wealth: opts.wealth,
    artisan: opts.artisan,
    merchant: opts.wealth >= 8,
  })
  if (target.length <= current.length) return null
  return target
}

export function describeLayoutFr(layout: HouseLayout): string {
  if (layout.rooms.length === 0) return 'pièce unique'
  return layout.rooms.map((r) => ROOM_LABEL_FR[r.kind]).join(', ')
}
