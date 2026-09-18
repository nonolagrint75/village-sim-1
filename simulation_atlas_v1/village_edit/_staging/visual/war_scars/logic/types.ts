/**
 * War / crisis visual scars — staging types only (no core imports).
 * Mirror live names from warTypes / bandits / settlements / snapshot.
 */

export type VillageId = number
export type PolityId = number
export type WarId = number
export type BandId = number
export type ActorId = number

/** Live: warTypes.WarStatus */
export type WarStatus = 'skirmish' | 'open' | 'ended'

/** Live: warTypes.WarCause */
export type WarCause =
  | 'territory'
  | 'scarcity'
  | 'raid_revenge'
  | 'rivalry'
  | 'succession_spill'

/** Live: BanditPhase */
export type BanditPhase = 'camp' | 'raid' | 'flee'

/** Live: Village.crisisPhase */
export type CrisisPhase = 'stable' | 'crisis' | 'collapse' | 'rebuild'

/** Live: WallTier */
export type WallTier = 'none' | 'wood' | 'stone'

/** Live: SettlementStage */
export type SettlementStage = 'camp' | 'hamlet' | 'village' | 'town' | 'city'

/** Live: snapshot.ActorRuin.kind (base) */
export type LiveRuinKind = 'ruin' | 'raid' | 'clearing' | 'battle'

/** Staging scar kinds exported for renderer / art props. */
export type ScarEventKind =
  | 'battle_scar'
  | 'raid_scar'
  | 'house_ruined'
  | 'field_burned'
  | 'clearing_scar'
  | 'fortify_raised'
  | 'famine_stress'
  | 'refugee_depart'

export type ScarSource = 'war' | 'bandit' | 'revolt' | 'famine' | 'rebuild'

/** One scar / stress flag for the visual pipeline. */
export interface ScarEvent {
  id: string
  kind: ScarEventKind
  tick: number
  x: number
  y: number
  /** 0–1 visual weight (maps to ActorRuin.intensity). */
  intensity: number
  /** Soft age for moss / fade (maps to ActorRuin.ageDays). */
  ageDays: number
  source: ScarSource
  villageId?: VillageId
  polityId?: PolityId
  warId?: WarId
  bandId?: BandId
  /** Optional FR note for chronicle overlay. */
  note?: string
}

/** Hints integrator reads from live sim (filled outside this pack). */
export interface WarScarHint {
  warId: WarId
  aId: PolityId
  bId: PolityId
  status: WarStatus
  cause: WarCause
  intensity: number
  battles: number
  lastBattleTick: number
  startedTick: number
  capitalAX: number
  capitalAY: number
  capitalBX: number
  capitalBY: number
}

export interface RaidScarHint {
  bandId: BandId
  phase: BanditPhase
  campX: number
  campY: number
  targetVillageId: VillageId | null
  targetX: number
  targetY: number
  lastRaidTick: number
  tick: number
}

export interface CrisisScarHint {
  villageId: VillageId
  x: number
  y: number
  crisisPhase: CrisisPhase
  wallTier: WallTier
  settlementStage: SettlementStage
  prosperity: number
  famine: boolean
  lastCrisisTick: number
  rebuildProgress: number
  tick: number
}

export interface FortifyScarHint {
  villageId: VillageId
  x: number
  y: number
  wallTier: WallTier
  /** Live build purpose includes fortify. */
  fortifyActive: boolean
  fortifyDone: boolean
  progress: number
  tick: number
  /** Why fortify started — war threat preferred. */
  reason?: string
}

/** Batch export the renderer / snapshot builder consumes. */
export interface ScarExport {
  tick: number
  events: ScarEvent[]
  /** Soft village flags (famine stress) — not rubble. */
  stressFlags: Array<{
    villageId: VillageId
    x: number
    y: number
    famine: boolean
    crisisPhase: CrisisPhase
    intensity: number
  }>
}