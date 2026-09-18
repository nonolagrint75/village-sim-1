import type { Personality } from './types'
import { layoutRoomsFromInterior, planRoomKinds, roomCountToSpan, type RoomKind } from './rooms'

export type HouseShape = 'square' | 'rect' | 'round' | 'ell' | 'courtyard' | 'longhouse'

export const HOUSE_SHAPES: HouseShape[] = ['square', 'rect', 'round', 'ell', 'courtyard', 'longhouse']

/** Wall shell material — stamped as terrain codes later; not building enums. */
export type WallMaterial = 'wood' | 'stone' | 'timber'

/** Interior floor intent — soft, optional on legacy designs. */
export type FloorMaterial = 'plank' | 'dirt' | 'none'

/** Door facing for footprint rasterization (default south). */
export type DoorSide = 'N' | 'S' | 'E' | 'W'

export interface HouseDesign {
  shape: HouseShape
  rx: number
  ry: number
  bedSlots: number
  hasWorkshop: boolean
  hasStoreroom: boolean
  /** Planned room kinds (chambre, cuisine, …) — filled by designHouse / expansion. */
  roomKinds: RoomKind[]
  /** Lot 3A — facing; omit → treated as 'S' (legacy houses). */
  doorSide?: DoorSide
  /** Lot 3A — generative wall material; omit → wood at stamp time. */
  wallMaterial?: WallMaterial
  /** Lot 3A — generative floor material; omit → dirt/plank at stamp time. */
  floorMaterial?: FloorMaterial
}

export interface Cell {
  x: number
  y: number
}

export interface HouseFootprint {
  walls: Cell[]
  /**
   * Interior dividers (Lot 3A). Empty on legacy simple shells.
   * May also be merged into `walls` by finishFootprint for stamp paths.
   */
  partitions: Cell[]
  interior: Cell[]
  door: Cell
  open: Cell[]
}

export type StyleWeights = Record<HouseShape, number>

export function freshStyle(rng: () => number): StyleWeights {
  const w = {} as StyleWeights
  for (const s of HOUSE_SHAPES) w[s] = 0.4 + rng() * 0.6
  w[HOUSE_SHAPES[Math.floor(rng() * HOUSE_SHAPES.length)]] += 1.6
  return w
}

export function pickShape(style: StyleWeights, p: Personality, rng: () => number): HouseShape {
  const conformity = 0.3 + p.sociability * 1.4 - p.curiosity * 0.5
  let best: HouseShape = 'square'
  let bestScore = -Infinity
  for (const s of HOUSE_SHAPES) {
    const cultural = Math.pow(Math.max(0.05, style[s]), Math.max(0.2, conformity))
    const whim = rng() * (0.4 + p.curiosity * 1.3)
    const score = cultural + whim
    if (score > bestScore) {
      bestScore = score
      best = s
    }
  }
  return best
}

export function reinforceStyle(style: StyleWeights, shape: HouseShape) {
  style[shape] += 0.35
  for (const s of HOUSE_SHAPES) style[s] *= 0.985
}

export function blendStyles(into: StyleWeights, from: StyleWeights, strength: number) {
  for (const s of HOUSE_SHAPES) into[s] += (from[s] - into[s]) * strength
}

export interface HouseBrief {
  personality: Personality
  wealth: number
  household: number
  artisan: boolean
  merchant: boolean
}

export function designHouse(brief: HouseBrief, shape: HouseShape): HouseDesign {
  const p = brief.personality
  const display = p.ambition * 0.8 - p.generosity * 0.35
  const thrift = p.generosity * 0.2 + (1 - p.ambition) * 0.5

  const roomKinds = planRoomKinds({
    household: brief.household,
    wealth: brief.wealth,
    artisan: brief.artisan,
    merchant: brief.merchant,
    ambition: p.ambition,
  })

  const needRooms = roomKinds.length
  const wealthPush = Math.min(1.6, brief.wealth / 25) * Math.max(0, display)
  const raw = 2 + needRooms * 0.55 + wealthPush - thrift * 0.6

  let rx = Math.round(clampNum(raw, 2, 6))
  let ry = rx

  switch (shape) {
    case 'rect':
      ry = Math.max(2, rx - 1)
      break
    case 'longhouse':
      rx = Math.round(clampNum(raw * 1.6, 4, 9))
      ry = 2
      break
    case 'courtyard':
      rx = Math.max(4, rx + 1)
      ry = rx
      break
    case 'ell':
      ry = Math.max(2, rx - 1)
      break
    default:
      break
  }

  const sized = roomCountToSpan(roomKinds.length, rx, ry)
  rx = sized.rx
  ry = sized.ry

  const floorArea = (2 * rx - 1) * (2 * ry - 1)
  const hasWorkshop = brief.artisan || roomKinds.includes('atelier')
  const hasStoreroom = brief.merchant || brief.wealth > 15 || roomKinds.includes('reserve')
  const wallMaterial: WallMaterial = brief.wealth > 22 ? 'stone' : brief.wealth > 10 ? 'timber' : 'wood'
  const floorMaterial: FloorMaterial = brief.wealth > 8 ? 'plank' : 'dirt'
  const chambreBeds = roomKinds.filter((k) => k === 'chambre').length
  const areaBeds = Math.floor(floorArea / 9)
  // Wealthy briefs get multi-bed mansions (S7 rich→grande demeure) without day scripts.
  const wealthBeds = brief.wealth > 28 ? 4 : brief.wealth > 18 ? 3 : 1
  return {
    shape,
    rx,
    ry,
    bedSlots: clampNum(Math.max(chambreBeds, areaBeds, wealthBeds), 1, 6),
    hasWorkshop,
    hasStoreroom,
    roomKinds,
    doorSide: 'S',
    wallMaterial,
    floorMaterial,
  }
}

function clampNum(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function doorCellFor(cx: number, cy: number, rx: number, ry: number, side: DoorSide = 'S'): Cell {
  switch (side) {
    case 'N':
      return { x: cx, y: cy - ry }
    case 'E':
      return { x: cx + rx, y: cy }
    case 'W':
      return { x: cx - rx, y: cy }
    case 'S':
    default:
      return { x: cx, y: cy + ry }
  }
}

export function houseFootprint(design: HouseDesign, cx: number, cy: number): HouseFootprint {
  const { shape, rx, ry } = design
  const side = design.doorSide ?? 'S'
  const walls: Cell[] = []
  const interior: Cell[] = []
  const open: Cell[] = []
  const door: Cell = doorCellFor(cx, cy, rx, ry, side)

  const isDoor = (x: number, y: number) => x === door.x && y === door.y

  if (shape === 'round') {
    const r = Math.max(rx, ry)
    const roundDoor = doorCellFor(cx, cy, r, r, side)
    door.x = roundDoor.x
    door.y = roundDoor.y
    for (let x = cx - r; x <= cx + r; x++) {
      for (let y = cy - r; y <= cy + r; y++) {
        const d = Math.hypot(x - cx, y - cy)
        if (d > r + 0.5) continue
        if (d >= r - 0.5) {
          if (!isDoor(x, y)) walls.push({ x, y })
        } else {
          interior.push({ x, y })
        }
      }
    }
    return finishFootprint(design, {
      walls: walls.filter((c) => !(c.x === door.x && c.y === door.y)),
      interior,
      door,
      open,
    })
  }

  if (shape === 'ell') {
    const cutX = cx + Math.ceil(rx / 2)
    const cutY = cy + Math.ceil(ry / 2)
    const inShape = (x: number, y: number) => !(x > cutX && y > cutY)
    for (let x = cx - rx; x <= cx + rx; x++) {
      for (let y = cy - ry; y <= cy + ry; y++) {
        if (!inShape(x, y)) continue
        const edge =
          x === cx - rx ||
          x === cx + rx ||
          y === cy - ry ||
          y === cy + ry ||
          !inShape(x + 1, y) ||
          !inShape(x, y + 1) ||
          !inShape(x - 1, y) ||
          !inShape(x, y - 1)
        if (edge) walls.push({ x, y })
        else interior.push({ x, y })
      }
    }
    const ellDoor = doorCellFor(cx, cy, rx, ry, side)
    door.x = ellDoor.x
    door.y = ellDoor.y
    // Prefer a door on the long south edge of the L when facing south (legacy).
    if (side === 'S') {
      door.x = cx - Math.floor(rx / 2)
      door.y = cy + ry
    }
    return finishFootprint(design, {
      walls: walls.filter((c) => !(c.x === door.x && c.y === door.y)),
      interior,
      door,
      open,
    })
  }

  if (shape === 'courtyard') {
    const innerR = Math.max(1, Math.min(rx, ry) - 3)
    for (let x = cx - rx; x <= cx + rx; x++) {
      for (let y = cy - ry; y <= cy + ry; y++) {
        const outerEdge = x === cx - rx || x === cx + rx || y === cy - ry || y === cy + ry
        const dxi = Math.abs(x - cx)
        const dyi = Math.abs(y - cy)
        const innerEdge = (dxi === innerR && dyi <= innerR) || (dyi === innerR && dxi <= innerR)
        const insideYard = dxi < innerR && dyi < innerR
        if (outerEdge) {
          if (!isDoor(x, y)) walls.push({ x, y })
        } else if (innerEdge) {
          if (!(x === door.x && y === door.y)) walls.push({ x, y })
        } else if (insideYard) {
          open.push({ x, y })
        } else {
          interior.push({ x, y })
        }
      }
    }
    return finishFootprint(design, { walls, interior, door, open })
  }

  for (let x = cx - rx; x <= cx + rx; x++) {
    for (let y = cy - ry; y <= cy + ry; y++) {
      const edge = x === cx - rx || x === cx + rx || y === cy - ry || y === cy + ry
      if (edge) {
        if (!isDoor(x, y)) walls.push({ x, y })
      } else {
        interior.push({ x, y })
      }
    }
  }

  return finishFootprint(design, { walls, interior, door, open })
}

/** Apply multi-room partitions (or legacy mid wall) onto a shell. */
function finishFootprint(
  design: HouseDesign,
  shell: { walls: Cell[]; interior: Cell[]; door: Cell; open: Cell[] },
): HouseFootprint {
  const kinds = design.roomKinds?.length ? design.roomKinds : null
  if (kinds && kinds.length >= 2 && shell.interior.length >= 4) {
    const layout = layoutRoomsFromInterior(shell.interior, kinds, shell.door)
    const partKeys = new Set(layout.partitions.map((c) => `${c.x},${c.y}`))
    const walls = [...shell.walls]
    for (const p of layout.partitions) walls.push(p)
    return {
      walls,
      partitions: layout.partitions,
      interior: layout.interior.length > 0 ? layout.interior : shell.interior.filter((c) => !partKeys.has(`${c.x},${c.y}`)),
      door: shell.door,
      open: shell.open,
    }
  }

  const { rx, ry } = design
  if (rx >= 3 && ry >= 3 && shell.open.length === 0) {
    const cy = shell.door.y - ry
    const cx = shell.door.x
    const walls = [...shell.walls]
    const partitions: Cell[] = []
    for (let x = cx - rx + 1; x <= cx + rx - 1; x++) {
      if (x === cx) continue
      walls.push({ x, y: cy })
      partitions.push({ x, y: cy })
    }
    return {
      walls,
      partitions,
      interior: shell.interior.filter((c) => !(c.y === cy && c.x !== cx)),
      door: shell.door,
      open: shell.open,
    }
  }

  return { ...shell, partitions: [] }
}

export function furnitureSlots(footprint: HouseFootprint): { workbench: Cell; chest: Cell; beds: Cell[] } {
  const sorted = [...footprint.interior].sort((a, b) => a.y - b.y || a.x - b.x)
  const workbench = sorted[0] ?? footprint.door
  const chest = sorted[sorted.length - 1] ?? footprint.door
  const beds: Cell[] = []
  for (let i = 2; i < sorted.length - 2 && beds.length < 6; i += 3) beds.push(sorted[i])
  return { workbench, chest, beds }
}

/**
 * Parametric structure brief. AI / cognition fills scale & features;
 * rasterization yields cells, never a fixed Castle/TownHall sprite id.
 */
export interface StructureParams {
  shape: HouseShape
  rx: number
  ry: number
  wallMaterial: WallMaterial
  floorMaterial: FloorMaterial
  towers: boolean
  courtyard: boolean
  door: boolean
  /** Hauteur mur soft (m) — lore / futur rendu ; pas de collision 3D. */
  wallHeightM?: number
}

export interface StructureFootprint {
  walls: Cell[]
  /** Corner tower cells (optional); placed as same wall terrain, thicker presence. */
  towers: Cell[]
  interior: Cell[]
  open: Cell[]
  door: Cell | null
}

/**
 * Generative footprint from size / material / optional towers & courtyard.
 * Reuses house geometry, then adds corner towers when requested.
 */
export function structureFootprint(params: StructureParams, cx: number, cy: number): StructureFootprint {
  const design: HouseDesign = {
    shape: params.courtyard ? 'courtyard' : params.shape,
    rx: params.rx,
    ry: params.ry,
    bedSlots: 0,
    hasWorkshop: false,
    hasStoreroom: false,
    roomKinds: [],
  }
  const base = houseFootprint(design, cx, cy)
  const walls = params.door ? base.walls : [...base.walls, base.door]
  const door = params.door ? base.door : null
  const towers: Cell[] = []

  if (params.towers) {
    const corners: Cell[] = [
      { x: cx - params.rx, y: cy - params.ry },
      { x: cx + params.rx, y: cy - params.ry },
      { x: cx - params.rx, y: cy + params.ry },
      { x: cx + params.rx, y: cy + params.ry },
    ]
    const seen = new Set(walls.map((c) => `${c.x},${c.y}`))
    for (const corner of corners) {
      for (const [dx, dy] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ] as const) {
        const x = corner.x + dx
        const y = corner.y + dy
        const key = `${x},${y}`
        if (seen.has(key)) continue
        if (door && door.x === x && door.y === y) continue
        seen.add(key)
        towers.push({ x, y })
      }
    }
  }

  return {
    walls,
    towers,
    interior: base.interior,
    open: base.open,
    door,
  }
}

/** All cells that must be clear / claimed for a structure site. */
export function structurePlotCells(fp: StructureFootprint): Cell[] {
  const out = [...fp.walls, ...fp.towers, ...fp.interior, ...fp.open]
  if (fp.door) out.push(fp.door)
  return out
}
