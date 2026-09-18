/**
 * Merchant network staging - local types only (no core imports).
 * Life focus: **Eren** (~39y farmer->trader->network->guild path). Soft tag, not a day bio.
 *
 * Causal chain:
 * farm surplus -> trade switch -> horse -> grain arbitrage -> hire -> merchant marriage ->
 * firm succession -> trade guild -> multi-town network -> child career diverge.
 */

export type ActorId = number
export type VillageId = number
export type FirmId = number
export type CircleId = number
export type NetworkId = string
export type EdgeId = string

export type MerchantLifeTag = 'Eren' | 'Mira' | 'generic'

export type MerchantPhase =
  | 'farmer'
  | 'trader'
  | 'mobile'
  | 'arbitrage'
  | 'employer'
  | 'married_merge'
  | 'succession'
  | 'guilded'
  | 'networked'

export type MerchantEventKind =
  | 'farmer_to_trader'
  | 'horse_owned'
  | 'grain_arbitrage'
  | 'firm_hire'
  | 'merchant_marriage'
  | 'firm_succession'
  | 'guild_form'
  | 'network_edge'
  | 'child_career_diverge'

export interface MerchantEvent {
  kind: MerchantEventKind
  tick: number
  networkId: NetworkId
  actorId?: ActorId
  amount?: number
  note?: string
}

export interface TraderProfile {
  actorId: ActorId
  villageId: VillageId
  lifeTag: MerchantLifeTag
  professionHint: 'farmer' | 'trader' | 'other'
  surplusGrain: number
  wealth: number
  curiosity: number
  hasHorse: boolean
  firmId: FirmId | null
  spouseId: ActorId | null
  childIds: ActorId[]
  /** Soft age years for probe tags (Eren ~39); not a scripted bio clock. */
  ageYears?: number
}

export interface NetworkEdge {
  id: EdgeId
  fromVillageId: VillageId
  toVillageId: VillageId
  goodId: string
  volume: number
  profitIndex: number
  formedTick: number
}

export interface MerchantNode {
  actorId: ActorId
  lifeTag: MerchantLifeTag
  phase: MerchantPhase
  firmId: FirmId | null
  guildCircleId: CircleId | null
  hiredCount: number
  marriageMerged: boolean
  successionDone: boolean
}

export interface MerchantNetworkState {
  id: NetworkId
  nodes: MerchantNode[]
  edges: NetworkEdge[]
  events: MerchantEvent[]
  formedTick: number
}

export interface MerchantTickContext {
  tick: number
  roll: number
  priceGapHint?: number
}