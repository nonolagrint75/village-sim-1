/**
 * Lot 3A — lazy SimState.blocks bridge onto Lot 2 ChunkStore.
 * Does not stamp terrain or run construction; call sites are Lot 3B+.
 */
import type { SimState } from '../types'
import { createBlockWorld, type ChunkStore } from './blockWorld'
import { createStoreFromTerrain } from './bridge'
import { DEFAULT_WORLD_HEIGHT } from './buildTypes'

/**
 * Ensure state.blocks exists. Optionally mirrors current terrain once.
 * Empty dormant store if no grid yet.
 */
export function ensureBlockWorld(
  state: SimState,
  opts: { syncFromTerrain?: boolean } = {},
): ChunkStore {
  if (state.blocks) return state.blocks
  const w = state.grid?.width ?? 0
  const h = state.grid?.height ?? 0
  if (w > 0 && h > 0) {
    const store =
      opts.syncFromTerrain === true
        ? createStoreFromTerrain(state.grid, DEFAULT_WORLD_HEIGHT, 0)
        : createBlockWorld(w, h, DEFAULT_WORLD_HEIGHT)
    state.blocks = store
    return store
  }
  const empty = createBlockWorld(1, 1, DEFAULT_WORLD_HEIGHT)
  state.blocks = empty
  return empty
}