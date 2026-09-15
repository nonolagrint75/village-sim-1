/**
 * Biome orbit/close-up tint tables (BIOME_VISUAL).
 * Shared visual contract with biomes.ts — kept standalone so tileArt can tint
 * ground materials on nolan/ui without pulling the full ecology module.
 */

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

export type BiomeTintKind = 'grass' | 'tree' | 'bush' | 'water' | 'sand' | 'dirt' | 'mountain' | 'stone'

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

/** Modulate RGB by biome palette + optional frost lift. */
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
