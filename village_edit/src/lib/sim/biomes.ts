/**
 * Shared Earth-like biome IDs + livelihood / fauna profiles.
 *
 * Canonical module for climate-ecology and world-engine map gen:
 * classify from T / moisture / elevation / coast, then read multipliers.
 * No sci-fi biomes — Holdridge-ish bands only.
 */

import type { GatherSource } from './resources'

/** Stable numeric IDs for coarse climate lattice / future map layers. */
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

export const BIOME_COUNT = 11

export type FaunaKind = 'wolf' | 'sheep' | 'horse'

export interface BiomeSamples {
  tempC: number
  moisture: number
  elev01: number
  coast01: number
  /** Fraction of water in the climate cell (0..1). */
  waterFrac: number
}

export interface BiomeProfile {
  id: BiomeId
  labelFr: string
  /** Forage / berry urge + yield soft scale. */
  forage: number
  /** Wild game / capture / hunt extras. */
  hunt: number
  /** Field growth + sow attractiveness. */
  farm: number
  /** Timber gather attractiveness / expected trees. */
  wood: number
  /** Shore / boat fishing catch scale. */
  fish: number
  /** Soft disease pressure (wetlands higher, arid lower). */
  disease: number
  /** Expected bush / tree stocks for ecology carrying capacity. */
  expectedBush: number
  expectedTree: number
  expectedCrop: number
  /** Relative spawn weights (rejection sampling). */
  wolf: number
  sheep: number
  horse: number
  /** Climate moisture proxy 0–1 (coarse lattice). */
  moistureProxy: number
  /** Static air-temperature offset °C (tundra / alpine colder). */
  tempOffsetC: number
  /** Extra outdoor cold stress 0–1 (clo / warmth drain). */
  coldBias: number
  /** Construction material soft bias. */
  woodBias: number
  stoneBias: number
}

const P = (
  id: BiomeId,
  labelFr: string,
  m: Omit<BiomeProfile, 'id' | 'labelFr'>,
): BiomeProfile => ({ id, labelFr, ...m })

/**
 * Per-biome livelihood + fauna. Values are soft multipliers around 1.0
 * (desert forage ≪ boreal hunt ≪ coastal fish, etc.).
 */
export const BIOME_PROFILES: readonly BiomeProfile[] = [
  P(BiomeId.ocean, 'océan', {
    forage: 0.05,
    hunt: 0.2,
    farm: 0.05,
    wood: 0.05,
    fish: 1.65,
    disease: 0.9,
    expectedBush: 0.5,
    expectedTree: 0.2,
    expectedCrop: 0.2,
    wolf: 0.05,
    sheep: 0.05,
    horse: 0.05,
    moistureProxy: 1,
    tempOffsetC: 0,
    coldBias: 0.02,
    woodBias: 0.3,
    stoneBias: 0.3,
  }),
  P(BiomeId.coastal, 'côte', {
    forage: 0.75,
    hunt: 0.7,
    farm: 0.9,
    wood: 0.55,
    fish: 1.75,
    disease: 1.08,
    expectedBush: 7,
    expectedTree: 4,
    expectedCrop: 5,
    wolf: 0.45,
    sheep: 0.55,
    horse: 0.5,
    moistureProxy: 0.72,
    tempOffsetC: 0.5,
    coldBias: 0.04,
    woodBias: 0.4,
    stoneBias: 0.55,
  }),
  P(BiomeId.desert, 'désert / semi-aride', {
    forage: 0.28,
    hunt: 0.32,
    farm: 0.18,
    wood: 0.12,
    fish: 0.25,
    disease: 0.72,
    expectedBush: 3,
    expectedTree: 1.2,
    expectedCrop: 2,
    wolf: 0.18,
    sheep: 0.22,
    horse: 0.35,
    moistureProxy: 0.14,
    tempOffsetC: 4.5,
    coldBias: 0.04,
    woodBias: 0.2,
    stoneBias: 0.75,
  }),
  P(BiomeId.scrub, 'garrigue méditerranéenne', {
    forage: 0.7,
    hunt: 0.75,
    farm: 0.55,
    wood: 0.4,
    fish: 0.45,
    disease: 0.88,
    expectedBush: 8,
    expectedTree: 3.5,
    expectedCrop: 3.5,
    wolf: 0.55,
    sheep: 0.85,
    horse: 0.9,
    moistureProxy: 0.38,
    tempOffsetC: 2.5,
    coldBias: 0.02,
    woodBias: 0.42,
    stoneBias: 0.62,
  }),
  P(BiomeId.grassland, 'prairie', {
    forage: 1.05,
    hunt: 1.15,
    farm: 1.28,
    wood: 0.55,
    fish: 0.55,
    disease: 0.95,
    expectedBush: 9,
    expectedTree: 4,
    expectedCrop: 8,
    wolf: 0.75,
    sheep: 1.45,
    horse: 1.7,
    moistureProxy: 0.48,
    tempOffsetC: 0.5,
    coldBias: 0.03,
    woodBias: 0.35,
    stoneBias: 0.45,
  }),
  P(BiomeId.savanna, 'savane / steppe chaude', {
    forage: 0.85,
    hunt: 1.2,
    farm: 0.82,
    wood: 0.45,
    fish: 0.4,
    disease: 1.12,
    expectedBush: 7,
    expectedTree: 3,
    expectedCrop: 5,
    wolf: 0.7,
    sheep: 1.1,
    horse: 1.55,
    moistureProxy: 0.32,
    tempOffsetC: 3,
    coldBias: 0.03,
    woodBias: 0.3,
    stoneBias: 0.5,
  }),
  P(BiomeId.temperateForest, 'forêt tempérée', {
    forage: 1.2,
    hunt: 1.25,
    farm: 1.05,
    wood: 1.35,
    fish: 0.7,
    disease: 1.0,
    expectedBush: 11,
    expectedTree: 11,
    expectedCrop: 6,
    wolf: 1.15,
    sheep: 1.2,
    horse: 0.75,
    moistureProxy: 0.72,
    tempOffsetC: 0,
    coldBias: 0.02,
    woodBias: 0.72,
    stoneBias: 0.38,
  }),
  P(BiomeId.boreal, 'taïga', {
    forage: 0.88,
    hunt: 1.55,
    farm: 0.52,
    wood: 1.45,
    fish: 0.65,
    disease: 0.92,
    expectedBush: 8,
    expectedTree: 13,
    expectedCrop: 3.5,
    wolf: 1.75,
    sheep: 1.5,
    horse: 0.4,
    moistureProxy: 0.62,
    tempOffsetC: -4,
    coldBias: 0.22,
    woodBias: 0.68,
    stoneBias: 0.4,
  }),
  P(BiomeId.tundra, 'toundra', {
    forage: 0.48,
    hunt: 0.9,
    farm: 0.15,
    wood: 0.22,
    fish: 0.55,
    disease: 0.82,
    expectedBush: 5.5,
    expectedTree: 1.5,
    expectedCrop: 1.5,
    wolf: 0.95,
    sheep: 0.7,
    horse: 0.18,
    moistureProxy: 0.35,
    tempOffsetC: -8,
    coldBias: 0.38,
    woodBias: 0.18,
    stoneBias: 0.7,
  }),
  P(BiomeId.alpine, 'alpin', {
    forage: 0.4,
    hunt: 0.65,
    farm: 0.22,
    wood: 0.35,
    fish: 0.3,
    disease: 0.78,
    expectedBush: 4,
    expectedTree: 3,
    expectedCrop: 2,
    wolf: 0.55,
    sheep: 0.5,
    horse: 0.25,
    moistureProxy: 0.4,
    tempOffsetC: -6.5,
    coldBias: 0.3,
    woodBias: 0.28,
    stoneBias: 0.82,
  }),
  P(BiomeId.wetland, 'marais / vallée humide', {
    forage: 1.25,
    hunt: 0.95,
    farm: 0.95,
    wood: 0.85,
    fish: 1.35,
    disease: 1.32,
    expectedBush: 12,
    expectedTree: 6,
    expectedCrop: 7,
    wolf: 0.5,
    sheep: 0.55,
    horse: 0.35,
    moistureProxy: 0.9,
    tempOffsetC: -0.5,
    coldBias: 0.12,
    woodBias: 0.45,
    stoneBias: 0.4,
  }),
]

const BY_ID: BiomeProfile[] = []
for (const p of BIOME_PROFILES) BY_ID[p.id] = p

export function biomeProfile(id: BiomeId): BiomeProfile {
  return BY_ID[id] ?? BY_ID[BiomeId.grassland]!
}

/** Map-gen vegetation hooks used by world.ts (derived from livelihood profile). */
export type BiomeMapDef = BiomeProfile & {
  sandChance: number
  treeDensity: number
  bushDensity: number
  treeAmount: number
  bushAmount: number
}

export function biomeDef(id: BiomeId): BiomeMapDef {
  const p = biomeProfile(id)
  const sandChance =
    id === BiomeId.desert
      ? 0.45
      : id === BiomeId.coastal || id === BiomeId.scrub || id === BiomeId.savanna
        ? 0.22
        : id === BiomeId.tundra
          ? 0.08
          : 0.03
  // Tundra: almost no canopy; boreal/forest denser.
  const treeDensity =
    id === BiomeId.tundra
      ? 0.04
      : id === BiomeId.desert
        ? 0.06
        : Math.max(0, Math.min(0.92, p.expectedTree / 22))
  const bushDensity =
    id === BiomeId.tundra
      ? 0.2
      : Math.max(0, Math.min(0.85, p.expectedBush / 22))
  return {
    ...p,
    sandChance,
    treeDensity,
    bushDensity,
    treeAmount: Math.max(5, 8 + Math.round(p.wood * 5)),
    bushAmount: Math.max(4, 5 + Math.round(p.forage * 4)),
  }
}

/** Unclassified marker for ocean / unset map cells. */
export const BIOME_NONE = BiomeId.ocean

export function biomeLabelFr(id: BiomeId): string {
  return biomeProfile(id).labelFr
}

/**
 * Classify from climate samples (world-engine map gen should reuse this).
 * Priority: open water → coast → alpine → cold → arid → wet lowland → forest bands.
 */
export function classifyBiome(s: BiomeSamples): BiomeId {
  const { tempC: t, moisture: m, elev01: e, coast01: c, waterFrac: w } = s
  if (w > 0.55) return BiomeId.ocean
  if (c > 0.42 && w > 0.06) return BiomeId.coastal
  // Peaks only when cold enough — warm high plateaus stay scrub/grass instead of blanketing alpine.
  if (e > 0.92 && t < 8) return BiomeId.alpine
  if (e > 0.97 && t < 14) return BiomeId.alpine
  if (t < -4) return BiomeId.tundra
  if (t < 2 && m < 0.38) return BiomeId.tundra
  if (t < 5 && m >= 0.38) return BiomeId.boreal
  if (t > 26 && m < 0.26) return BiomeId.desert
  if (t > 22 && m < 0.38) return BiomeId.desert
  if (t > 20 && m < 0.52) return BiomeId.savanna
  if (t > 16 && m < 0.4) return BiomeId.scrub
  // River valleys / marshes: wet lowlands near water (medieval floodplains).
  if (m > 0.62 && e < 0.52 && (c > 0.1 || w > 0.03)) return BiomeId.wetland
  if (m > 0.72 && e < 0.48) return BiomeId.wetland
  if (m > 0.58 && t >= 6 && t <= 20) return BiomeId.temperateForest
  if (m > 0.5 && t > 4 && t < 14) return BiomeId.boreal
  if (m < 0.36) return BiomeId.scrub
  return BiomeId.grassland
}

/** Settlement attractiveness (founding / migration soft score). */
export function biomeSettlementScore(id: BiomeId): number {
  switch (id) {
    case BiomeId.wetland:
      return 1.2
    case BiomeId.grassland:
      return 1.15
    case BiomeId.temperateForest:
      return 1.05
    case BiomeId.coastal:
      return 0.95
    case BiomeId.scrub:
      return 0.85
    case BiomeId.savanna:
      return 0.8
    case BiomeId.boreal:
      return 0.45
    case BiomeId.alpine:
      return 0.12
    case BiomeId.desert:
      return 0.1
    case BiomeId.tundra:
      return 0.08
    case BiomeId.ocean:
      return 0.02
    default:
      return 0.35
  }
}

/** True for biomes that can sustain a Nouveau-monde temperate-ish start. */
export function biomeIsFoundable(id: BiomeId): boolean {
  return biomeSettlementScore(id) >= 0.75 && biomeProfile(id).farm >= 0.5
}

export function biomeColdBias(id: BiomeId): number {
  return biomeProfile(id).coldBias
}

export function biomeTempOffsetC(id: BiomeId): number {
  return biomeProfile(id).tempOffsetC
}

export function biomeMoistureProxy(id: BiomeId): number {
  return biomeProfile(id).moistureProxy
}

export function faunaSpawnWeight(id: BiomeId, kind: FaunaKind): number {
  const p = biomeProfile(id)
  if (kind === 'wolf') return p.wolf
  if (kind === 'sheep') return p.sheep
  return p.horse
}

/** Max fauna weight across land biomes — for rejection sampling. */
export const FAUNA_WEIGHT_MAX: Record<FaunaKind, number> = {
  wolf: 1.75,
  sheep: 1.5,
  horse: 1.7,
}

export function livelihoodMul(
  id: BiomeId,
): Pick<BiomeProfile, 'forage' | 'hunt' | 'farm' | 'wood' | 'fish' | 'disease'> {
  const p = biomeProfile(id)
  return {
    forage: p.forage,
    hunt: p.hunt,
    farm: p.farm,
    wood: p.wood,
    fish: p.fish,
    disease: p.disease,
  }
}

/** Soft gather-extra chance scale by source (coastal fish, tundra shrubs, scarce desert game). */
export function biomeGatherChanceScale(id: BiomeId, source: GatherSource): number {
  const p = biomeProfile(id)
  switch (source) {
    case 'bush':
      return p.forage
    case 'tree':
      return p.wood
    case 'fish':
      return p.fish
    case 'hunt':
    case 'sheep':
      return p.hunt
    case 'stone':
      return id === BiomeId.desert || id === BiomeId.alpine ? 1.15 : id === BiomeId.wetland ? 0.85 : 1
    default:
      return 1
  }
}

/** Terrain channel groups for orbit / close-up color modulation. */
export type BiomeTintKind = 'grass' | 'tree' | 'bush' | 'water' | 'sand' | 'dirt' | 'mountain' | 'stone'

/**
 * Per-biome RGB multipliers + frost lift so ground reads differently at a glance
 * without new sprite packs (applied over existing tileArt bases).
 */
export interface BiomeVisual {
  grass: readonly [number, number, number]
  tree: readonly [number, number, number]
  bush: readonly [number, number, number]
  water: readonly [number, number, number]
  sand: readonly [number, number, number]
  dirt: readonly [number, number, number]
  mountain: readonly [number, number, number]
  stone: readonly [number, number, number]
  /** 0..1 pale frost toward cold white-blue. */
  frost: number
}

const V = (
  grass: readonly [number, number, number],
  tree: readonly [number, number, number],
  bush: readonly [number, number, number],
  water: readonly [number, number, number],
  sand: readonly [number, number, number],
  dirt: readonly [number, number, number],
  mountain: readonly [number, number, number],
  stone: readonly [number, number, number],
  frost: number,
): BiomeVisual => ({ grass, tree, bush, water, sand, dirt, mountain, stone, frost })

/** Distinct satellite palettes keyed by BiomeId. */
export const BIOME_VISUAL: readonly BiomeVisual[] = (() => {
  const list: BiomeVisual[] = new Array(BIOME_COUNT)
  list[BiomeId.ocean] = V(
    [0.7, 0.95, 1.05],
    [0.7, 0.9, 1.0],
    [0.7, 0.9, 1.0],
    [0.72, 0.88, 1.22],
    [0.95, 1.0, 1.08],
    [0.85, 0.9, 1.0],
    [0.9, 0.95, 1.05],
    [0.9, 0.95, 1.05],
    0.04,
  )
  list[BiomeId.coastal] = V(
    [0.82, 1.08, 1.12],
    [0.88, 1.05, 1.02],
    [0.85, 1.08, 1.0],
    [0.78, 1.08, 1.22],
    [1.08, 1.02, 0.92],
    [0.95, 0.98, 1.02],
    [0.95, 0.98, 1.05],
    [0.95, 0.98, 1.05],
    0.02,
  )
  list[BiomeId.desert] = V(
    [1.42, 1.18, 0.62],
    [1.22, 1.02, 0.58],
    [1.28, 1.08, 0.62],
    [0.88, 1.12, 1.08],
    [1.14, 1.06, 0.82],
    [1.18, 1.08, 0.78],
    [1.08, 1.0, 0.88],
    [1.05, 0.98, 0.88],
    0,
  )
  list[BiomeId.scrub] = V(
    [1.22, 1.1, 0.7],
    [1.12, 0.98, 0.68],
    [1.15, 1.02, 0.7],
    [0.9, 1.05, 1.05],
    [1.1, 1.04, 0.86],
    [1.12, 1.05, 0.82],
    [1.02, 0.98, 0.9],
    [1.0, 0.96, 0.9],
    0,
  )
  list[BiomeId.grassland] = V(
    [1.08, 1.18, 0.68],
    [0.95, 1.12, 0.82],
    [1.0, 1.14, 0.78],
    [0.92, 1.02, 1.08],
    [1.05, 1.02, 0.9],
    [1.02, 1.0, 0.9],
    [0.98, 0.98, 0.95],
    [0.98, 0.98, 0.95],
    0,
  )
  list[BiomeId.savanna] = V(
    [1.32, 1.16, 0.58],
    [1.1, 0.98, 0.65],
    [1.18, 1.02, 0.65],
    [0.95, 1.05, 1.0],
    [1.12, 1.05, 0.8],
    [1.15, 1.06, 0.78],
    [1.05, 0.98, 0.88],
    [1.02, 0.96, 0.88],
    0,
  )
  list[BiomeId.temperateForest] = V(
    [0.82, 1.16, 0.82],
    [0.7, 1.18, 0.75],
    [0.78, 1.14, 0.72],
    [0.88, 1.02, 1.1],
    [0.98, 1.0, 0.95],
    [0.95, 1.0, 0.9],
    [0.95, 0.98, 0.95],
    [0.95, 0.98, 0.95],
    0,
  )
  list[BiomeId.boreal] = V(
    [0.68, 0.95, 0.92],
    [0.52, 0.82, 0.72],
    [0.6, 0.88, 0.78],
    [0.72, 0.9, 1.15],
    [0.95, 0.98, 1.02],
    [0.88, 0.92, 0.95],
    [0.92, 0.95, 1.02],
    [0.9, 0.94, 1.0],
    0.1,
  )
  list[BiomeId.tundra] = V(
    [0.98, 1.02, 1.1],
    [0.88, 0.95, 1.02],
    [0.92, 0.98, 1.05],
    [0.82, 0.95, 1.2],
    [0.98, 1.02, 1.1],
    [0.95, 0.98, 1.05],
    [1.08, 1.1, 1.18],
    [1.05, 1.08, 1.12],
    0.38,
  )
  list[BiomeId.alpine] = V(
    [0.92, 0.96, 1.02],
    [0.68, 0.82, 0.85],
    [0.75, 0.88, 0.9],
    [0.78, 0.92, 1.15],
    [0.98, 1.0, 1.05],
    [0.95, 0.96, 1.0],
    [1.12, 1.1, 1.18],
    [1.08, 1.06, 1.12],
    0.3,
  )
  list[BiomeId.wetland] = V(
    [0.72, 1.02, 0.72],
    [0.65, 0.95, 0.68],
    [0.7, 0.98, 0.7],
    [0.62, 0.92, 0.72],
    [0.9, 0.95, 0.85],
    [0.82, 0.9, 0.72],
    [0.9, 0.95, 0.9],
    [0.88, 0.92, 0.88],
    0.04,
  )
  return list
})()

export function biomeVisual(id: BiomeId): BiomeVisual {
  return BIOME_VISUAL[id] ?? BIOME_VISUAL[BiomeId.grassland]!
}

function clampByteVis(v: number) {
  return v < 0 ? 0 : v > 255 ? 255 : v | 0
}

/**
 * Modulate a packed/base RGB by biome palette. Frost lifts toward pale blue-white
 * (tundra / alpine snow cue). Returns new [r,g,b].
 */
export function applyBiomeTintRgb(
  r: number,
  g: number,
  b: number,
  id: BiomeId,
  kind: BiomeTintKind,
): [number, number, number] {
  const vis = biomeVisual(id)
  const mul = vis[kind]
  let nr = r * mul[0]
  let ng = g * mul[1]
  let nb = b * mul[2]
  const frost = vis.frost
  if (frost > 0) {
    nr += (210 - nr) * frost
    ng += (220 - ng) * frost
    nb += (235 - nb) * frost * 1.05
  }
  return [clampByteVis(nr), clampByteVis(ng), clampByteVis(nb)]
}

/** CSS `rgb()` for close-up overlays (trees, shore foam hints, etc.). */
export function biomeTintCss(
  r: number,
  g: number,
  b: number,
  id: BiomeId,
  kind: BiomeTintKind,
  alpha?: number,
): string {
  const [tr, tg, tb] = applyBiomeTintRgb(r, g, b, id, kind)
  if (alpha == null) return `rgb(${tr},${tg},${tb})`
  return `rgba(${tr},${tg},${tb},${alpha})`
}
