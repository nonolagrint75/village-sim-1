import {
  BUSH,
  DIRT,
  FENCE,
  FIELD,
  GOLD,
  GRASS,
  IRON,
  LOOT,
  MILL,
  MOUNTAIN,
  PATH,
  ROAD,
  SAND,
  STONE,
  TRAIL,
  TREE,
  WATER,
  WHEAT,
} from "@/lib/sim/types"

/** Soft plaza props — same grass underlay as fence/mill. */
export const SOFT_WELL = 37
export const SOFT_PLAZA_FIRE = 38

const NATURAL = new Set<number>([
  GRASS, STONE, TREE, BUSH, GOLD, LOOT, DIRT, WATER, SAND, IRON, MOUNTAIN, FIELD, WHEAT,
])

/** Dirt with amount > 0 is a wood pile (human-made). */
export function isNaturalTerrain(terrain: number, amount = 0): boolean {
  if (terrain === DIRT && amount > 0) return false
  return NATURAL.has(terrain)
}

export function isNaturalGround(terrain: number, amount = 0): boolean {
  if (!isNaturalTerrain(terrain, amount)) return false
  return terrain !== TREE && terrain !== BUSH
}

export function isNaturalProp(terrain: number): boolean {
  return terrain === TREE || terrain === BUSH
}

/** Worn ways — sim cells, but drawn as grass with a dirt ribbon, not a dirt block. */
export function isWornWay(terrain: number): boolean {
  return terrain === TRAIL || terrain === PATH || terrain === ROAD
}

/** Human tiles that should show grass under a prop / ribbon. */
export function isGrassUnderlay(terrain: number): boolean {
  return (
    isWornWay(terrain) ||
    terrain === FENCE ||
    terrain === MILL ||
    terrain === SOFT_WELL ||
    terrain === SOFT_PLAZA_FIRE
  )
}