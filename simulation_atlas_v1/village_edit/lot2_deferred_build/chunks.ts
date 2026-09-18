/**
 * Grid / chunk adapters for construction placement.
 * Prefer a future chunk API; until then, all ops go through WorldGrid.
 */

import type { Cell, FloorMaterial, WallMaterial } from '../architecture'
import {
  BED,
  CHEST,
  CLAIM_HOUSE,
  DIRT,
  HEARTH,
  HOUSE,
  PLANK,
  TABLE,
  WALL_STONE,
  WALL_WOOD,
  WORKBENCH,
  type WorldGrid,
} from '../types'
import { getTerrain, inBounds, setClaim, setTerrain } from '../world'
import { AIR_ID } from './buildTypes'
import { placeBlock, removeBlock, type ChunkStore } from './blockWorld'
import { defIdFromTerrain } from './defs'
import type { BuildBlock, BuildBlockKind, BuildMaterial } from './types'

/** Furniture terrain codes — floor jobs must not overwrite crafted props. */
const FURNITURE_TERRAIN = new Set([BED, CHEST, TABLE, HEARTH, WORKBENCH])

/**
 * Mirror one terrain cell into ChunkStore (structure / furniture layers).
 * z=0 floors & props; callers pass z=1 for walls when needed.
 */
export function mirrorTerrainToBlocks(
  blocks: ChunkStore,
  x: number,
  y: number,
  terrainCode: number,
  z = 0,
): void {
  const defId = defIdFromTerrain(terrainCode)
  if (defId === AIR_ID) {
    removeBlock(blocks, x, y, z)
    return
  }
  placeBlock(blocks, x, y, z, defId)
}

/** Opaque chunk id — reserved for sibling chunked world work. */
export type ChunkId = string

export interface ChunkCoord {
  chunkX: number
  chunkY: number
  localX: number
  localY: number
}

const CHUNK_SIZE = 16

/** Map world cell → chunk coords (adapter for future chunk stores). */
export function cellToChunk(x: number, y: number, chunkSize = CHUNK_SIZE): ChunkCoord {
  const cx = Math.floor(x / chunkSize)
  const cy = Math.floor(y / chunkSize)
  return {
    chunkX: cx,
    chunkY: cy,
    localX: x - cx * chunkSize,
    localY: y - cy * chunkSize,
  }
}

export function chunkIdOf(coord: ChunkCoord): ChunkId {
  return `${coord.chunkX},${coord.chunkY}`
}

export function wallTerrainCode(mat: WallMaterial): number {
  if (mat === 'stone') return WALL_STONE
  if (mat === 'timber') return HOUSE
  return WALL_WOOD
}

export function floorTerrainCode(mat: FloorMaterial): number {
  if (mat === 'plank') return PLANK
  if (mat === 'dirt') return DIRT
  return PLANK
}

export function terrainForBlock(block: BuildBlock): number | null {
  switch (block.kind) {
    case 'wall':
    case 'partition':
    case 'window':
      return wallTerrainCode(block.material as WallMaterial)
    case 'floor':
      return floorTerrainCode(block.material === 'dirt' ? 'dirt' : block.material === 'none' ? 'none' : 'plank')
    case 'door':
      // Threshold plank — door is an opening, not a wall stamp.
      return PLANK
    default:
      return null
  }
}

export function materialCost(block: BuildBlock): { wood: number; stone: number } {
  if (block.kind === 'door') return { wood: 1, stone: 0 }
  if (block.kind === 'floor') {
    if (block.material === 'plank') return { wood: 1, stone: 0 }
    return { wood: 0, stone: 0 }
  }
  if (block.material === 'stone') return { wood: 0, stone: 1 }
  return { wood: 1, stone: 0 }
}

/**
 * Place one construction block onto the live grid + optional ChunkStore mirror.
 * Terrain dirty drives BuildChunkRenderer remesh; store dirty keys ready for voxel API.
 */
export function placeBuildBlock(
  grid: WorldGrid,
  block: BuildBlock,
  blocks?: ChunkStore | null,
): boolean {
  if (!inBounds(grid, block.x, block.y)) return false
  const code = terrainForBlock(block)
  if (code === null) return false
  const cur = getTerrain(grid, block.x, block.y)
  // Floors never clobber furniture already crafted on that cell.
  if (block.kind === 'floor' && FURNITURE_TERRAIN.has(cur)) {
    setClaim(grid, block.x, block.y, CLAIM_HOUSE)
    return true
  }
  // Windows: lighter frame — wall wood if timber preferred, else same as wall.
  if (block.kind === 'window') {
    const win = block.material === 'stone' ? WALL_STONE : WALL_WOOD
    setTerrain(grid, block.x, block.y, win)
  } else {
    setTerrain(grid, block.x, block.y, code)
  }
  setClaim(grid, block.x, block.y, CLAIM_HOUSE)

  if (blocks) {
    const placedCode =
      block.kind === 'window'
        ? block.material === 'stone'
          ? WALL_STONE
          : WALL_WOOD
        : code
    // z=0 floor / door; z=1 walls & partitions (soft cutaway layers).
    const z = block.kind === 'floor' || block.kind === 'door' ? 0 : 1
    // Keep furniture sprite if floor was skipped above (already returned).
    if (!(block.kind === 'floor' && FURNITURE_TERRAIN.has(cur))) {
      mirrorTerrainToBlocks(blocks, block.x, block.y, placedCode, z)
    }
  }
  return true
}

/** Whether a queued block still needs work on the grid. */
export function blockNeedsWork(grid: WorldGrid, block: BuildBlock): boolean {
  if (block.done) return false
  if (!inBounds(grid, block.x, block.y)) return false
  const want = terrainForBlock(block)
  if (want === null) return false
  if (block.kind === 'window') {
    const t = getTerrain(grid, block.x, block.y)
    return t !== WALL_WOOD && t !== WALL_STONE && t !== HOUSE
  }
  if (block.kind === 'door') {
    const t = getTerrain(grid, block.x, block.y)
    return t !== PLANK && t !== DIRT && t !== HOUSE && t !== WALL_WOOD && t !== WALL_STONE
  }
  if (block.kind === 'floor') {
    const t = getTerrain(grid, block.x, block.y)
    // Crafted furniture counts as the floor cell being occupied / finished.
    if (FURNITURE_TERRAIN.has(t)) return false
    return t !== want
  }
  return getTerrain(grid, block.x, block.y) !== want
}

export function sampleCells(
  grid: WorldGrid,
  cx: number,
  cy: number,
  radius: number,
  pred: (terrain: number) => boolean,
): Cell[] {
  const out: Cell[] = []
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      if (!inBounds(grid, x, y)) continue
      if (pred(getTerrain(grid, x, y))) out.push({ x, y })
    }
  }
  return out
}

export function isStructuralKind(kind: BuildBlockKind): boolean {
  return kind === 'wall' || kind === 'partition' || kind === 'window'
}

export function defaultMaterialForKind(kind: BuildBlockKind, wall: WallMaterial, floor: FloorMaterial): BuildMaterial {
  if (kind === 'floor' || kind === 'door') return floor === 'none' ? 'plank' : floor
  return wall
}
