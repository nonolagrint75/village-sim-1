import { BiomeId, type BiomeId as BiomeIdT } from "./biomes"
import {
  BUSH,
  DIRT,
  FIELD,
  GOLD,
  GRASS,
  IRON,
  LOOT,
  MOUNTAIN,
  SAND,
  STONE,
  TREE,
  WATER,
  WHEAT,
} from "@/lib/sim/types"
import { isNaturalTerrain } from "./kinds"
import { hash2, TREE_DEAD_VARIANTS, TREE_OAK_VARIANTS, TREE_PINE_VARIANTS } from "./textureLab"

export const TREE_AUTUMN_VARIANTS = TREE_OAK_VARIANTS

export type SeasonName = "spring" | "summer" | "autumn" | "winter"

export function natureGrassKey(biome: BiomeIdT, season: SeasonName, x = 0, y = 0): string {
  if (season === "winter" || biome === BiomeId.tundra || biome === BiomeId.alpine) return "grass_frost"
  if (biome === BiomeId.desert || biome === BiomeId.savanna || biome === BiomeId.scrub) return "grass_dry"
  if (biome === BiomeId.wetland) return "grass_wet"
  // Fine continuous meadow value — avoid large rectangular plateaus (Stardew/Puny).
  const v =
    hash2(x, y, 23) * 0.42 +
    hash2((x * 3 + 1) >> 1, (y * 3 + 2) >> 1, 21) * 0.33 +
    hash2((x + 5) >> 2, (y + 3) >> 2, 19) * 0.25
  const slot =
    v < 0.14
      ? "grass_b"
      : v < 0.28
        ? "grass_c"
        : v < 0.42
          ? "grass_d"
          : v < 0.56
            ? "grass_e"
            : v < 0.7
              ? "grass_f"
              : v < 0.84
                ? "grass_g"
                : v < 0.93
                  ? "grass_h"
                  : "grass"
  if (season === "autumn") return v > 0.62 ? "grass_autumn" : slot === "grass" ? "grass_autumn" : slot
  // Summer tint only as rare accent — full-cell grass_summer reads as rectangular meadow bands.
  if (season === "summer" && v > 0.88) return "grass_summer"
  return slot
}

/** Continuous meadow scalar for subcell dither (same family as natureGrassKey). */
export function meadowValue(x: number, y: number): number {
  // Mix floored hash with continuous fbm so dither is not rectangular plateaus.
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const discrete =
    hash2(ix, iy, 23) * 0.32 +
    hash2((ix * 3 + 1) >> 1, (iy * 3 + 2) >> 1, 21) * 0.22 +
    hash2((ix + 5) >> 2, (iy + 3) >> 2, 19) * 0.16
  // Late import avoided — inline cheap continuous blend via fractional hash lerp.
  const fx = x - ix
  const fy = y - iy
  const h00 = hash2(ix, iy, 47)
  const h10 = hash2(ix + 1, iy, 47)
  const h01 = hash2(ix, iy + 1, 47)
  const h11 = hash2(ix + 1, iy + 1, 47)
  const cont =
    h00 * (1 - fx) * (1 - fy) + h10 * fx * (1 - fy) + h01 * (1 - fx) * fy + h11 * fx * fy
  return discrete * 0.55 + cont * 0.45
}

/** Ground under trees/bushes — same meadow family as open grass (no brown patch). */
export function natureForestFloorKey(biome: BiomeIdT, season: SeasonName, x: number, y: number): string {
  // Match surrounding meadow; only a touch darker in dense canopy via grass_forest rarely.
  const base = natureGrassKey(biome, season, x, y)
  if (season === "winter" || biome === BiomeId.tundra || biome === BiomeId.alpine) return base
  if (hash2(x, y, 29) > 0.82) return "grass_forest"
  return base
}

function treeKey(biome: BiomeIdT, season: SeasonName, x: number, y: number): string {
  const pick = hash2(x, y, 21)
  const pine = `tree_pine_${Math.floor(hash2(x, y, 22) * TREE_PINE_VARIANTS)}`
  if (biome === BiomeId.boreal || biome === BiomeId.alpine) return pine
  if (season === "winter" || biome === BiomeId.tundra) {
    if (pick > 0.62) return pine
    return `tree_dead_${Math.floor(pick * TREE_DEAD_VARIANTS)}`
  }
  if (pick > 0.9) return pine
  // Rare dead — dense dead reads as brown trunk soup in eye-QA.
  if (pick < 0.04) return `tree_dead_${Math.floor(hash2(x, y, 22) * TREE_DEAD_VARIANTS)}`
  if (season === "autumn") return `tree_oak_autumn_${Math.floor(pick * TREE_AUTUMN_VARIANTS)}`
  return `tree_oak_${Math.floor(pick * TREE_OAK_VARIANTS)}`
}

function wheatKey(amount: number): string {
  if (amount >= 200) return "wheat_5"
  if (amount >= 135) return "wheat_4"
  if (amount >= 100) return "wheat_3"
  if (amount >= 70) return "wheat_2"
  if (amount > 0) return "wheat_1"
  return "farmland"
}

function mountainKey(_x: number, _y: number, season: SeasonName, biome: BiomeIdT): string {
  if (season === "winter" || biome === BiomeId.alpine || biome === BiomeId.tundra) return "mountain_plateau_2"
  return "mountain_plateau"
}

/** Ground fill under a cell — never a tree/bush/flower sprite. */
export function natureGroundKey(
  terrain: number,
  amount: number,
  x: number,
  y: number,
  biome: BiomeIdT = BiomeId.grassland,
  season: SeasonName = "spring",
): string | null {
  if (!isNaturalTerrain(terrain, amount)) return null
  if (terrain === TREE || terrain === BUSH || terrain === LOOT) {
    // Same grass as the meadow — trees sit on continuous soil, not a dirt stamp.
    return natureGrassKey(biome, season, x, y)
  }
  return natureTextureKey(terrain, amount, x, y, biome, season)
}

/**
 * Semantic nature texture key for a sim terrain cell.
 * Returns null for built/human tiles so the existing renderer keeps them.
 */
export function natureTextureKey(
  terrain: number,
  amount: number,
  x: number,
  y: number,
  biome: BiomeIdT = BiomeId.grassland,
  season: SeasonName = "spring",
): string | null {
  if (!isNaturalTerrain(terrain, amount)) return null

  if (terrain === GRASS) return natureGrassKey(biome, season, x, y)
  if (terrain === DIRT) return "grass_grazed"
  if (terrain === SAND) return "sand"
  if (terrain === FIELD) return "farmland"
  if (terrain === WHEAT) return wheatKey(amount)
  if (terrain === WATER) {
    if (biome === BiomeId.ocean) return "water_deep"
    if (biome === BiomeId.wetland || biome === BiomeId.coastal) return "water_shallow"
    return "water"
  }
  if (terrain === STONE) return "mountain_plateau"
  if (terrain === MOUNTAIN) return mountainKey(x, y, season, biome)
  if (terrain === TREE) return treeKey(biome, season, x, y)
  if (terrain === BUSH) return "berry_bush"
  if (terrain === GOLD) return "ore_gold"
  if (terrain === IRON) return "ore_iron"
  if (terrain === LOOT) return hash2(x, y, 11) > 0.5 ? "fallen_log" : "rock"
  return "grass"
}

export function natureGroundUnderProp(terrain: number, biome: BiomeIdT, season: SeasonName, x: number, y: number): string {
  return natureGrassKey(biome, season, x, y)
}