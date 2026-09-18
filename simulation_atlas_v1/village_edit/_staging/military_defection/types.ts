/**
 * Military defection staging — local types only (no core imports).
 * Life focus: **Jonas** (loyal soldier → defection path) / bits of **Arvid** (officer / command).
 *
 * Causal chain:
 * loyalty → friend death → supply failure → officer discontent → military faction →
 * refuse repress → civil war command → political offer choice.
 */

export type ActorId = number
export type PolityId = number
export type VillageId = number
export type FactionId = string
export type WarId = number

export type MilitaryLifeTag = 'Jonas' | 'Arvid' | 'ranker' | 'generic'

export type DefectionPhase =
  | 'loyal'
  | 'grieving'
  | 'supply_stress'
  | 'officer_discontent'
  | 'military_faction'
  | 'refuse_repress'
  | 'civil_war_command'
  | 'offer_pending'
  | 'defected'
  | 'stayed_loyal'
  | 'broken'

export type DefectionEventKind =
  | 'loyalty_noted'
  | 'friend_died'
  | 'supply_failed'
  | 'officer_discontent'
  | 'faction_formed'
  | 'refused_repress'
  | 'obeyed_repress'
  | 'civil_war_joined'
  | 'offer_made'
  | 'offer_accepted'
  | 'offer_rejected'
  | 'defected'
  | 'remained'

export type PoliticalOfferKind =
  | 'amnesty'
  | 'promotion'
  | 'land'
  | 'rival_command'
  | 'exile'

export interface DefectionEvent {
  kind: DefectionEventKind
  tick: number
  factionId: FactionId
  actorId?: ActorId
  amount?: number
  note?: string
}

export interface SoldierProfile {
  actorId: ActorId
  polityId: PolityId | null
  villageId: VillageId | null
  lifeTag: MilitaryLifeTag
  /** beliefs.loyalty / creed protection 0–1. */
  loyalty: number
  /** Combat / threat circle cohesion. */
  unitCohesion: number
  /** Officer vs ranker. */
  isOfficer: boolean
  /** Personal supply / food / gear 0–1. */
  supply: number
  grievance: number
}

export interface FriendDeathHint {
  victimId: ActorId
  witnessId: ActorId
  tick: number
  /** Same unit / relation strength 0–1. */
  bond: number
  cause: 'battle' | 'repression' | 'bandit' | 'other'
}

export interface SupplyHint {
  polityId: PolityId
  tick: number
  /** 0–1 stocked (food, weapons, pay). */
  supplyLevel: number
  /** Days-equivalent stress already felt. */
  shortfall: number
}

export interface RepressOrderHint {
  polityId: PolityId
  tick: number
  /** Target movement / village / circle soft ref. */
  targetRef: string
  /** Ordered force 0–1. */
  force: number
  /** Issuer legitimacy 0–1. */
  issuerLegitimacy: number
}

export interface PoliticalOffer {
  kind: PoliticalOfferKind
  fromPolityId: PolityId
  toFactionId: FactionId
  tick: number
  /** Soft value 0–1. */
  attractiveness: number
  note?: string
}

export interface MilitaryFaction {
  id: FactionId
  polityId: PolityId
  phase: DefectionPhase
  formedTick: number
  leaderId: ActorId | null
  /** Jonas-like emotional core. */
  coreSoldierId: ActorId | null
  /** Arvid-like officer. */
  officerId: ActorId | null
  memberIds: ActorId[]
  loyaltyMean: number
  supplyStress: number
  griefHeat: number
  discontent: number
  /** Soft war id when civil war command engages. */
  warId: WarId | null
  pendingOffer: PoliticalOffer | null
  events: DefectionEvent[]
}

export interface DefectionTickContext {
  tick: number
  roll: number
  warHeat?: number
}