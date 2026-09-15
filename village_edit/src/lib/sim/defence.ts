import { BRIDGE, CLAIM_NONE, PATH, ROAD, TRAIL, WALL_STONE, WALL_WOOD, WATER, type Village, type WorldGrid } from './types'
import { getClaim, getTerrain, idx, inBounds, isBuildableGround } from './world'

const MARGIN = 5
const MAX_SPAN = 140

export interface Perimeter {
  cells: { x: number; y: number }[]
  gates: { x: number; y: number }[]
  naturalCover: number
}

export function computePerimeter(grid: WorldGrid, village: Village, occupied: { x: number; y: number }[]): Perimeter | null {
  if (occupied.length === 0) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const o of occupied) {
    if (o.x < minX) minX = o.x
    if (o.y < minY) minY = o.y
    if (o.x > maxX) maxX = o.x
    if (o.y > maxY) maxY = o.y
  }
  minX -= MARGIN + 1
  minY -= MARGIN + 1
  maxX += MARGIN + 1
  maxY += MARGIN + 1
  if (maxX - minX > MAX_SPAN || maxY - minY > MAX_SPAN) return null

  const w = maxX - minX + 1
  const h = maxY - minY + 1
  const inside = new Uint8Array(w * h)
  const at = (x: number, y: number) => (y - minY) * w + (x - minX)

  for (const o of occupied) {
    for (let dx = -MARGIN; dx <= MARGIN; dx++) {
      for (let dy = -MARGIN; dy <= MARGIN; dy++) {
        if (dx * dx + dy * dy > MARGIN * MARGIN) continue
        const x = o.x + dx
        const y = o.y + dy
        if (x < minX || y < minY || x > maxX || y > maxY) continue
        inside[at(x, y)] = 1
      }
    }
  }

  const smoothed = new Uint8Array(inside)
  for (let y = minY + 1; y < maxY; y++) {
    for (let x = minX + 1; x < maxX; x++) {
      if (inside[at(x, y)]) continue
      let neighbours = 0
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        if (inside[at(x + dx, y + dy)]) neighbours++
      }
      if (neighbours >= 3) smoothed[at(x, y)] = 1
    }
  }

  const cells: { x: number; y: number }[] = []
  const gates: { x: number; y: number }[] = []
  let naturalCover = 0

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (!smoothed[at(x, y)]) continue
      let edge = false
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const) {
        const nx = x + dx
        const ny = y + dy
        if (nx < minX || ny < minY || nx > maxX || ny > maxY || !smoothed[at(nx, ny)]) {
          edge = true
          break
        }
      }
      if (!edge) continue
      if (!inBounds(grid, x, y)) continue

      const terrain = getTerrain(grid, x, y)
      if (terrain === WATER) {
        naturalCover++
        continue
      }
      const claim = getClaim(grid, x, y)
      if (claim !== CLAIM_NONE || terrain === BRIDGE) continue
      if (terrain === ROAD || terrain === PATH) {
        gates.push({ x, y })
        continue
      }
      if (!isBuildableGround(grid, x, y) && terrain !== TRAIL && terrain !== WALL_WOOD && terrain !== WALL_STONE) continue
      cells.push({ x, y })
    }
  }

  if (cells.length === 0) return null
  return { cells, gates, naturalCover }
}

export function occupiedTiles(
  villagers: {
    alive: boolean
    villageId: number | null
    hasHome: boolean
    homeX: number
    homeY: number
    hasPen: boolean
    penX: number
    penY: number
    hasField: boolean
    fieldX: number
    fieldY: number
  }[],
  village: Village,
) {
  const tiles: { x: number; y: number }[] = []
  for (const v of villagers) {
    if (!v.alive || v.villageId !== village.id) continue
    if (v.hasHome && v.homeX >= 0) tiles.push({ x: v.homeX, y: v.homeY })
    if (v.hasPen && v.penX >= 0) tiles.push({ x: v.penX, y: v.penY })
    if (v.hasField && v.fieldX >= 0) tiles.push({ x: v.fieldX, y: v.fieldY })
  }
  if (village.hasMill) tiles.push({ x: village.millX, y: village.millY })
  if (village.hasPort) tiles.push({ x: village.portX, y: village.portY })
  if (village.hasMine) tiles.push({ x: village.mineX, y: village.mineY })
  return tiles
}
