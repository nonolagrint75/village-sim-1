/**
 * Extraction / discovery constants — naming mirrors core mining.ts where possible.
 */

export const TUNNEL_ENTRANCE_AMOUNT = 1
export const MOUNTAIN_DIG_HP_MIN = 5
export const MOUNTAIN_DIG_HP_MAX = 14
export const DIG_HITS_PER_SESSION = 3
export const DIG_TILES_PER_SESSION = 2
export const DIG_STAMINA_MULT = 1.35
export const PROSPECT_RADIUS = 18
export const PROSPECT_RICHNESS_FLOOR = 8
export const PROSPECT_BASE_CHANCE = 0.12
export const MOUTH_STICKY = true
export const FORGE_STOCK_THRESHOLD = 6
export const FORGE_DEMAND_RADIUS = 14
export const MAX_PENDING_EVENTS = 64
export const DEPLETED_METAL_FLOOR = 0.5

/** Richness weights — mirrors mining.localOreRichness. */
export const RICHNESS_WEIGHTS = {
  iron: 1,
  gold: 2.2,
  copper: 0.7,
  tin: 0.9,
  silver: 1.8,
  coal: 0.5,
  lead: 0.4,
  stone: 0,
} as const