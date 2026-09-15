import type { Personality } from './types'
import { layoutRoomsFromInterior, planRoomKinds, roomCountToSpan, type RoomKind } from './rooms'

export type HouseShape = 'square' | 'rect' | 'round' | 'ell' | 'courtyard' | 'longhouse'

export const HOUSE_SHAPES: HouseShape[] = ['square', 'rect', 'round', 'ell', 'courtyard', 'longhouse']

export interface HouseDesign {
  shape: HouseShape
  rx: number
  ry: number
  bedSlots: number
  hasWorkshop: boolean
  hasStoreroom: boolean
  /** Planned room kinds (chambre, cuisine, …) — filled by designHouse / expansion. */
  roomKinds: RoomKind[]
}

export interface Cell {
  x: number
  y: number
}

export interface HouseFootprint {
  walls: Cell[]
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
  return {
    shape,
    rx,
    ry,
    bedSlots: clampNum(
      Math.max(roomKinds.filter((k) => k === 'chambre').length, Math.floor(floorArea / 9)),
      1,
      6,
    ),
    hasWorkshop,
    hasStoreroom,
    roomKinds,
  }
}

function clampNum(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

export function houseFootprint(design: HouseDesign, cx: number, cy: number): HouseFootprint {
  const { shape, rx, ry } = design
  const walls: Cell[] = []
  const interior: Cell[] = []
  const open: Cell[] = []
  const door: Cell = { x: cx, y: cy + ry }

  const isDoor = (x: number, y: number) => x === door.x && y === door.y

  if (shape === 'round') {
    const r = Math.max(rx, ry)
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
    door.y = cy + r
    return { walls: walls.filter((c) => !(c.x === door.x && c.y === door.y)), interior, door, open }
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
    door.x = cx - Math.floor(rx / 2)
    door.y = cy + ry
    return { walls: walls.filter((c) => !(c.x === door.x && c.y === door.y)), interior, door, open }
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
          if (!(x === cx && y === cy + innerR)) walls.push({ x, y })
        } else if (insideYard) {
          open.push({ x, y })
        } else {
          interior.push({ x, y })
        }
      }
    }
    return { walls, interior, door, open }
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

  // Multi-room partitions from planned roomKinds (fallback: one mid wall).
  const kinds = design.roomKinds?.length ? design.roomKinds : null
  if (kinds && kinds.length >= 2 && interior.length >= 4) {
    const layout = layoutRoomsFromInterior(interior, kinds, door)
    const partKeys = new Set(layout.partitions.map((c) => `${c.x},${c.y}`))
    for (const p of layout.partitions) walls.push(p)
    return {
      walls,
      interior: interior.filter((c) => !partKeys.has(`${c.x},${c.y}`)),
      door,
      open,
    }
  }

  if (rx >= 3 && ry >= 3) {
    const partitionY = cy
    for (let x = cx - rx + 1; x <= cx + rx - 1; x++) {
      if (x === cx) continue
      walls.push({ x, y: partitionY })
    }
    return { walls, interior: interior.filter((c) => !(c.y === partitionY && c.x !== cx)), door, open }
  }

  return { walls, interior, door, open }
}

export function furnitureSlots(footprint: HouseFootprint): { workbench: Cell; chest: Cell; beds: Cell[] } {
  const sorted = [...footprint.interior].sort((a, b) => a.y - b.y || a.x - b.x)
  const workbench = sorted[0] ?? footprint.door
  const chest = sorted[sorted.length - 1] ?? footprint.door
  const beds: Cell[] = []
  for (let i = 2; i < sorted.length - 2 && beds.length < 6; i += 3) beds.push(sorted[i])
  return { workbench, chest, beds }
}

/** Wall shell material for generative structures — stamped as terrain codes, not building enums. */
export type WallMaterial = 'wood' | 'stone' | 'timber'

export type FloorMaterial = 'plank' | 'dirt' | 'none'

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
