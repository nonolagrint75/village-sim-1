/**
 * Ground items (§57) — prop recipes from nature atlas bank.
 * Compose complete sprites; do not invent a second art style.
 */

export type GroundZLayer =
  | 'terrain'
  | 'ground_scar'
  | 'ground_item'
  | 'small_plant'
  | 'prop_mid'

export interface AtlasBlit {
  /** NatureAtlas slot key (loader.ts / procedural). */
  key: string
  ox: number
  oy: number
  scale: number
  /** Optional alpha mul from freshness. */
  alphaFromFreshness?: boolean
}

export interface GroundPropRecipe {
  kind: string
  /** Footprint in cells — complete object, may overflow. */
  footprintW: number
  footprintH: number
  z: GroundZLayer
  /** Bank preference order — first available wins. */
  layers: AtlasBlit[]
  /** Fallback procedural keys always present in atlas. */
  fallbackKey: string
  notes: string
}

/**
 * Preferred bank paths (files under src/assets/nature):
 * tiles/*.png + source/block-texture-set/blocks/*.png via loader prefer().
 */
export const GROUND_PROP_RECIPES: Record<string, GroundPropRecipe> = {
  wood_pile: {
    kind: 'wood_pile',
    footprintW: 1.2,
    footprintH: 1.0,
    z: 'ground_item',
    layers: [
      { key: 'fallen_log', ox: -0.15, oy: 0.05, scale: 0.85, alphaFromFreshness: true },
      { key: 'fallen_log', ox: 0.12, oy: -0.02, scale: 0.7 },
      { key: 'tree_stump', ox: 0.0, oy: 0.1, scale: 0.35 },
    ],
    fallbackKey: 'fallen_log',
    notes: 'Stack 2 logs + stump nub; amount>8 adds third log ox jitter.',
  },
  food_pile: {
    kind: 'food_pile',
    footprintW: 1.0,
    footprintH: 0.9,
    z: 'ground_item',
    layers: [
      { key: 'hay', ox: 0, oy: 0.05, scale: 0.55, alphaFromFreshness: true },
      { key: 'wheat_3', ox: -0.1, oy: -0.05, scale: 0.4 },
      { key: 'mushroom', ox: 0.15, oy: 0.08, scale: 0.28 },
    ],
    fallbackKey: 'hay',
    notes: 'Hay mound + wheat sheaf + mushroom — not flower deco.',
  },
  ore_pile: {
    kind: 'ore_pile',
    footprintW: 1.1,
    footprintH: 1.0,
    z: 'ground_item',
    layers: [
      { key: 'pebbles', ox: 0, oy: 0.08, scale: 0.7 },
      { key: 'rock', ox: -0.08, oy: 0, scale: 0.45 },
      { key: 'ore_iron', ox: 0.1, oy: -0.05, scale: 0.4 },
    ],
    fallbackKey: 'rock',
    notes: 'Gold piles swap ore_iron→ore_gold; use cobble if ore_* missing.',
  },
  tool_discard: {
    kind: 'tool_discard',
    footprintW: 0.8,
    footprintH: 0.6,
    z: 'ground_item',
    layers: [
      { key: 'fallen_log', ox: 0.05, oy: 0.02, scale: 0.22 },
      { key: 'pebbles', ox: -0.1, oy: 0.05, scale: 0.2 },
    ],
    fallbackKey: 'pebbles',
    notes: 'Handle=thin log strip; head=pebble/stone_block tint by toolTier.',
  },
  bag: {
    kind: 'bag',
    footprintW: 0.9,
    footprintH: 0.8,
    z: 'ground_item',
    layers: [
      { key: 'dirt_dark', ox: 0, oy: 0.06, scale: 0.45, alphaFromFreshness: true },
      { key: 'hay', ox: 0, oy: -0.05, scale: 0.32 },
    ],
    fallbackKey: 'dirt_dark',
    notes: 'Sack silhouette from dirt_dark oval + hay strap — no MC chest stamp.',
  },
  loot_goods: {
    kind: 'loot_goods',
    footprintW: 1.0,
    footprintH: 0.9,
    z: 'ground_item',
    layers: [
      { key: 'plank_oak', ox: 0, oy: 0.05, scale: 0.5 },
      { key: 'fallen_log', ox: 0.12, oy: -0.02, scale: 0.3 },
    ],
    fallbackKey: 'fallen_log',
    notes: 'Replaces current LOOT rock/log coin-flip with readable goods mound.',
  },
  coin_spill: {
    kind: 'coin_spill',
    footprintW: 0.7,
    footprintH: 0.5,
    z: 'ground_item',
    layers: [
      { key: 'pebbles', ox: 0, oy: 0.04, scale: 0.35 },
      { key: 'ore_gold', ox: 0.05, oy: -0.02, scale: 0.22 },
    ],
    fallbackKey: 'pebbles',
    notes: 'Sparse gold flecks on pebbles; scale with amount.',
  },
  trade_crate: {
    kind: 'trade_crate',
    footprintW: 1.15,
    footprintH: 1.0,
    z: 'ground_item',
    layers: [
      { key: 'plank_oak', ox: 0, oy: 0.02, scale: 0.65 },
      { key: 'plank_pine', ox: 0, oy: -0.12, scale: 0.55 },
      { key: 'hay', ox: 0.05, oy: -0.18, scale: 0.25 },
    ],
    fallbackKey: 'plank_oak',
    notes: 'Crate = plank body + lid; overflow hay for grain trades.',
  },
}

/** Scale recipe by amount (1..cap) — keep silhouette complete. */
export function scaleForAmount(base: number, amount: number, cap: number): number {
  const t = Math.min(1, Math.max(0.15, amount / Math.max(1, cap)))
  return base * (0.75 + 0.45 * t)
}

/** Pseudo-API for integrator draw path (nature engine). */
export const GROUND_DRAW_PSEUDO = {
  layer: 'after terrain + small plants, before trunk/foliage',
  call: 'atlas.blit(ctx, key, px + ox*tileS, py + oy*tileS, tileS*scale, tileS*scale)',
  sortY: 'prop.gy + prop.oy (ground_item before NPCs)',
  hideBelowZoom: 0.32,
}
