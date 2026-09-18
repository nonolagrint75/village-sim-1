/**
 * Succession civil staging - local types only (no core imports).
 * Life focus: **Alena** (contested heir -> factions -> civil war -> rewards). Soft tag.
 *
 * Causal chain:
 * ruler death / weak heir -> contested succession -> rival claimants ->
 * merchant alliance pick side -> civil war -> winner rewards -> multigen claim memory.
 */

export type ActorId = number
export type PolityId = number
export type VillageId = number
export type WarId = string
export type CrisisId = string
export type FirmId = number

export type SuccessionLifeTag = 'Alena' | 'generic'

export type SuccessionPhase =
  | 'latent'
  | 'contested'
  | 'alliances'
  | 'civil_war'
  | 'resolved'
  | 'collapsed'

export type SuccessionEventKind =
  | 'crisis_opened'
  | 'claimant_joined'
  | 'faction_formed'
  | 'merchant_alliance'
  | 'civil_war_ignited'
  | 'battle_pulse'
  | 'war_resolved'
  | 'political_reward'
  | 'claim_memory'

export type RewardKind = 'land' | 'office' | 'amnesty' | 'title' | 'none'

export interface SuccessionEvent {
  kind: SuccessionEventKind
  tick: number
  crisisId: CrisisId
  actorId?: ActorId
  amount?: number
  note?: string
}

export interface ClaimantProfile {
  actorId: ActorId
  lifeTag: SuccessionLifeTag
  kinshipToRuler: number
  ambition: number
  militaryPull: number
  wealth: number
  support: number
}

export interface SuccessionFaction {
  id: string
  label: string
  claimantId: ActorId
  memberIds: ActorId[]
  strength: number
}

export interface MerchantAlly {
  actorId: ActorId
  firmId: FirmId | null
  goldPledge: number
  sideActorId: ActorId
}

export interface PoliticalReward {
  actorId: ActorId
  kind: RewardKind
  amount: number
  note: string
}

export interface SuccessionCrisis {
  id: CrisisId
  polityId: PolityId
  villageId: VillageId
  phase: SuccessionPhase
  openedTick: number
  deadRulerId: ActorId
  designatedHeirId: ActorId | null
  claimants: ClaimantProfile[]
  factions: SuccessionFaction[]
  merchantAllies: MerchantAlly[]
  warId: WarId | null
  winnerId: ActorId | null
  rewards: PoliticalReward[]
  claimMemory: string[]
  splitPressure: number
  events: SuccessionEvent[]
}

export interface SuccessionTickContext {
  tick: number
  roll: number
  warHeat?: number
  foodStress?: number
}