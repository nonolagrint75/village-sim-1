/**
 * Chunk SoA factory — typed arrays only, no per-block objects.
 */

import {
  AIR_ID,
  CHUNK_SIZE,
  chunkVolume,
  type ChunkSoa,
} from './buildTypes'

export function createEmptyChunk(cx: number, cy: number, worldHeight: number): ChunkSoa {
  const n = chunkVolume(worldHeight)
  return {
    cx,
    cy,
    defId: new Uint16Array(n),
    state: new Uint8Array(n),
    durability: new Uint8Array(n),
    owner: new Uint16Array(n),
    age: new Uint16Array(n),
    quality: new Uint8Array(n),
    occupied: 0,
  }
}

export function isChunkEmpty(chunk: ChunkSoa): boolean {
  return chunk.occupied === 0
}

export function clearCell(chunk: ChunkSoa, index: number): boolean {
  if (chunk.defId[index] === AIR_ID) return false
  chunk.defId[index] = AIR_ID
  chunk.state[index] = 0
  chunk.durability[index] = 0
  chunk.owner[index] = 0
  chunk.age[index] = 0
  chunk.quality[index] = 0
  chunk.occupied--
  return true
}

export function writeCell(
  chunk: ChunkSoa,
  index: number,
  defId: number,
  state: number,
  durability: number,
  owner: number,
  age: number,
  quality: number,
): boolean {
  const wasAir = chunk.defId[index] === AIR_ID
  if (
    chunk.defId[index] === defId &&
    chunk.state[index] === state &&
    chunk.durability[index] === durability &&
    chunk.owner[index] === owner &&
    chunk.age[index] === age &&
    chunk.quality[index] === quality
  ) {
    return false
  }
  if (wasAir && defId !== AIR_ID) chunk.occupied++
  else if (!wasAir && defId === AIR_ID) chunk.occupied--
  chunk.defId[index] = defId
  chunk.state[index] = state
  chunk.durability[index] = durability
  chunk.owner[index] = owner
  chunk.age[index] = age
  chunk.quality[index] = quality
  return true
}

/** Approx typed-array bytes per chunk. */
export function chunkByteSize(worldHeight: number): number {
  return chunkVolume(worldHeight) * 9
}

export { CHUNK_SIZE }
