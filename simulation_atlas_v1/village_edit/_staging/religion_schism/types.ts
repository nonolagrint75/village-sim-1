/**
 * Religion schism staging - local types only (no core imports).
 * Life focus: **Samir** (reinterpret -> following -> famine charity ->
 * moderates/radicals split -> regional creed). Soft tag, not day bio.
 */

export type ActorId = number
export type VillageId = number
export type CircleId = number
export type CreedId = string
export type SchismId = string

export type FaithLifeTag = 'Samir' | 'generic'

export type FaithPhase =
  | 'latent'
  | 'reinterpreted'
  | 'following'
  | 'charity'
  | 'tension'
  | 'schism'
  | 'regional'
  | 'settled'

export type FaithWing = 'moderate' | 'radical' | 'undecided'

export type FaithEventKind =
  | 'creed_reinterpreted'
  | 'faith_following'
  | 'famine_charity'
  | 'belief_tension'
  | 'faith_schism'
  | 'wing_split'
  | 'regional_creed'
  | 'settled'

export interface FaithEvent {
  kind: FaithEventKind
  tick: number
  movementId: SchismId
  actorId?: ActorId
  creedId?: CreedId
  amount?: number
  note?: string
}

export interface BelieverProfile {
  actorId: ActorId
  villageId: VillageId | null
  lifeTag: FaithLifeTag
  creedId: CreedId | null
  creedWeight: number
  piety: number
  tradition: number
  grievance: number
  charityGiven: number
}

export interface FamineCharityHint {
  villageId: VillageId
  hunger: number
  foodShared: number
  tick: number
}

export interface FaithWingState {
  wing: FaithWing
  memberIds: ActorId[]
  creedId: CreedId
  heat: number
}

export interface FaithMovement {
  id: SchismId
  villageId: VillageId
  phase: FaithPhase
  formedTick: number
  reformerId: ActorId
  parentCreedId: CreedId
  reformCreedId: CreedId
  parentCircleId: CircleId | null
  schismCircleId: CircleId | null
  followerIds: ActorId[]
  rivalIds: ActorId[]
  following: number
  tension: number
  charityHeat: number
  wings: FaithWingState[]
  regionalLock: boolean
  regionVillageIds: VillageId[]
  events: FaithEvent[]
}

export interface FaithTickContext {
  tick: number
  roll: number
  hungerHint?: number
}