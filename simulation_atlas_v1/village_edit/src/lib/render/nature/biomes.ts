/** Visual biome ids for nature textures only — not gameplay. */
export const BiomeId = {
  ocean: 0,
  coastal: 1,
  desert: 2,
  scrub: 3,
  grassland: 4,
  savanna: 5,
  temperateForest: 6,
  boreal: 7,
  tundra: 8,
  alpine: 9,
  wetland: 10,
} as const

export type BiomeId = (typeof BiomeId)[keyof typeof BiomeId]