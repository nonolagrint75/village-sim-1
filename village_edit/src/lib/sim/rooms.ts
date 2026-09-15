/**
 * Multi-room house layouts — medieval room kinds tied to needs & furniture slots.
 * Soft generative zones inside footprints; furniture agents place into RoomKind.
 */

import type { Cell, HouseDesign, HouseFootprint } from './architecture'
import type { NeedPressures } from './cognition/types'

/** Medieval room roles (stable keys; UI uses French labels). */
export type RoomKind =
  | 'chambre'
  | 'salle_a_manger'
  | 'cuisine'
  | 'reserve'
  | 'atelier'
  | 'hall'
  | 'latrines'

export const ROOM_KINDS: RoomKind[] = [
  'hall',
  'chambre',
  'salle_a_manger',
  'cuisine',
  'reserve',
  'atelier',
  'latrines',
]

/** @deprecated alias — prefer ROOM_LABEL_FR */
export const ROOM_LABELS_FR = {
  chambre: 'chambre',
  salle_a_manger: 'salle à manger',
  cuisine: 'cuisine',
  reserve: 'réserve',
  atelier: 'atelier',
  hall: "hall d'entrée",
  latrines: 'latrines',
} as const satisfies Record<RoomKind, string>

export const ROOM_LABEL_FR: Record<RoomKind, string> = { ...ROOM_LABELS_FR }

/** Furniture kinds a craft / AI builder may place into a room. */
export type RoomFurnitureKind =
  | 'bed'
  | 'workbench'
  | 'chest'
  | 'table'
  | 'hearth'
  | 'shelf'
  | 'bench'
  | 'cupboard'
  | 'loom'
  | 'cradle'
  | 'stool'
  | 'tub'

/** Preferred furniture per room — contract for furniture agents. */
export const ROOM_FURNITURE: Record<RoomKind, RoomFurnitureKind[]> = {
  chambre: ['bed', 'cradle', 'stool'],
  salle_a_manger: ['table', 'bench', 'stool'],
  cuisine: ['hearth', 'shelf', 'tub'],
  reserve: ['chest', 'cupboard', 'shelf'],
  atelier: ['workbench', 'loom', 'shelf'],
  hall: ['bench', 'stool'],
  latrines: ['tub'],
}

/**
 * Need ↔ room mapping.
 * Being in the room softens `primary` / `secondary` pressures; `enables` documents tasks.
 */
export type RoomNeedLink = {
  primary: keyof NeedPressures
  secondary: (keyof NeedPressures)[]
  relief: number
  enables: string[]
}

export const ROOM_NEED_MAP: Record<RoomKind, RoomNeedLink> = {
  chambre: {
    primary: 'fatigue',
    secondary: ['shelter'],
    relief: 0.18,
    enables: ['rest', 'sleep'],
  },
  salle_a_manger: {
    primary: 'hunger',
    secondary: ['social', 'belonging'],
    relief: 0.12,
    enables: ['eat', 'socialise'],
  },
  cuisine: {
    primary: 'hunger',
    secondary: ['purpose'],
    relief: 0.1,
    enables: ['bakeBread', 'cook'],
  },
  reserve: {
    primary: 'purpose',
    secondary: ['status'],
    relief: 0.08,
    enables: ['storeChest', 'takeFromChest'],
  },
  atelier: {
    primary: 'creative',
    secondary: ['purpose'],
    relief: 0.14,
    enables: ['craft', 'experiment', 'buildWorkbench'],
  },
  hall: {
    primary: 'shelter',
    secondary: ['belonging', 'social'],
    relief: 0.1,
    enables: ['enter', 'receive'],
  },
  latrines: {
    primary: 'safety',
    secondary: ['shelter'],
    relief: 0.06,
    enables: ['privacy'],
  },
}

const ROOM_AREA_WEIGHT: Record<RoomKind, number> = {
  hall: 0.12,
  chambre: 0.28,
  salle_a_manger: 0.18,
  cuisine: 0.14,
  reserve: 0.12,
  atelier: 0.16,
  latrines: 0.06,
}

export interface RoomZone {
  id: string
  kind: RoomKind
  cells: Cell[]
  doorCells: Cell[]
  centroid: Cell
}

export interface HouseLayout {
  rooms: RoomZone[]
  partitions: Cell[]
}

export interface RoomLayoutResult {
  rooms: RoomZone[]
  partitions: Cell[]
  /** Interior cells remaining after partitions become walls. */
  interior: Cell[]
}

function cellKey(c: Cell): string {
  return `${c.x},${c.y}`
}

function centroidOf(cells: Cell[]): Cell {
  if (cells.length === 0) return { x: 0, y: 0 }
  let sx = 0
  let sy = 0
  for (const c of cells) {
    sx += c.x
    sy += c.y
  }
  return { x: Math.round(sx / cells.length), y: Math.round(sy / cells.length) }
}

function makeZone(id: string, kind: RoomKind, cells: Cell[], doorCells: Cell[] = []): RoomZone {
  return { id, kind, cells, doorCells, centroid: centroidOf(cells) }
}

export function planRoomKinds(opts: {
  household: number
  wealth: number
  artisan: boolean
  merchant: boolean
  ambition?: number
}): RoomKind[] {
  const hh = Math.max(1, opts.household)
  const wealth = opts.wealth
  const ambition = opts.ambition ?? 0.4
  const rooms: RoomKind[] = ['hall', 'chambre']

  if (hh >= 2 || wealth > 4) rooms.push('salle_a_manger')
  if (hh >= 2 || wealth > 8 || ambition > 0.55) rooms.push('cuisine')
  if (opts.merchant || wealth > 15) rooms.push('reserve')
  if (opts.artisan || ambition > 0.7) rooms.push('atelier')
  if (hh >= 4) rooms.push('chambre')
  if (hh >= 3 && wealth > 10) rooms.push('latrines')

  // Tiny households keep a compact plan.
  if (hh <= 1 && wealth < 6 && !opts.artisan && !opts.merchant) {
    return ['hall', 'chambre']
  }
  return rooms
}

/**
 * Grow span so N rooms fit (~3+ interior cells each).
 * Returns at least the current rx/ry.
 */
export function roomCountToSpan(roomCount: number, rx: number, ry: number): { rx: number; ry: number } {
  const need = Math.max(1, roomCount)
  const minInterior = need * 3
  let outRx = rx
  let outRy = ry
  const area = () => Math.max(1, (2 * outRx - 1) * (2 * outRy - 1) - 4)
  while (area() < minInterior && (outRx < 9 || outRy < 6)) {
    if (outRx <= outRy && outRx < 9) outRx++
    else if (outRy < 6) outRy++
    else if (outRx < 9) outRx++
    else break
  }
  return { rx: outRx, ry: outRy }
}

/**
 * Expand an existing plan when family / wealth grow.
 * Returns null when nothing to add.
 */
export function expandRoomKinds(
  current: RoomKind[],
  opts: { household: number; wealth: number; artisan: boolean },
): RoomKind[] | null {
  const desired = planRoomKinds({
    household: opts.household,
    wealth: opts.wealth,
    artisan: opts.artisan,
    merchant: current.includes('reserve') || opts.wealth > 18,
    ambition: opts.artisan ? 0.75 : 0.45,
  })
  const have = new Set(current)
  const added: RoomKind[] = []
  for (const k of desired) {
    if (k === 'chambre') {
      const curBeds = current.filter((x) => x === 'chambre').length
      const wantBeds = desired.filter((x) => x === 'chambre').length
      if (wantBeds > curBeds) added.push('chambre')
      continue
    }
    if (!have.has(k)) added.push(k)
  }
  if (added.length === 0) return null
  return [...current, ...added]
}

export function describeRoomsFr(kinds: RoomKind[]): string {
  const unique: RoomKind[] = []
  for (const k of kinds) {
    if (!unique.includes(k)) unique.push(k)
  }
  if (unique.length === 0) return ''
  const labels = unique.map((k) => ROOM_LABEL_FR[k])
  if (labels.length === 1) return labels[0]
  if (labels.length === 2) return `${labels[0]} et ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')} et ${labels[labels.length - 1]}`
}

export function describeLayoutFr(layout: HouseLayout): string {
  return describeRoomsFr(layout.rooms.map((r) => r.kind))
}

export function roomKindsSatisfying(need: keyof NeedPressures): RoomKind[] {
  return ROOM_KINDS.filter((k) => {
    const link = ROOM_NEED_MAP[k]
    return link.primary === need || link.secondary.includes(need)
  })
}

export function findRoomByKind(layout: HouseLayout | null | undefined, kind: RoomKind): RoomZone | null {
  if (!layout) return null
  return layout.rooms.find((r) => r.kind === kind) ?? null
}

export function findRoomAt(layout: HouseLayout | null | undefined, x: number, y: number): RoomZone | null {
  if (!layout) return null
  for (const r of layout.rooms) {
    for (const c of r.cells) {
      if (c.x === x && c.y === y) return r
    }
  }
  return null
}

export function roomCentroid(layout: HouseLayout | null | undefined, kind: RoomKind): Cell | null {
  const room = findRoomByKind(layout, kind)
  return room ? room.centroid : null
}

/** Soft need relief when standing in a room. */
export function applyRoomNeedRelief(needs: NeedPressures, room: RoomZone | null): void {
  if (!room) return
  const link = ROOM_NEED_MAP[room.kind]
  needs[link.primary] = Math.max(0, Math.min(1, needs[link.primary] - link.relief))
  for (const sec of link.secondary) {
    needs[sec] = Math.max(0, Math.min(1, needs[sec] - link.relief * 0.45))
  }
}

/**
 * Carve rooms + interior partition walls from free interior cells.
 * Used by architecture.houseFootprint for generative multi-room shells.
 */
export function layoutRoomsFromInterior(
  interior: Cell[],
  kinds: RoomKind[],
  door: Cell,
): RoomLayoutResult {
  if (interior.length === 0) {
    return { rooms: [], partitions: [], interior: [] }
  }

  const types = kinds.length > 0 ? [...kinds] : (['chambre'] as RoomKind[])
  if (types.length === 1 || interior.length < 4) {
    const k = types[0] ?? 'chambre'
    return {
      rooms: [makeZone(`${k}-0`, k, [...interior], [door])],
      partitions: [],
      interior: [...interior],
    }
  }

  return partitionInterior(interior, door, types)
}

/** Build persistent layout from design + footprint (after walls planned). */
export function buildHouseLayout(design: HouseDesign, fp: HouseFootprint): HouseLayout {
  const kinds =
    design.roomKinds?.length > 0
      ? design.roomKinds
      : planRoomKinds({
          household: Math.max(1, design.bedSlots),
          wealth: design.hasStoreroom ? 20 : 5,
          artisan: design.hasWorkshop,
          merchant: design.hasStoreroom,
        })

  const result = layoutRoomsFromInterior(fp.interior, kinds, fp.door)
  // Prefer partitions already baked into footprint walls when regenerating.
  return {
    rooms: result.rooms,
    partitions: result.partitions,
  }
}

function partitionInterior(interior: Cell[], exteriorDoor: Cell, types: RoomKind[]): RoomLayoutResult {
  const sorted = [...interior].sort((a, b) => a.y - b.y || a.x - b.x)
  let minX = sorted[0].x
  let maxX = sorted[0].x
  let minY = sorted[0].y
  let maxY = sorted[0].y
  for (const c of sorted) {
    minX = Math.min(minX, c.x)
    maxX = Math.max(maxX, c.x)
    minY = Math.min(minY, c.y)
    maxY = Math.max(maxY, c.y)
  }
  const splitVertical = maxX - minX >= maxY - minY

  const remaining = new Set(sorted.map(cellKey))
  const byKey = new Map(sorted.map((c) => [cellKey(c), c]))

  const orderedTypes: RoomKind[] =
    types.includes('hall') ? ['hall', ...types.filter((t) => t !== 'hall')] : [...types]

  const hallCells: Cell[] = []
  if (orderedTypes[0] === 'hall') {
    const hallWant = Math.max(2, Math.round(sorted.length * ROOM_AREA_WEIGHT.hall))
    const scored = sorted
      .map((c) => ({ c, d: Math.abs(c.x - exteriorDoor.x) + Math.abs(c.y - exteriorDoor.y) }))
      .sort((a, b) => a.d - b.d || a.c.y - b.c.y || a.c.x - b.c.x)
    for (const { c } of scored) {
      if (hallCells.length >= hallWant) break
      hallCells.push(c)
      remaining.delete(cellKey(c))
    }
  }

  const otherTypes = orderedTypes[0] === 'hall' ? orderedTypes.slice(1) : orderedTypes
  const leftover = [...remaining].map((k) => byKey.get(k)!).filter(Boolean)
  const bands = stripCells(leftover, Math.max(1, otherTypes.length), splitVertical)

  const groups: { kind: RoomKind; cells: Cell[] }[] = []
  if (orderedTypes[0] === 'hall' && hallCells.length > 0) {
    groups.push({ kind: 'hall', cells: hallCells })
  }
  for (let i = 0; i < otherTypes.length; i++) {
    const cells = bands[i] ?? []
    if (cells.length === 0) continue
    groups.push({ kind: otherTypes[i], cells })
  }

  if (groups.length === 0) {
    return {
      rooms: [makeZone('chambre-0', 'chambre', sorted, [exteriorDoor])],
      partitions: [],
      interior: sorted,
    }
  }

  return carvePartitions(groups, exteriorDoor, splitVertical)
}

function stripCells(cells: Cell[], n: number, vertical: boolean): Cell[][] {
  if (n <= 0) return []
  if (cells.length === 0) return Array.from({ length: n }, () => [])
  const sorted = [...cells].sort((a, b) => (vertical ? a.x - b.x || a.y - b.y : a.y - b.y || a.x - b.x))
  const bands: Cell[][] = Array.from({ length: n }, () => [])
  for (let i = 0; i < sorted.length; i++) {
    const band = Math.min(n - 1, Math.floor((i * n) / sorted.length))
    bands[band].push(sorted[i])
  }
  return bands
}

function carvePartitions(
  groups: { kind: RoomKind; cells: Cell[] }[],
  exteriorDoor: Cell,
  splitVertical: boolean,
): RoomLayoutResult {
  if (groups.length <= 1) {
    const g = groups[0]
    return {
      rooms: [makeZone(`${g.kind}-0`, g.kind, g.cells, [exteriorDoor])],
      partitions: [],
      interior: g.cells,
    }
  }

  const partitions: Cell[] = []
  const doorGaps = new Set<string>()
  const removed = new Set<string>()

  for (let i = 0; i < groups.length - 1; i++) {
    const a = groups[i].cells
    const b = groups[i + 1].cells
    if (a.length === 0 || b.length === 0) continue

    const boundary = splitVertical
      ? uniqueCells(a.filter((c) => c.x === Math.max(...a.map((x) => x.x))))
      : uniqueCells(a.filter((c) => c.y === Math.max(...a.map((x) => x.y))))

    if (boundary.length === 0) continue
    const mid = boundary[Math.floor(boundary.length / 2)]
    doorGaps.add(cellKey(mid))

    for (const c of boundary) {
      const k = cellKey(c)
      if (doorGaps.has(k)) continue
      const leftInA = a.length - countRemoved(a, removed)
      if (leftInA <= 1) continue
      partitions.push(c)
      removed.add(k)
    }
  }

  const rooms: RoomZone[] = []
  const keptInterior: Cell[] = []
  const counts: Partial<Record<RoomKind, number>> = {}

  for (const g of groups) {
    const cells = g.cells.filter((c) => !removed.has(cellKey(c)))
    if (cells.length === 0) continue
    const n = counts[g.kind] ?? 0
    counts[g.kind] = n + 1
    const doors: Cell[] = []
    for (const c of g.cells) {
      if (doorGaps.has(cellKey(c))) doors.push(c)
    }
    if (g.kind === 'hall') doors.push(exteriorDoor)
    rooms.push(makeZone(`${g.kind}-${n}`, g.kind, cells, doors))
    keptInterior.push(...cells)
  }

  for (const k of doorGaps) {
    const [xs, ys] = k.split(',').map(Number)
    if (!keptInterior.some((c) => c.x === xs && c.y === ys)) {
      keptInterior.push({ x: xs, y: ys })
      if (rooms.length > 0 && !rooms.some((r) => r.cells.some((c) => c.x === xs && c.y === ys))) {
        rooms[0].cells.push({ x: xs, y: ys })
        rooms[0].centroid = centroidOf(rooms[0].cells)
      }
    }
  }

  return { rooms, partitions, interior: keptInterior }
}

function uniqueCells(cells: Cell[]): Cell[] {
  const seen = new Set<string>()
  const out: Cell[] = []
  for (const c of cells) {
    const k = cellKey(c)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(c)
  }
  return out
}

function countRemoved(cells: Cell[], removed: Set<string>): number {
  let n = 0
  for (const c of cells) if (removed.has(cellKey(c))) n++
  return n
}

/** Pick a free cell inside a preferred room for furniture agents. */
export function pickCellInRoom(
  layout: HouseLayout,
  kind: RoomKind,
  used: Set<string>,
  prefer: 'first' | 'last' | 'center' = 'first',
): Cell | null {
  const room = findRoomByKind(layout, kind)
  const pool = room?.cells ?? layout.rooms[0]?.cells ?? []
  const free = [...pool].filter((c) => !used.has(cellKey(c))).sort((a, b) => a.y - b.y || a.x - b.x)
  if (free.length === 0) return null
  let pick: Cell
  if (prefer === 'last') pick = free[free.length - 1]
  else if (prefer === 'center') pick = free[Math.floor(free.length / 2)]
  else pick = free[0]
  used.add(cellKey(pick))
  return pick
}
