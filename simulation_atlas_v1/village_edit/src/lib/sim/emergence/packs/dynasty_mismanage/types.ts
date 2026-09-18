/**
 * Dynasty mismanagement staging types — local copies only (no core imports).
 * Life type focus: **Malik** (heir arrogance → overspend → debt → rents → exit → seize → schism).
 * Soft life-type tag for probes — never a day-timer biography script.
 */

export type ActorId = number
export type VillageId = number
export type HouseId = string
export type BranchId = string
export type CreditorId = string
export type ClaimId = string

/** Soft life-type tag for probes — never a day-timer biography script. */
export type DynastyLifeTag = 'Malik' | 'generic'

/**
 * Personality deltas applied at inheritance / succession.
 * Integrator maps keys onto core Personality fields (ambition, thrift proxies, etc.).
 */
export interface InheritancePersonalityModifiers {
  /** Drives prestige spending and overhire. */
  arrogance: number
  /** Low thrift → overspend (inverse of frugality). */
  thrift: number
  /** Willingness to raise rents under debt. */
  hardness: number
  /** Sibling rivalry / contest drive. */
  rivalry: number
  /** Prestige / mansion appetite. */
  vanity: number
  /** Soft risk of ignoring advisors / creditors. */
  recklessness: number
}

export type HousePhase =
  | 'stable'
  | 'heir_ascendant'
  | 'overspending'
  | 'indebted'
  | 'squeezing'
  | 'peasant_exit'
  | 'output_collapse'
  | 'creditor_seize'
  | 'sibling_contest'
  | 'collapsed'
  | 'branch_split'

export type DynastyEventKind =
  | 'succession'
  | 'personality_biased'
  | 'overspend'
  | 'overhire'
  | 'mansion_built'
  | 'prestige_push'
  | 'debt_accrued'
  | 'rent_raised'
  | 'peasant_left'
  | 'output_dropped'
  | 'creditor_claim'
  | 'asset_seized'
  | 'sibling_challenged'
  | 'contest_resolved'
  | 'house_collapsed'
  | 'branch_split'
  | 'pressure_shifted'

export interface DynastyEvent {
  kind: DynastyEventKind
  tick: number
  houseId: HouseId
  actorId?: ActorId
  amount?: number
  note?: string
}

/** Snapshot of an heir / house head without touching core Villager. */
export interface HeirProfile {
  actorId: ActorId
  houseId: HouseId
  wealth: number
  /** Soft prestige / status 0–1. */
  prestige: number
  /** Inherited modifiers (already applied or pending). */
  modifiers: InheritancePersonalityModifiers
  lifeTag: DynastyLifeTag
  /** Sibling ids eligible for contest. */
  siblingIds: ActorId[]
}

export interface TenantSnapshot {
  actorId: ActorId
  /** Rent burden relative to output capacity (0–1+). */
  rentBurden: number
  /** Willingness / ability to leave (0–1). */
  exitPressure: number
  /** Soft labor / farm output contribution. */
  outputShare: number
}

export interface CreditorClaim {
  id: ClaimId
  creditorId: CreditorId
  houseId: HouseId
  principal: number
  remaining: number
  issuedTick: number
  /** Soft seize readiness 0–1. */
  seizePressure: number
  seized: boolean
}

export interface DynastyBranch {
  id: BranchId
  houseId: HouseId
  headId: ActorId
  formedTick: number
  /** Share of original estate claimed (0–1). */
  estateShare: number
  loyalTenantIds: ActorId[]
}

/**
 * One landed / merchant house under mismanagement pressure.
 * Causal pad only — integrator wires wealth, rents, and lineage.
 */
export interface DynastyHouse {
  id: HouseId
  villageId: VillageId | null
  surnameHint: string
  lifeTag: DynastyLifeTag
  phase: HousePhase
  formedTick: number
  headId: ActorId
  heirId: ActorId | null
  siblingIds: ActorId[]
  /** Liquid + land soft wealth. */
  wealth: number
  debt: number
  /** Prestige spending sink (mansion, retinue, display). */
  prestigeSink: number
  /** Hired retinue / staff count (soft). */
  hiredCount: number
  /** Has a vanity mansion / manor expansion. */
  mansion: boolean
  /** Mean rent multiplier vs baseline (1 = normal). */
  rentMultiplier: number
  /** Aggregate tenant output remaining (0–1 of peak). */
  outputLevel: number
  tenantIds: ActorId[]
  claims: CreditorClaim[]
  branches: DynastyBranch[]
  modifiers: InheritancePersonalityModifiers
  /** Rolling mismanagement pressure 0–1+. */
  mismanagementPressure: number
  events: DynastyEvent[]
  collapsedTick: number | null
  splitTick: number | null
}

export interface MismanagementPressureInput {
  wealth: number
  debt: number
  prestigeSink: number
  hiredCount: number
  mansion: boolean
  rentMultiplier: number
  outputLevel: number
  modifiers: InheritancePersonalityModifiers
  /** Optional city / famine stress 0–1. */
  cityStress?: number
}

export interface MismanagementPressureResult {
  /** Combined pressure 0–1+. */
  pressure: number
  overspendDrive: number
  overhireDrive: number
  mansionDrive: number
  rentRaiseDrive: number
  seizeRisk: number
  contestRisk: number
}

export interface FamilySchismResult {
  occurred: boolean
  kind: 'none' | 'contest' | 'branch_split' | 'collapse'
  winnerId: ActorId | null
  loserIds: ActorId[]
  newBranch: DynastyBranch | null
  estateTakenByCreditors: number
  note: string
}

export interface DynastyTickContext {
  tick: number
  /** Random 0–1 from integrator RNG (deterministic preferred). */
  roll: number
  cityStress?: number
  /** Optional live tenant snapshots; else house.tenantIds treated generically. */
  tenants?: TenantSnapshot[]
}
