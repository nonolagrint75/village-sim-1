/**
 * BlockWorld / ChunkStore — sparse 16×16×H SoA chunks, O(1) get/set, dirty flags.
 * CONTRACT entry: blockWorld.ts (data / voxels specialist).
 */

import { clearCell, createEmptyChunk, isChunkEmpty, writeCell } from './chunk'
import { defIdFromKey, getBlockDef, isSolidDef } from './defs'
import {
  AIR_ID,
  BlockKind,
  CHUNK_SIZE,
  DEFAULT_WORLD_HEIGHT,
  Material,
  OWNER_NONE,
  chunkKey,
  localIndex,
  type BlockView,
  type ChunkKey,
  type ChunkSoa,
  type PlaceOptions,
  type WorldBuildDims,
} from './buildTypes'

const AIR_VIEW: BlockView = Object.freeze({
  defId: AIR_ID,
  material: Material.Air,
  kind: BlockKind.Air,
  state: 0,
  solid: false,
  durability: 0,
  owner: OWNER_NONE,
  age: 0,
  quality: 0,
})

export type PlaceResult = {
  ok: boolean
  changed: boolean
  previousDefId: number
  chunkX?: number
  chunkY?: number
  reason?: string
}

/** Alias used by CONTRACT docs. */
export type BlockWorld = ChunkStore

export class ChunkStore {
  readonly width: number
  readonly depth: number
  readonly height: number
  readonly chunks = new Map<ChunkKey, ChunkSoa>()
  readonly dirty = new Set<ChunkKey>()

  constructor(dims: WorldBuildDims) {
    if (dims.width < 1 || dims.depth < 1 || dims.height < 1) {
      throw new Error('ChunkStore: invalid dimensions')
    }
    this.width = dims.width
    this.depth = dims.depth
    this.height = dims.height
  }

  static create(width: number, depth: number, height = DEFAULT_WORLD_HEIGHT): ChunkStore {
    return new ChunkStore({ width, depth, height })
  }

  inBounds(x: number, y: number, z: number): boolean {
    return x >= 0 && y >= 0 && z >= 0 && x < this.width && y < this.depth && z < this.height
  }

  chunkCoord(x: number, y: number): { cx: number; cy: number; lx: number; ly: number } {
    const cx = (x / CHUNK_SIZE) | 0
    const cy = (y / CHUNK_SIZE) | 0
    return { cx, cy, lx: x - cx * CHUNK_SIZE, ly: y - cy * CHUNK_SIZE }
  }

  markChunkDirty(cx: number, cy: number): void {
    this.dirty.add(chunkKey(cx, cy))
  }

  clearDirty(): void {
    this.dirty.clear()
  }

  takeDirty(): ChunkKey[] {
    const keys = [...this.dirty]
    this.dirty.clear()
    return keys
  }

  getChunk(cx: number, cy: number): ChunkSoa | undefined {
    return this.chunks.get(chunkKey(cx, cy))
  }

  ensureChunk(cx: number, cy: number): ChunkSoa {
    const key = chunkKey(cx, cy)
    let c = this.chunks.get(key)
    if (!c) {
      c = createEmptyChunk(cx, cy, this.height)
      this.chunks.set(key, c)
    }
    return c
  }

  private reclaim(chunk: ChunkSoa): void {
    if (!isChunkEmpty(chunk)) return
    this.chunks.delete(chunkKey(chunk.cx, chunk.cy))
  }

  /** O(1) rich query. */
  get(x: number, y: number, z: number): BlockView {
    if (!this.inBounds(x, y, z)) return AIR_VIEW
    const { cx, cy, lx, ly } = this.chunkCoord(x, y)
    const chunk = this.chunks.get(chunkKey(cx, cy))
    if (!chunk) return AIR_VIEW
    const i = localIndex(lx, ly, z)
    const defId = chunk.defId[i]!
    if (defId === AIR_ID) return AIR_VIEW
    const d = getBlockDef(defId)
    return {
      defId,
      material: d.material,
      kind: d.kind,
      state: chunk.state[i]!,
      solid: d.solid,
      durability: chunk.durability[i]!,
      owner: chunk.owner[i]!,
      age: chunk.age[i]!,
      quality: chunk.quality[i]!,
    }
  }

  /** CONTRACT alias for get(). */
  getBlock(x: number, y: number, z: number): BlockView {
    return this.get(x, y, z)
  }

  getDefId(x: number, y: number, z: number): number {
    if (!this.inBounds(x, y, z)) return AIR_ID
    const { cx, cy, lx, ly } = this.chunkCoord(x, y)
    const chunk = this.chunks.get(chunkKey(cx, cy))
    if (!chunk) return AIR_ID
    return chunk.defId[localIndex(lx, ly, z)]!
  }

  isSolid(x: number, y: number, z: number): boolean {
    return isSolidDef(this.getDefId(x, y, z))
  }

  /** O(1) set by defId. Air removes + may reclaim chunk. */
  set(x: number, y: number, z: number, defId: number, opts: PlaceOptions = {}): boolean {
    if (!this.inBounds(x, y, z)) return false
    const { cx, cy, lx, ly } = this.chunkCoord(x, y)
    const i = localIndex(lx, ly, z)

    if (defId === AIR_ID) {
      const chunk = this.chunks.get(chunkKey(cx, cy))
      if (!chunk) return false
      const changed = clearCell(chunk, i)
      if (changed) {
        this.markChunkDirty(cx, cy)
        this.reclaim(chunk)
      }
      return changed
    }

    const d = getBlockDef(defId)
    if (d.id !== defId) return false
    const state = opts.state ?? 0
    const durability = opts.durability ?? d.defaultDurability
    const owner = opts.owner ?? OWNER_NONE
    const age = opts.age ?? 0
    const quality = opts.quality ?? d.defaultQuality

    const chunk = this.ensureChunk(cx, cy)
    const changed = writeCell(chunk, i, defId, state, durability, owner, age, quality)
    if (changed) this.markChunkDirty(cx, cy)
    return changed
  }

  chunkCount(): number {
    return this.chunks.size
  }

  dirtyCount(): number {
    return this.dirty.size
  }
}

export function createBlockWorld(
  width: number,
  depth: number,
  height = DEFAULT_WORLD_HEIGHT,
): ChunkStore {
  return ChunkStore.create(width, depth, height)
}

function resolveWorld(target: ChunkStore | { blocks: ChunkStore }): ChunkStore {
  return 'blocks' in target ? target.blocks : target
}

/** CONTRACT: placeBlock(state|world, x, y, z, defId, opts?) */
export function placeBlock(
  target: ChunkStore | { blocks: ChunkStore },
  x: number,
  y: number,
  z: number,
  defId: number,
  opts?: PlaceOptions,
): PlaceResult {
  const world = resolveWorld(target)
  if (!world.inBounds(x, y, z)) {
    return { ok: false, changed: false, previousDefId: AIR_ID, reason: 'oob' }
  }
  if (defId === AIR_ID || getBlockDef(defId).id !== defId) {
    return {
      ok: false,
      changed: false,
      previousDefId: world.getDefId(x, y, z),
      reason: 'bad_def',
    }
  }
  const previousDefId = world.getDefId(x, y, z)
  const changed = world.set(x, y, z, defId, opts)
  const { cx, cy } = world.chunkCoord(x, y)
  return { ok: true, changed, previousDefId, chunkX: cx, chunkY: cy }
}

export function placeBlockByKey(
  target: ChunkStore | { blocks: ChunkStore },
  x: number,
  y: number,
  z: number,
  key: string,
  opts?: PlaceOptions,
): PlaceResult {
  return placeBlock(target, x, y, z, defIdFromKey(key), opts)
}

/** CONTRACT: removeBlock */
export function removeBlock(
  target: ChunkStore | { blocks: ChunkStore },
  x: number,
  y: number,
  z: number,
  _opts?: PlaceOptions,
): PlaceResult {
  const world = resolveWorld(target)
  if (!world.inBounds(x, y, z)) {
    return { ok: false, changed: false, previousDefId: AIR_ID, reason: 'oob' }
  }
  const previousDefId = world.getDefId(x, y, z)
  if (previousDefId === AIR_ID) {
    const { cx, cy } = world.chunkCoord(x, y)
    return { ok: true, changed: false, previousDefId, chunkX: cx, chunkY: cy }
  }
  const changed = world.set(x, y, z, AIR_ID)
  const { cx, cy } = world.chunkCoord(x, y)
  return { ok: true, changed, previousDefId, chunkX: cx, chunkY: cy }
}

/** CONTRACT: getBlock(world, x, y, z) */
export function getBlock(world: ChunkStore, x: number, y: number, z: number): BlockView {
  return world.get(x, y, z)
}

/** CONTRACT: markChunkDirty(world, cx, cy) */
export function markChunkDirty(world: ChunkStore, cx: number, cy: number): void {
  world.markChunkDirty(cx, cy)
}
