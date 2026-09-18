/**
 * Mines / ore staging types (self-contained).
 * Naming aligned with core src/lib/sim/mining.ts + Village.hasMine/mineX/mineY.
 * No day-timer biography scripts — soft life-type tags only.
 */

export type OreKind =
  | 'iron'
  | 'gold'
  | 'copper'
  | 'tin'
  | 'lead'
  | 'silver'
  | 'coal'
  | 'stone'

/** Soft life-type tag for probes — never a day-timer biography script. */
export type MineLifeTag = 'Soare' | 'generic'

export type ToolTier = 'none' | 'wood' | 'stone' | 'iron'

export type MouthStatus = 'prospect' | 'claimed' | 'open' | 'active' | 'depleted' | 'abandoned'

export type VeinKnowledgeStatus = 'rumor' | 'confirmed' | 'exhausted'

export type MineVisualEventKind =
  | 'mouth_opened'
  | 'mouth_depleted'
  | 'active_dig'
  | 'vein_discovered'
  | 'forge_demand'
  | 'stock_threshold'

export interface CellRef {
  x: number
  y: number
}

export interface OreAmounts {
  iron: number
  gold: number
  copper: number
  tin: number
  lead: number
  silver: number
  coal: number
  stone: number
}

export function emptyOreAmounts(): OreAmounts {
  return { iron: 0, gold: 0, copper: 0, tin: 0, lead: 0, silver: 0, coal: 0, stone: 0 }
}

export function cloneOreAmounts(a: OreAmounts): OreAmounts {
  return { ...a }
}

export function addOreAmounts(into: OreAmounts, add: Partial<OreAmounts>): OreAmounts {
  into.iron += add.iron ?? 0
  into.gold += add.gold ?? 0
  into.copper += add.copper ?? 0
  into.tin += add.tin ?? 0
  into.lead += add.lead ?? 0
  into.silver += add.silver ?? 0
  into.coal += add.coal ?? 0
  into.stone += add.stone ?? 0
  return into
}

export function sumOre(amounts: OreAmounts, excludeStone = false): number {
  let s = amounts.iron + amounts.gold + amounts.copper + amounts.tin + amounts.lead + amounts.silver + amounts.coal
  if (!excludeStone) s += amounts.stone
  return s
}

export const METAL_ORE_KINDS: readonly Exclude<OreKind, 'stone'>[] = [
  'iron', 'gold', 'copper', 'tin', 'lead', 'silver', 'coal',
] as const

export interface DepositSample {
  x: number
  y: number
  amounts: OreAmounts
  digHp: number
  diggable: boolean
  isEntrance: boolean
}

export interface KnownMineMouth {
  id: string
  villageId: number | null
  x: number
  y: number
  mountainX: number
  mountainY: number
  status: MouthStatus
  discoveredTick: number
  openedTick: number | null
  lastDigTick: number | null
  knownBy: number[]
  veinRemaining: OreAmounts
  stockpile: OreAmounts
  lifetimeExtracted: OreAmounts
  primaryOre: OreKind
  lifeTag: MineLifeTag
}

export interface VeinKnowledge {
  id: string
  actorId: number
  villageId: number | null
  x: number
  y: number
  richness: number
  primaryOre: OreKind
  status: VeinKnowledgeStatus
  discoveredTick: number
  confidence: number
  lifeTag: MineLifeTag
}

export interface ForgeDemandSignal {
  mouthId: string
  villageId: number | null
  x: number
  y: number
  demand: number
  radius: number
  primaryOre: OreKind
  oreStock: number
  tick: number
  reason: 'ore_stock' | 'active_mine' | 'no_nearby_forge' | 'smith_shortage'
}

export interface MineVisualEvent {
  kind: MineVisualEventKind
  tick: number
  mouthId?: string
  veinId?: string
  actorId?: number
  villageId?: number | null
  x: number
  y: number
  ore?: OreKind
  amount?: number
  intensity?: number
  note?: string
}

export interface ExtractionResult {
  mouthId: string
  actorId: number
  x: number
  y: number
  dug: OreAmounts
  spoil: number
  openedMouth: boolean
  depleted: boolean
  digHpRemaining: number
  staminaCost: number
}

export interface MinesOreBag {
  mouths: KnownMineMouth[]
  veins: VeinKnowledge[]
  events: MineVisualEvent[]
  forgeSignals: ForgeDemandSignal[]
  nextMouthId: number
  nextVeinId: number
}

export function createMinesOreBag(): MinesOreBag {
  return { mouths: [], veins: [], events: [], forgeSignals: [], nextMouthId: 1, nextVeinId: 1 }
}

export function canMineRock(tier: ToolTier): boolean {
  return tier === 'stone' || tier === 'iron'
}