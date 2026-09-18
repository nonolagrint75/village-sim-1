/**
 * Labor revolt staging — local types only (no core imports).
 * Life focus: **Rami** (organizer) / **Tomas** (rank-and-file worker).
 *
 * Causal chain (emergent, not day-scripted):
 * bad conditions → worker group → wage cut / strike → labor institution →
 * repression → negotiate vs overthrow → food crisis → mass protest →
 * army refuses → regime collapse → new polity → elite backlash.
 */

export type ActorId = number
export type VillageId = number
export type PolityId = number
export type CircleId = number
export type MovementId = string

/** Soft probe tags — never a biography timer. */
export type LaborLifeTag = 'Rami' | 'Tomas' | 'generic'

export type LaborPhase =
  | 'latent'
  | 'worker_group'
  | 'strike'
  | 'institution'
  | 'repression'
  | 'fork_negotiate'
  | 'fork_overthrow'
  | 'food_crisis'
  | 'mass_protest'
  | 'army_refuses'
  | 'regime_collapse'
  | 'new_polity'
  | 'elite_backlash'
  | 'settled'
  | 'crushed'

export type LaborEventKind =
  | 'conditions_worsened'
  | 'group_formed'
  | 'wage_cut'
  | 'strike_begun'
  | 'strike_broken'
  | 'institution_formed'
  | 'repression_applied'
  | 'negotiation_opened'
  | 'overthrow_pushed'
  | 'food_crisis'
  | 'mass_protest'
  | 'army_refused'
  | 'army_obeyed'
  | 'regime_collapsed'
  | 'polity_formed'
  | 'elite_backlash'
  | 'settled'
  | 'crushed'

export interface LaborEvent {
  kind: LaborEventKind
  tick: number
  movementId: MovementId
  actorId?: ActorId
  amount?: number
  note?: string
}

/** Snapshot of workplace / village hardship — integrator fills from sim. */
export interface WorkConditionsHint {
  villageId: VillageId
  /** 0–1: hunger, cold, disease, overcrowding blend. */
  hardship: number
  /** Relative wage vs recent baseline (1 = unchanged, <1 = cut). */
  wageIndex: number
  /** 0–1 inequality / rent / firm owner margin. */
  exploitation: number
  workerCount: number
  tick: number
}

export interface WorkerProfile {
  actorId: ActorId
  villageId: VillageId | null
  lifeTag: LaborLifeTag
  /** 0–1 personal hardship. */
  hardship: number
  /** Belief fairness / grievance proxy 0–1. */
  grievance: number
  /** Loyalty to current authority 0–1. */
  loyalty: number
  /** Courage / sociability proxy for organizing. */
  organizePull: number
  isElite: boolean
  isSoldier: boolean
}

export interface LaborMovement {
  id: MovementId
  villageId: VillageId
  polityId: PolityId | null
  phase: LaborPhase
  formedTick: number
  /** Soft circle id once mapped by integrator. */
  circleId: CircleId | null
  institutionId: CircleId | null
  organizerIds: ActorId[]
  memberIds: ActorId[]
  /** Peak Rami-like organizer. */
  leadOrganizerId: ActorId | null
  cohesion: number
  /** 0–1 strike intensity / participation. */
  strikePressure: number
  /** Wage index demanded / last known. */
  wageIndex: number
  repressionHeat: number
  foodStress: number
  armyLoyalty: number
  eliteBacklash: number
  /** Soft new polity id after collapse. */
  successorPolityId: PolityId | null
  events: LaborEvent[]
}

export interface RepressionHint {
  polityId: PolityId
  tick: number
  /** How hard authority pushes (0–1). */
  force: number
  /** Army willingness to obey (0–1). */
  armyObedience: number
}

export interface FoodCrisisHint {
  villageId: VillageId
  tick: number
  /** 0–1 shortage / famine feel. */
  shortage: number
}

export interface LaborTickContext {
  tick: number
  roll: number
  /** Optional city-wide stress 0–1. */
  cityStress?: number
}

export interface LaborForkChoice {
  movementId: MovementId
  /** negotiate | overthrow — integrator may bias from personality. */
  prefer: 'negotiate' | 'overthrow' | 'auto'
}