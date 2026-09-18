/**
 * Ground items (§57) — staging types only.
 * Names aligned with live LOOT terrain, wood piles (DIRT/GRASS+amount),
 * inventory ResourceType ids, and snapshot ActorGroundItem — no core imports.
 */

export type ToolTier = 'none' | 'wood' | 'stone' | 'iron'

/** Soft life tag for probes — never a day-timer biography. */
export type GroundLifeTag = 'Soare' | 'generic'

/**
 * Visual / sim kind for a pile on the ground.
 * Prefer mapping onto existing terrain channels where possible:
 * - wood → isWoodPile (DIRT/GRASS + amount)
 * - loot_goods / bag / coin → LOOT + amount
 * - food / ore / tool_discard → staged entity until integrator upgrades LOOT
 */
export type GroundItemKind =
  | 'wood_pile'
  | 'food_pile'
  | 'ore_pile'
  | 'tool_discard'
  | 'bag'
  | 'loot_goods'
  | 'coin_spill'
  | 'trade_crate'

export type GroundSource =
  | 'work_chop'
  | 'work_clear'
  | 'work_mine'
  | 'work_harvest'
  | 'work_craft'
  | 'combat_death'
  | 'raid_drop'
  | 'trade_spill'
  | 'haul_abandon'
  | 'decay_split'

export type GroundVisualEventKind =
  | 'item_dropped'
  | 'item_picked'
  | 'item_decayed'
  | 'item_merged'
  | 'pile_grew'
  | 'tool_left'

export interface CellRef {
  x: number
  y: number
}

/**
 * One complete ground object (not a flower stamp).
 * Integrator may fold wood_pile into grid amount; others stay in a registry
 * until LOOT is typed or a parallel overlay list exists.
 */
export interface GroundItem {
  id: string
  x: number
  y: number
  kind: GroundItemKind
  /** Resource id string compatible with live ResourceType (food, wood, iron…). */
  resource: string
  amount: number
  source: GroundSource
  /** Actor who dropped / caused (death, spill, chop). */
  actorId: number | null
  villageId: number | null
  droppedTick: number
  lastTouchTick: number
  /** Soft freshness 0..1 — decay drives this down; pickup resets. */
  freshness: number
  /** Tool tier when kind === tool_discard. */
  toolTier: ToolTier | null
  lifeTag: GroundLifeTag
}

export interface GroundVisualEvent {
  kind: GroundVisualEventKind
  tick: number
  itemId?: string
  actorId?: number
  villageId?: number | null
  x: number
  y: number
  itemKind?: GroundItemKind
  resource?: string
  amount?: number
  /** Soft intensity 0..1 for prop scale / glow. */
  intensity?: number
  note?: string
}

export interface GroundItemsBag {
  items: GroundItem[]
  events: GroundVisualEvent[]
  nextId: number
}

export function createGroundItemsBag(): GroundItemsBag {
  return { items: [], events: [], nextId: 1 }
}

/** Decay half-life hints (ticks) — integrator maps to sim tick rate. */
export const GROUND_DECAY_TICKS: Record<GroundItemKind, number> = {
  wood_pile: 8000,
  food_pile: 2400,
  ore_pile: 12000,
  tool_discard: 6000,
  bag: 5000,
  loot_goods: 4000,
  coin_spill: 10000,
  trade_crate: 7000,
}

/** Max amount before merge / spill to neighbour (anti-toy pile). */
export const GROUND_MERGE_CAP: Record<GroundItemKind, number> = {
  wood_pile: 24,
  food_pile: 12,
  ore_pile: 18,
  tool_discard: 1,
  bag: 8,
  loot_goods: 16,
  coin_spill: 40,
  trade_crate: 20,
}
