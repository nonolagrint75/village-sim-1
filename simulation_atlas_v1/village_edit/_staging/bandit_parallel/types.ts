/**
 * Bandit parallel-economy staging types — local only (no core imports).
 * Life types: **Daren** (ambush organizer → gang → bounty → deal/fight/flee),
 * **Kael** (zone control → faction deal → military force / death / political integration).
 */

export type ActorId = number
export type VillageId = number
export type GangId = string
export type BountyId = string

export type BanditLifeTag = 'Daren' | 'Kael' | 'generic'

export type GangRole = 'recruit' | 'thief' | 'ambusher' | 'lieutenant' | 'chief'
export type GangPhase =
  | 'forming'
  | 'petty'
  | 'raiding'
  | 'established'
  | 'hunted'
  | 'negotiating'
  | 'allied'
  | 'integrated'
  | 'scattered'
  | 'destroyed'

export type EncounterChoice = 'negotiate' | 'fight' | 'flee'
export type BranchOutcome =
  | 'flee_success'
  | 'flee_caught'
  | 'fight_win'
  | 'fight_lose_dead'
  | 'fight_lose_captured'
  | 'negotiate_truce'
  | 'negotiate_faction_deal'
  | 'political_integration'
  | 'military_force'
  | 'ongoing'

export type BanditEventKind =
  | 'recruited'
  | 'promoted'
  | 'theft'
  | 'ambush'
  | 'loot'
  | 'gang_grew'
  | 'bounty_posted'
  | 'hunt_started'
  | 'encounter'
  | 'faction_deal'
  | 'integrated'
  | 'member_dead'
  | 'gang_destroyed'
  | 'parallel_sale'

export interface BanditEvent {
  kind: BanditEventKind
  tick: number
  gangId: GangId
  actorId?: ActorId
  amount?: number
  note?: string
}

/** Poverty → migration → unemployment pressure (integrator fills from sim). */
export interface OutlawPressure {
  poverty: number
  unemployment: number
  migrationUrge: number
  foodInsecurity: number
  villageSecurity: number
  harvestShock: number
  debtPressure: number
}

export interface OutlawCandidate {
  actorId: ActorId
  villageId: VillageId | null
  lifeTag: BanditLifeTag
  /** Impulsive / robust / distrustful soft traits 0–1. */
  impulsivity: number
  robustness: number
  distrust: number
  wealth: number
  employed: boolean
  pressure: OutlawPressure
}

export interface GangMember {
  actorId: ActorId
  lifeTag: BanditLifeTag
  role: GangRole
  /** Ambush organization skill 0–1 (Daren/Kael specialty). */
  ambushSkill: number
  loyalty: number
  joinedTick: number
  alive: boolean
}

export interface LootPile {
  food: number
  coin: number
  goods: number
}

export interface Bounty {
  id: BountyId
  gangId: GangId
  targetActorId: ActorId | null
  amount: number
  postedTick: number
  active: boolean
  hunterAuthorityId: string | null
}

export interface FactionDeal {
  factionId: string
  gangId: GangId
  tick: number
  /** Protection / intel for coin. */
  protection: number
  intel: number
  coinPaid: number
  hostileToAuthority: boolean
}

export interface ParallelMarket {
  /** Black-market food sold back into settlements. */
  foodMoved: number
  coinMoved: number
  localSupport: number
  localHate: number
}

/**
 * Emergent gang — parallel to core Band/Bandit but richer hierarchy + politics.
 * Integrator may sync memberIds with state.bandits or keep separate then merge.
 */
export interface ParallelGang {
  id: GangId
  name: string
  phase: GangPhase
  villageOriginId: VillageId | null
  campX: number
  campY: number
  formedTick: number
  members: GangMember[]
  chiefId: ActorId | null
  loot: LootPile
  notoriety: number
  zoneControl: number
  parallel: ParallelMarket
  bounties: Bounty[]
  deals: FactionDeal[]
  lastAmbushTick: number
  raids: number
  events: BanditEvent[]
}

export interface AmbushTarget {
  kind: 'traveler' | 'caravan' | 'village_edge'
  wealth: number
  escortStrength: number
  ref?: string
}

export interface AuthorityHunt {
  authorityId: string
  strength: number
  tick: number
}

export interface EncounterContext {
  tick: number
  gang: ParallelGang
  hunt: AuthorityHunt | null
  factionOffer: { factionId: string; coin: number; protection: number } | null
  roll: number
}

export interface EncounterResult {
  choice: EncounterChoice
  outcome: BranchOutcome
  note: string
}
