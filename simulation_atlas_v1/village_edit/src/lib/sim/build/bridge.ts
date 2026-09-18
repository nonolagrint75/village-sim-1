/**
 * Bridge: ChunkStore ↔ legacy WorldGrid.terrain Uint8Array codes.
 * Default layer z=0 mirrors the 2D surface for migration.
 */

import { GRASS, type WorldGrid } from '../types'
import { AIR_ID, DEFAULT_WORLD_HEIGHT } from './buildTypes'
import { ChunkStore } from './blockWorld'
import { defIdFromTerrain, terrainFromDefId } from './defs'

export type SyncStats = { cells: number; written: number }

export function createStoreFromTerrain(
  grid: WorldGrid,
  height = DEFAULT_WORLD_HEIGHT,
  z = 0,
  opts: { treatGrassAsAir?: boolean } = {},
): ChunkStore {
  const store = ChunkStore.create(grid.width, grid.height, height)
  syncFromTerrain(store, grid, z, opts)
  store.clearDirty()
  return store
}

export function syncFromTerrain(
  store: ChunkStore,
  grid: WorldGrid,
  z = 0,
  opts: { treatGrassAsAir?: boolean } = {},
): SyncStats {
  const treatGrassAsAir = opts.treatGrassAsAir ?? true
  const w = Math.min(store.width, grid.width)
  const d = Math.min(store.depth, grid.height)
  if (z < 0 || z >= store.height) return { cells: 0, written: 0 }

  let written = 0
  for (let y = 0; y < d; y++) {
    const row = y * grid.width
    for (let x = 0; x < w; x++) {
      const code = grid.terrain[row + x]!
      let defId = defIdFromTerrain(code)
      if (treatGrassAsAir && code === GRASS) defId = AIR_ID
      if (defId === AIR_ID) {
        if (store.getDefId(x, y, z) !== AIR_ID) {
          store.set(x, y, z, AIR_ID)
          written++
        }
        continue
      }
      if (store.set(x, y, z, defId)) written++
    }
  }
  return { cells: w * d, written }
}

export function syncToTerrain(
  store: ChunkStore,
  grid: WorldGrid,
  z = 0,
  opts: { airTerrain?: number; keepExistingOnAir?: boolean } = {},
): SyncStats {
  const airTerrain = opts.airTerrain ?? GRASS
  const keepExistingOnAir = opts.keepExistingOnAir ?? false
  const w = Math.min(store.width, grid.width)
  const d = Math.min(store.depth, grid.height)
  if (z < 0 || z >= store.height) return { cells: 0, written: 0 }

  let written = 0
  for (let y = 0; y < d; y++) {
    const row = y * grid.width
    for (let x = 0; x < w; x++) {
      const defId = store.getDefId(x, y, z)
      const i = row + x
      if (defId === AIR_ID) {
        if (!keepExistingOnAir && grid.terrain[i] !== airTerrain) {
          grid.terrain[i] = airTerrain
          written++
        }
        continue
      }
      const code = terrainFromDefId(defId)
      if (code === null) continue
      if (grid.terrain[i] !== code) {
        grid.terrain[i] = code
        written++
      }
    }
  }
  return { cells: w * d, written }
}

export function terrainCodeToDefId(code: number, treatGrassAsAir = true): number {
  if (treatGrassAsAir && code === GRASS) return AIR_ID
  return defIdFromTerrain(code)
}

export function defIdToTerrainCode(defId: number): number {
  if (defId === AIR_ID) return GRASS
  return terrainFromDefId(defId) ?? GRASS
}
