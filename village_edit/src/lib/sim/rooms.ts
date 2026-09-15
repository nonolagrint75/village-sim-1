/**
 * Multi-room house model — medieval room roles tied to needs & furniture.
 * Soft zones inside generative footprints; furniture agents place into room types.
 */

import type { NeedPressures } from './cognition/types'
import type { Cell, HouseDesign, HouseFootprint } from './architecture'

/** Medieval room roles (keys are stable; UI uses French labels). */
export type RoomType =
  | 'chambre'
  | 'salle_a_manger'
  | 'cuisine'
  | 'reserve'
  | 'atelier'
  | 'hall'
  | 'latrines'

export const ROOM_TYPES: RoomType[] = [
  'hall',
  'chambre',
  'salle_a_manger',
  'cuisine',
  'reserve',
  'atelier',
  'latrines',
]

export const ROOM_LABELS_FR: Record<RoomType, string> = {
  chambre: 'chambre',
  salle_a_manger: 'salle à manger',
  cuisine: 'cuisine',
  reserve: 'réserve',
  atelier: 'atelier',
  hall: "hall d'entrée",
  latrines: 'latrines',
}

/** Furniture kinds a furniture/AI agent may place into a room. */
export type FurnitureKind = 'bed' | 'workbench' | 'chest' | 'table' | 'hearth' | 'shelf' | 'bench'

export const FURNITURE_LABELS_FR: Record<FurnitureKind, string> = {
  bed: 'lit',
  workbench: 'établi',
  chest: 'coffre',
  table: 'table',
  hearth: 'âtre',
  shelf: 'étagère',
  bench: 'banc',
}

/** Preferred furniture per room — API contract for furniture craft agents. */
export const ROOM_FURNITURE: Record<RoomType, FurnitureKind[]> = {
  chambre: ['bed'],
  salle_a_manger: ['table', 'bench'],
  cuisine: ['hearth', 'shelf'],
  reserve: ['chest', 'shelf'],
  atelier: ['workbench', 'shelf'],
  hall: ['bench'],
  latrines: [],
}

/**
 * Need ↔ room mapping.
 * `relieves` softens need pressure when the villager stands in the room.
 * `enables` documents which gameplay loops the room unlocks / boosts.
 */
export type RoomNeedLink = {
  /** Primary need this room is for (UI / goals). */
  primary: keyof NeedPressures
  /** Secondary needs lightly relieved in-room. */
  secondary: (keyof NeedPressures)[]
  /** How much primary pressure drops when present in room (0–1). */
  relief: number
  /** Task loops the room enables or improves. */
  enables: string[]
}

export const ROOM_NEED_MAP: Record<RoomType, RoomNeedLink> = {
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

/** Target relative floor share when carving rooms (sums may exceed 1; normalized). */
const ROOM_AREA_WEIGHT: Record<RoomType, number> = {
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
  type: RoomType
  cells: Cell[]
  /** Openings toward adjacent rooms or the exterior door. */
  doorCells: Cell[]
  centroid: Cell
}

export interface FurnitureSlotSpec {
  kind: FurnitureKind
  roomType: RoomType
  roomId: string
  cell: Cell
  /** Lower = place earlier (beds / workbench / chest first). */
  priority: number
}

const FURNITURE_PRIORITY: Record<FurnitureKind, number> = {
  workbench: 1,
  chest: 2,
  bed: 3,
  hearth: 4,
  table: 5,
  shelf: 6,
  bench: 7,
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
  const n = cells.length
  return { x: Math.round(sx / n), y: Math.round(sy / n) }
}

function makeZone(id: string, type: RoomType, cells: Cell[], doorCells: Cell[] = []): RoomZone {
  return { id, type, cells, doorCells, centroid: centroidOf(cells) }
}

/**
 * Decide which room types a house should contain from brief/size flags.
 */
export function planRoomTypes(opts: {
  household: number
  floorArea: number
  hasWorkshop: boolean
  hasStoreroom: boolean
  artisan?: boolean
  merchant?: boolean
}): RoomType[] {
  const { household, floorArea, hasWorkshop, hasStoreroom } = opts
  if (floorArea < 6) return ['chambre']

  const rooms: RoomType[] = ['hall', 'chambre']

  if (floorArea >= 12 || household >= 2) rooms.push('salle_a_manger')
  if (floorArea >= 16 || household >= 3) rooms.push('cuisine')
  if (hasStoreroom || (opts.merchant && floorArea >= 18)) {
    if (!rooms.includes('reserve')) rooms.push('reserve')
  }
  if (hasWorkshop || (opts.artisan && floorArea >= 18)) {
    if (!rooms.includes('atelier')) rooms.push('atelier')
  }
  if (household >= 4 && floorArea >= 28) rooms.push('chambre')
  if (floorArea >= 32 && household >= 3) rooms.push('latrines')

  // Cap by floor: each room wants ~3+ cells.
  const maxRooms = Math.max(1, Math.min(rooms.length, Math.floor(floorArea / 3)))
  return rooms.slice(0, maxRooms)
}

export function describeRoomsFr(types: RoomType[]): string {
  const unique: RoomType[] = []
  for (const t of types) {
    if (!unique.includes(t)) unique.push(t)
  }
  if (unique.length === 0) return ''
  const labels = unique.map((t) => ROOM_LABELS_FR[t])
  if (labels.length === 1) return labels[0]
  if (labels.length === 2) return `${labels[0]} et ${labels[1]}`
  return `${labels.slice(0, -1).join(', ')} et ${labels[labels.length - 1]}`
}

export function roomTypesSatisfying(need: keyof NeedPressures): RoomType[] {
  return ROOM_TYPES.filter((t) => {
    const link = ROOM_NEED_MAP[t]
    return link.primary === need || link.secondary.includes(need)
  })
}

export function findRoomByType(fp: HouseFootprint, type: RoomType): RoomZone | null {
  const rooms = fp.rooms ?? []
  return rooms.find((r) => r.type === type) ?? null
}

export function findRoomAt(fp: HouseFootprint, x: number, y: number): RoomZone | null {
  const rooms = fp.rooms ?? []
  for (const r of rooms) {
    for (const c of r.cells) {
      if (c.x === x && c.y === y) return r
    }
  }
  return null
}

export function roomTargetCell(fp: HouseFootprint, type: RoomType): Cell | null {
  const room = findRoomByType(fp, type)
  return room ? room.centroid : null
}

/** Soft need relief when a villager occupies a room cell. */
export function applyRoomNeedRelief(needs: NeedPressures, room: RoomZone | null): void {
  if (!room) return
  const link = ROOM_NEED_MAP[room.type]
  needs[link.primary] = Math.max(0, Math.min(1, needs[link.primary] - link.relief))
  for (const sec of link.secondary) {
    needs[sec] = Math.max(0, Math.min(1, needs[sec] - link.relief * 0.45))
  }
}

/**
 * Carve generative rooms + interior partitions from a shell footprint.
 * Mutates wall/interior sets: partition cells become walls (with door gaps).
 */
export function layoutHouseRooms(
  design: HouseDesign,
  shell: { walls: Cell[]; interior: Cell[]; door: Cell; open: Cell[] },
): HouseFootprint {
  const types =
    design.roomTypes && design.roomTypes.length > 0
      ? [...design.roomTypes]
      : planRoomTypes({
          household: Math.max(1, design.bedSlots),
          floorArea: shell.interior.length,
          hasWorkshop: design.hasWorkshop,
          hasStoreroom: design.hasStoreroom,
        })

  if (shell.interior.length === 0) {
    return { walls: shell.walls, interior: [], door: shell.door, open: shell.open, rooms: [] }
  }

  if (types.length === 1 || shell.interior.length < 4) {
    const t = types[0] ?? 'chambre'
    const zone = makeZone(`${t}-0`, t, [...shell.interior], [shell.door])
    return {
      walls: shell.walls,
      interior: shell.interior,
      door: shell.door,
      open: shell.open,
      rooms: [zone],
    }
  }

  const { rooms, partitionWalls, interior } = partitionInterior(shell.interior, shell.door, types)

  const wallKeys = new Set(shell.walls.map(cellKey))
  const walls = [...shell.walls]
  for (const w of partitionWalls) {
    const k = cellKey(w)
    if (wallKeys.has(k)) continue
    if (w.x === shell.door.x && w.y === shell.door.y) continue
    wallKeys.add(k)
    walls.push(w)
  }

  return {
    walls,
    interior,
    door: shell.door,
    open: shell.open,
    rooms,
  }
}

function partitionInterior(
  interior: Cell[],
  exteriorDoor: Cell,
  types: RoomType[],
): { rooms: RoomZone[]; partitionWalls: Cell[]; interior: Cell[] } {
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
  const spanX = maxX - minX + 1
  const spanY = maxY - minY + 1
  const splitVertical = spanX >= spanY

  // Hall first: cells nearest to exterior door
  const remaining = new Set(sorted.map(cellKey))
  const byKey = new Map(sorted.map((c) => [cellKey(c), c]))
  const hallWant = Math.max(2, Math.round(sorted.length * ROOM_AREA_WEIGHT.hall))
  const hallTypeIdx = types.indexOf('hall')
  const orderedTypes = hallTypeIdx >= 0 ? ['hall' as RoomType, ...types.filter((t) => t !== 'hall')] : [...types]

  const hallCells: Cell[] = []
  if (orderedTypes[0] === 'hall') {
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

  // Strip leftover along major axis into N bands
  const bands = stripCells(leftover, otherTypes.length, splitVertical)
  const roomCellGroups: { type: RoomType; cells: Cell[] }[] = []
  if (orderedTypes[0] === 'hall' && hallCells.length > 0) {
    roomCellGroups.push({ type: 'hall', cells: hallCells })
  }
  for (let i = 0; i < otherTypes.length; i++) {
    const cells = bands[i] ?? []
    if (cells.length === 0) continue
    roomCellGroups.push({ type: otherTypes[i], cells })
  }

  // If some types got nothing, merge empty into largest neighbor conceptually by appending leftovers
  if (roomCellGroups.length === 0) {
    return {
      rooms: [makeZone('chambre-0', 'chambre', sorted, [exteriorDoor])],
      partitionWalls: [],
      interior: sorted,
    }
  }

  const { rooms, partitionWalls, keptInterior } = carvePartitions(roomCellGroups, exteriorDoor, splitVertical)
  return { rooms, partitionWalls, interior: keptInterior }
}

function stripCells(cells: Cell[], n: number, vertical: boolean): Cell[][] {
  if (n <= 0) return []
  if (cells.length === 0) return Array.from({ length: n }, () => [])
  const sorted = [...cells].sort((a, b) => (vertical ? a.x - b.x || a.y - b.y : a.y - b.y || a.x - b.x))
  const weights = Array.from({ length: n }, () => 1)
  // Slightly larger first strips for chambre/salle when assigned later — even split is fine
  const total = weights.reduce((a, b) => a + b, 0)
  const bands: Cell[][] = Array.from({ length: n }, () => [])
  let idx = 0
  let taken = 0
  let band = 0
  const target = (b: number) => Math.round((cells.length * weights.slice(0, b + 1).reduce((a, w) => a + w, 0)) / total)
  for (const c of sorted) {
    while (band < n - 1 && taken >= target(band)) band++
    bands[band].push(c)
    taken++
    idx++
  }
  void idx
  return bands
}

function carvePartitions(
  groups: { type: RoomType; cells: Cell[] }[],
  exteriorDoor: Cell,
  splitVertical: boolean,
): { rooms: RoomZone[]; partitionWalls: Cell[]; keptInterior: Cell[] } {
  if (groups.length <= 1) {
    const g = groups[0]
    return {
      rooms: [makeZone(`${g.type}-0`, g.type, g.cells, [exteriorDoor])],
      partitionWalls: [],
      keptInterior: g.cells,
    }
  }

  const partitionWalls: Cell[] = []
  const doorGaps = new Set<string>()
  const removed = new Set<string>()

  // Between consecutive groups along the split axis, pick a boundary line of cells to wall
  for (let i = 0; i < groups.length - 1; i++) {
    const a = groups[i].cells
    const b = groups[i + 1].cells
    if (a.length === 0 || b.length === 0) continue

    let boundary: Cell[] = []
    if (splitVertical) {
      const aMax = Math.max(...a.map((c) => c.x))
      const bMin = Math.min(...b.map((c) => c.x))
      const seamX = Math.round((aMax + bMin) / 2)
      const candidates = [...a, ...b].filter((c) => c.x === seamX || c.x === aMax)
      boundary = uniqueCells(candidates.filter((c) => c.x === aMax || c.x === seamX))
      // Prefer cells on the A side edge facing B
      boundary = uniqueCells(a.filter((c) => c.x === aMax))
    } else {
      const aMax = Math.max(...a.map((c) => c.y))
      boundary = uniqueCells(a.filter((c) => c.y === aMax))
    }

    if (boundary.length === 0) continue

    // Leave a door gap near the middle of the boundary
    const mid = boundary[Math.floor(boundary.length / 2)]
    doorGaps.add(cellKey(mid))

    for (const c of boundary) {
      const k = cellKey(c)
      if (doorGaps.has(k)) continue
      // Keep at least one walkable cell in each group
      if (a.length - countKeys(a, removed) <= 1) continue
      partitionWalls.push(c)
      removed.add(k)
    }
  }

  const rooms: RoomZone[] = []
  const keptInterior: Cell[] = []
  const counts: Record<string, number> = {}

  for (const g of groups) {
    const cells = g.cells.filter((c) => !removed.has(cellKey(c)))
    if (cells.length === 0) continue
    const n = counts[g.type] ?? 0
    counts[g.type] = n + 1
    const doors: Cell[] = []
    for (const c of g.cells) {
      if (doorGaps.has(cellKey(c))) doors.push(c)
    }
    if (g.type === 'hall') doors.push(exteriorDoor)
    rooms.push(makeZone(`${g.type}-${n}`, g.type, cells, doors))
    keptInterior.push(...cells)
  }

  // Ensure door-gap cells stay interior (assigned to adjacent room if stripped)
  for (const k of doorGaps) {
    if (removed.has(k)) continue
    const [xs, ys] = k.split(',').map(Number)
    if (!keptInterior.some((c) => c.x === xs && c.y === ys)) {
      keptInterior.push({ x: xs, y: ys })
      // Attach to first room if orphaned
      if (rooms.length > 0 && !rooms.some((r) => r.cells.some((c) => c.x === xs && c.y === ys))) {
        rooms[0].cells.push({ x: xs, y: ys })
        rooms[0].centroid = centroidOf(rooms[0].cells)
      }
    }
  }

  return { rooms, partitionWalls, keptInterior }
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

function countKeys(cells: Cell[], removed: Set<string>): number {
  let n = 0
  for (const c of cells) if (removed.has(cellKey(c))) n++
  return n
}

/**
 * Furniture placement API for craft / AI builder agents.
 * Prefers correct room; falls back to any interior cell.
 */
export function planFurnitureSlots(fp: HouseFootprint, maxBeds = 6): FurnitureSlotSpec[] {
  const rooms = fp.rooms ?? []
  const used = new Set<string>()
  const slots: FurnitureSlotSpec[] = []

  const takeCell = (room: RoomZone | null, prefer: 'first' | 'last' | 'spread', spreadIndex = 0): Cell | null => {
    const pool = room && room.cells.length > 0 ? room.cells : fp.interior
    const sorted = [...pool].sort((a, b) => a.y - b.y || a.x - b.x)
    const free = sorted.filter((c) => !used.has(cellKey(c)))
    if (free.length === 0) return null
    let pick: Cell
    if (prefer === 'last') pick = free[free.length - 1]
    else if (prefer === 'spread') pick = free[Math.min(free.length - 1, 1 + spreadIndex * 2)] ?? free[0]
    else pick = free[0]
    used.add(cellKey(pick))
    return pick
  }

  const roomOf = (type: RoomType) => rooms.find((r) => r.type === type) ?? null

  const atelier = roomOf('atelier')
  const reserve = roomOf('reserve')
  const chambres = rooms.filter((r) => r.type === 'chambre')
  const cuisine = roomOf('cuisine')
  const dining = roomOf('salle_a_manger')
  const hall = roomOf('hall')

  const wb = takeCell(atelier ?? hall, 'first')
  if (wb) {
    slots.push({
      kind: 'workbench',
      roomType: atelier?.type ?? 'hall',
      roomId: atelier?.id ?? hall?.id ?? 'fallback',
      cell: wb,
      priority: FURNITURE_PRIORITY.workbench,
    })
  }

  const chest = takeCell(reserve ?? cuisine ?? hall, 'last')
  if (chest) {
    slots.push({
      kind: 'chest',
      roomType: reserve?.type ?? cuisine?.type ?? 'hall',
      roomId: reserve?.id ?? cuisine?.id ?? hall?.id ?? 'fallback',
      cell: chest,
      priority: FURNITURE_PRIORITY.chest,
    })
  }

  let bedCount = 0
  const bedRooms = chambres.length > 0 ? chambres : rooms.length > 0 ? [rooms[0]] : []
  for (const br of bedRooms) {
    while (bedCount < maxBeds) {
      const bed = takeCell(br, 'spread', bedCount)
      if (!bed) break
      slots.push({
        kind: 'bed',
        roomType: br.type,
        roomId: br.id,
        cell: bed,
        priority: FURNITURE_PRIORITY.bed,
      })
      bedCount++
      if (bedRooms.length > 1 && bedCount % Math.max(1, Math.ceil(maxBeds / bedRooms.length)) === 0) break
    }
  }
  while (bedCount < maxBeds) {
    const bed = takeCell(chambres[0] ?? null, 'spread', bedCount)
    if (!bed) break
    slots.push({
      kind: 'bed',
      roomType: 'chambre',
      roomId: chambres[0]?.id ?? 'chambre-0',
      cell: bed,
      priority: FURNITURE_PRIORITY.bed,
    })
    bedCount++
  }

  // Soft extras for furniture agents (not yet stamped by default builders)
  const hearth = takeCell(cuisine, 'first')
  if (hearth && cuisine) {
    slots.push({
      kind: 'hearth',
      roomType: 'cuisine',
      roomId: cuisine.id,
      cell: hearth,
      priority: FURNITURE_PRIORITY.hearth,
    })
  }
  const table = takeCell(dining, 'first')
  if (table && dining) {
    slots.push({
      kind: 'table',
      roomType: 'salle_a_manger',
      roomId: dining.id,
      cell: table,
      priority: FURNITURE_PRIORITY.table,
    })
  }

  return slots.sort((a, b) => a.priority - b.priority)
}

/** Legacy-compatible slot picker used by current builders. */
export function furnitureSlotsFromRooms(fp: HouseFootprint): {
  workbench: Cell
  chest: Cell
  beds: Cell[]
} {
  const planned = planFurnitureSlots(fp)
  const workbench = planned.find((s) => s.kind === 'workbench')?.cell ?? fp.door
  const chest = planned.find((s) => s.kind === 'chest')?.cell ?? fp.door
  const beds = planned.filter((s) => s.kind === 'bed').map((s) => s.cell)
  return { workbench, chest, beds }
}
