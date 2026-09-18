/**
 * Compact block / chunk data layer — shared contract types.
 * See CONTRACT.md. Horizontal chunk = 16 (match resourceIndex.CELL).
 * Height = 16–32 soft layers (not dense Minecraft sky).
 */

export const AIR_ID = 0
export const CHUNK_SIZE = 16
/** Soft vertical budget — cabin silhouette, not full MC height. */
export const DEFAULT_WORLD_HEIGHT = 16
export const OWNER_NONE = 0

/** Incomplete shell: fewer placed exterior walls than this → reclaim as debris. */
export const MIN_SHELL_WALL_CELLS = 6
/** Max simultaneous unfinished home shells (avoids stub spam; high enough for early camp roofs). */
export const MAX_CONCURRENT_HOME_BUILDS = 8
/** Periodic stray WALL sweep cadence (sim ticks). */
export const STRAY_CLEANUP_PERIOD = 180
/** Fraction of planned exterior walls below which an unfinished shell is scrap. */
export const INCOMPLETE_SHELL_RATIO = 0.4

export type ChunkKey = number
export type ChunkCoord = { cx: number; cy: number }

export enum BlockKind {
  Air = 0,
  Floor = 1,
  Wall = 2,
  Resource = 3,
  Furniture = 4,
  Structure = 5,
  Decor = 6,
  Fluid = 7,
  Path = 8,
  Crop = 9,
}

export enum Material {
  Air = 0,
  Soil = 1,
  Stone = 2,
  Plant = 3,
  Metal = 4,
  Wood = 5,
  Organic = 6,
  Fabric = 7,
  Water = 8,
}

export interface BlockDef {
  id: number
  key: string
  material: Material
  kind: BlockKind
  solid: boolean
  defaultDurability: number
  defaultQuality: number
  /** Legacy 2D terrain code bridge; null = no surface stamp. */
  terrainCode: number | null
}

/** Lightweight view — never store one object per cell. */
export interface BlockView {
  defId: number
  material: Material
  kind: BlockKind
  state: number
  solid: boolean
  durability: number
  owner: number
  age: number
  quality: number
}

/** Sparse chunk SoA — typed arrays only. */
export interface ChunkSoa {
  cx: number
  cy: number
  defId: Uint16Array
  state: Uint8Array
  durability: Uint8Array
  owner: Uint16Array
  age: Uint16Array
  quality: Uint8Array
  occupied: number
}

export interface PlaceOptions {
  state?: number
  durability?: number
  owner?: number
  age?: number
  quality?: number
}

export interface WorldBuildDims {
  width: number
  depth: number
  height: number
}

export function chunkKey(cx: number, cy: number): ChunkKey {
  return ((cx & 0xffff) << 16) | (cy & 0xffff)
}

export function unpackChunkKey(key: ChunkKey): ChunkCoord {
  return { cx: (key >>> 16) & 0xffff, cy: key & 0xffff }
}

/** Cell index inside chunk: x + y*S + z*S*S */
export function localIndex(lx: number, ly: number, z: number): number {
  return lx + ly * CHUNK_SIZE + z * CHUNK_SIZE * CHUNK_SIZE
}

export function chunkVolume(worldHeight: number): number {
  return CHUNK_SIZE * CHUNK_SIZE * worldHeight
}
