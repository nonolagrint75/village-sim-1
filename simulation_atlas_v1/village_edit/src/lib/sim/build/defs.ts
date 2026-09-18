/**
 * Shared BlockDef registry — one entry per identity (never per cell).
 */

import {
  AIR_ID,
  BlockKind,
  Material,
  type BlockDef,
} from './buildTypes'
import {
  BED,
  BENCH,
  BRIDGE,
  BUSH,
  CHEST,
  CRADLE,
  CUPBOARD,
  DIRT,
  FENCE,
  FIELD,
  GOLD,
  GRASS,
  HEARTH,
  HOUSE,
  IRON,
  LOOM,
  LOOT,
  MILL,
  MOUNTAIN,
  PATH,
  PLANK,
  PORT,
  ROAD,
  SAND,
  SHELF,
  STONE,
  STOOL,
  TABLE,
  TRAIL,
  TREE,
  TUNNEL,
  WALL_STONE,
  WALL_WOOD,
  WASHING_TUB,
  WATER,
  WHEAT,
  WORKBENCH,
} from '../types'

/**
 * Soft terrain codes from manual (wells / plaza fire) — not yet exported on canon types.
 * Kept local so Lot 2 does not mutate types.ts; unused until a gameplay lot wires them.
 */
const WELL = 37
const PLAZA_FIRE = 38

function d(
  id: number,
  key: string,
  material: Material,
  kind: BlockKind,
  solid: boolean,
  defaultDurability: number,
  defaultQuality: number,
  terrainCode: number | null,
): BlockDef {
  return { id, key, material, kind, solid, defaultDurability, defaultQuality, terrainCode }
}

/** Index === id. Id 0 = air. */
export const BLOCK_DEFS: readonly BlockDef[] = Object.freeze([
  d(AIR_ID, 'air', Material.Air, BlockKind.Air, false, 0, 0, null),
  d(1, 'grass', Material.Soil, BlockKind.Floor, false, 20, 128, GRASS),
  d(2, 'stone', Material.Stone, BlockKind.Resource, true, 200, 128, STONE),
  d(3, 'tree', Material.Plant, BlockKind.Resource, true, 80, 128, TREE),
  d(4, 'bush', Material.Plant, BlockKind.Resource, false, 30, 128, BUSH),
  d(5, 'gold', Material.Metal, BlockKind.Resource, true, 180, 200, GOLD),
  d(6, 'fence', Material.Wood, BlockKind.Decor, true, 60, 128, FENCE),
  d(7, 'house', Material.Wood, BlockKind.Structure, true, 120, 128, HOUSE),
  d(8, 'loot', Material.Organic, BlockKind.Decor, false, 10, 128, LOOT),
  d(9, 'chest', Material.Wood, BlockKind.Furniture, true, 90, 140, CHEST),
  d(10, 'workbench', Material.Wood, BlockKind.Furniture, true, 100, 150, WORKBENCH),
  d(11, 'wall_wood', Material.Wood, BlockKind.Wall, true, 110, 128, WALL_WOOD),
  d(12, 'wall_stone', Material.Stone, BlockKind.Wall, true, 220, 140, WALL_STONE),
  d(13, 'dirt', Material.Soil, BlockKind.Floor, false, 25, 100, DIRT),
  d(14, 'bed', Material.Fabric, BlockKind.Furniture, true, 70, 140, BED),
  d(15, 'water', Material.Water, BlockKind.Fluid, false, 255, 128, WATER),
  d(16, 'path', Material.Soil, BlockKind.Path, false, 40, 110, PATH),
  d(17, 'bridge', Material.Wood, BlockKind.Path, false, 90, 130, BRIDGE),
  d(18, 'sand', Material.Soil, BlockKind.Floor, false, 15, 100, SAND),
  d(19, 'plank', Material.Wood, BlockKind.Floor, false, 85, 140, PLANK),
  d(20, 'field', Material.Soil, BlockKind.Floor, false, 30, 120, FIELD),
  d(21, 'wheat', Material.Plant, BlockKind.Crop, false, 20, 128, WHEAT),
  d(22, 'mill', Material.Stone, BlockKind.Structure, true, 200, 160, MILL),
  d(23, 'trail', Material.Soil, BlockKind.Path, false, 35, 100, TRAIL),
  d(24, 'road', Material.Stone, BlockKind.Path, false, 150, 140, ROAD),
  d(25, 'port', Material.Wood, BlockKind.Structure, true, 160, 150, PORT),
  d(26, 'iron', Material.Metal, BlockKind.Resource, true, 210, 160, IRON),
  d(27, 'mountain', Material.Stone, BlockKind.Resource, true, 255, 128, MOUNTAIN),
  d(28, 'tunnel', Material.Stone, BlockKind.Path, false, 180, 120, TUNNEL),
  d(29, 'table', Material.Wood, BlockKind.Furniture, true, 75, 140, TABLE),
  d(30, 'hearth', Material.Stone, BlockKind.Furniture, true, 140, 150, HEARTH),
  d(31, 'bench', Material.Wood, BlockKind.Furniture, true, 65, 130, BENCH),
  d(32, 'stool', Material.Wood, BlockKind.Furniture, true, 50, 120, STOOL),
  d(33, 'shelf', Material.Wood, BlockKind.Furniture, true, 70, 130, SHELF),
  d(34, 'cupboard', Material.Wood, BlockKind.Furniture, true, 85, 140, CUPBOARD),
  d(35, 'cradle', Material.Wood, BlockKind.Furniture, true, 55, 150, CRADLE),
  d(36, 'loom', Material.Wood, BlockKind.Furniture, true, 95, 145, LOOM),
  d(37, 'washing_tub', Material.Wood, BlockKind.Furniture, true, 60, 120, WASHING_TUB),
  d(38, 'well', Material.Stone, BlockKind.Structure, true, 180, 160, WELL),
  d(39, 'plaza_fire', Material.Stone, BlockKind.Structure, true, 90, 140, PLAZA_FIRE),
])

const byTerrain = new Map<number, number>()
const byKey = new Map<string, number>()
for (const def of BLOCK_DEFS) {
  byKey.set(def.key, def.id)
  if (def.terrainCode !== null) byTerrain.set(def.terrainCode, def.id)
}

export function getBlockDef(defId: number): BlockDef {
  return BLOCK_DEFS[defId] ?? BLOCK_DEFS[AIR_ID]!
}

export function defIdFromKey(key: string): number {
  return byKey.get(key) ?? AIR_ID
}

export function defIdFromTerrain(terrainCode: number): number {
  return byTerrain.get(terrainCode) ?? AIR_ID
}

export function terrainFromDefId(defId: number): number | null {
  return getBlockDef(defId).terrainCode
}

export function isSolidDef(defId: number): boolean {
  return getBlockDef(defId).solid
}
