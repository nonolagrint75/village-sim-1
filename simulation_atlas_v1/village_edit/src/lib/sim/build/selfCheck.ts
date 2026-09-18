/**
 * Self-check for build data layer (no test runner).
 * Run: npx tsx scripts/check-build-layer.ts
 */

import { assert, assertEq } from './assert'
import {
  createStoreFromTerrain,
  syncToTerrain,
  terrainCodeToDefId,
} from './bridge'
import {
  AIR_ID,
  CHUNK_SIZE,
  chunkKey,
  localIndex,
} from './buildTypes'
import {
  createBlockWorld,
  getBlock,
  markChunkDirty,
  placeBlock,
  placeBlockByKey,
  removeBlock,
} from './blockWorld'
import { BLOCK_DEFS, defIdFromKey, defIdFromTerrain, getBlockDef } from './defs'
import {
  BED,
  GRASS,
  HOUSE,
  PLANK,
  WALL_STONE,
  WALL_WOOD,
  type WorldGrid,
} from '../types'

function fakeGrid(w: number, h: number, fill: number): WorldGrid {
  const n = w * h
  return {
    width: w,
    height: h,
    terrain: new Uint8Array(n).fill(fill),
    amount: new Uint16Array(n),
    biome: new Uint8Array(n),
    ironDeposit: new Uint16Array(n),
    goldDeposit: new Uint16Array(n),
    copperDeposit: new Uint16Array(n),
    tinDeposit: new Uint16Array(n),
    leadDeposit: new Uint16Array(n),
    silverDeposit: new Uint16Array(n),
    coalDeposit: new Uint16Array(n),
    cropType: new Uint8Array(n),
    claim: new Uint8Array(n),
    traffic: new Float32Array(n),
    walked: new Set(),
    walkedList: [],
    walkedCursor: 0,
    crossing: new Map(),
    dirty: [],
    roadTiles: 0,
    index: null as unknown as WorldGrid['index'],
  }
}

export function selfCheckBuildLayer(): string[] {
  const log: string[] = []
  const note = (s: string) => log.push(s)

  assertEq(BLOCK_DEFS[0]!.id, AIR_ID, 'air')
  for (let i = 0; i < BLOCK_DEFS.length; i++) assertEq(BLOCK_DEFS[i]!.id, i, `id ${i}`)
  assertEq(defIdFromTerrain(WALL_WOOD), defIdFromKey('wall_wood'), 'wall_wood')
  assertEq(defIdFromTerrain(PLANK), defIdFromKey('plank'), 'plank')
  assertEq(defIdFromTerrain(HOUSE), defIdFromKey('house'), 'house')
  assertEq(defIdFromTerrain(BED), defIdFromKey('bed'), 'bed')
  note('defs ok')

  const world = createBlockWorld(48, 48, 8)
  assertEq(getBlock(world, 3, 4, 0).defId, AIR_ID, 'empty')
  const wallId = defIdFromKey('wall_wood')
  const placed = placeBlock(world, 3, 4, 2, wallId, { owner: 42, quality: 200 })
  assert(placed.ok && placed.changed, 'place')
  const v = getBlock(world, 3, 4, 2)
  assertEq(v.defId, wallId, 'get')
  assertEq(v.owner, 42, 'owner')
  assertEq(v.quality, 200, 'quality')
  assert(v.solid, 'solid')
  assert(world.dirty.has(chunkKey(0, 0)), 'dirty')
  assertEq(world.chunkCount(), 1, '1 chunk')

  assert(placeBlockByKey(world, 17, 1, 0, 'plank').ok, 'plank')
  assertEq(world.chunkCount(), 2, '2 chunks')
  world.clearDirty()
  markChunkDirty(world, 2, 3)
  assertEq(world.takeDirty().length, 1, 'takeDirty')

  const rem = removeBlock(world, 3, 4, 2)
  assert(rem.ok && rem.changed && rem.previousDefId === wallId, 'remove')
  assertEq(world.getDefId(3, 4, 2), AIR_ID, 'air')
  assertEq(world.chunkCount(), 1, 'reclaim')
  assertEq(localIndex(0, 0, 0), 0, 'idx0')
  assertEq(localIndex(CHUNK_SIZE - 1, 0, 0), CHUNK_SIZE - 1, 'idx')
  note('ops ok')

  const grid = fakeGrid(32, 32, GRASS)
  // terrain index = y * width + x
  grid.terrain[5 * 32 + 5] = WALL_WOOD
  grid.terrain[5 * 32 + 6] = PLANK
  grid.terrain[5 * 32 + 7] = BED
  const store = createStoreFromTerrain(grid, 4, 0)
  assertEq(store.getDefId(5, 5, 0), defIdFromKey('wall_wood'), 'sync wall')
  assertEq(store.getDefId(6, 5, 0), defIdFromKey('plank'), 'sync plank')
  assertEq(store.getDefId(7, 5, 0), defIdFromKey('bed'), 'sync bed')
  assertEq(store.getDefId(0, 0, 0), AIR_ID, 'grass air')

  placeBlockByKey(store, 10, 10, 0, 'wall_stone')
  const out = fakeGrid(32, 32, GRASS)
  syncToTerrain(store, out, 0)
  assertEq(out.terrain[5 * 32 + 5], WALL_WOOD, 'out wall')
  assertEq(out.terrain[10 * 32 + 10], WALL_STONE, 'out stone')
  assertEq(terrainCodeToDefId(GRASS), AIR_ID, 'grass map')
  assert(getBlockDef(wallId).terrainCode === WALL_WOOD, 'def terrain')
  note('bridge ok')
  note('self-check passed')
  return log
}
