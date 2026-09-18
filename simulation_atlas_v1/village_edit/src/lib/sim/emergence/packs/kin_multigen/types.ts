/**
 * Multi-generational kinship staging types — local copies only (no core imports).
 * Life types: **Ayan**, **Nara**, parts of **Eren** / **Mira**.
 *
 * Thesis: ordinary multi-child households (boring lives) still rewrite society
 * via profession divergence, firm marriage, multi-city graphs, and crisis loyalties.
 */

export type PersonId = number
export type FamilyId = number
export type LineageId = number
export type VillageId = number
export type FirmId = string
export type FactionId = string
export type EdgeId = string

/** Soft life-type tags for probes — never day-timer biography scripts. */
export type KinLifeTag = 'Ayan' | 'Nara' | 'Eren' | 'Mira' | 'generic'

/**
 * Abstract career tracks kids diverge into.
 * Integrator maps to core `Profession` + circles (guild / sacred / guard).
 */
export type KinProfessionTrack =
  | 'merchant'
  | 'guild'
  | 'soldier'
  | 'farmer'
  | 'religion'
  | 'artisan'
  | 'none'

/** Suggested map onto core `Profession` (integrator applies). */
export const TRACK_TO_CORE_PROFESSION: Record<KinProfessionTrack, string[]> = {
  merchant: ['trader'],
  guild: ['blacksmith', 'weaver', 'miller', 'mason'],
  soldier: ['guard'],
  farmer: ['farmer', 'herder'],
  religion: ['none'], // sacred circles / creed carriers, not a Profession enum
  artisan: ['blacksmith', 'weaver', 'builder', 'mason'],
  none: ['none', 'forager'],
}

export type KinEdgeKind =
  | 'parent'
  | 'child'
  | 'sibling'
  | 'spouse'
  | 'affine'
  | 'cousin'
  | 'firm_partner'
  | 'secret_aid'
  | 'enmity'

export interface KinPersonNode {
  id: PersonId
  lineageId: LineageId | null
  familyId: FamilyId | null
  villageId: VillageId | null
  parentIds: PersonId[]
  spouseId: PersonId | null
  alive: boolean
  birthTick: number
  deathTick: number | null
  track: KinProfessionTrack
  coreProfession: string | null
  firmIds: FirmId[]
  factionId: FactionId | null
  wealth: number
  lifeTag: KinLifeTag
  generation: number
}

export interface KinEdge {
  id: EdgeId
  a: PersonId
  b: PersonId
  kind: KinEdgeKind
  weight: number
  formedTick: number
  villageIds: VillageId[]
}

export interface KinshipGraph {
  nodes: Map<PersonId, KinPersonNode>
  edges: KinEdge[]
  rootLineageIds: LineageId[]
  foundedTick: number
}

export type BranchOutcomeKind =
  | 'ruin'
  | 'rich'
  | 'dead'
  | 'institution_control'
  | 'scattered'
  | 'neutral'

export interface BranchOutcome {
  lineageId: LineageId
  branchHeadId: PersonId | null
  kind: BranchOutcomeKind
  institutionRef: string | null
  wealthShare: number
  livingCount: number
  tick: number
  note?: string
}

export type CrisisPhase =
  | 'calm'
  | 'rising'
  | 'split'
  | 'secret_aid'
  | 'open_enmity'
  | 'resolved'

export interface PoliticalCrisis {
  id: string
  label: string
  startTick: number
  phase: CrisisPhase
  factionA: FactionId
  factionB: FactionId
  lineageIds: LineageId[]
  allegiances: Map<PersonId, FactionId>
}

export interface FirmMergeProposal {
  firmA: FirmId
  firmB: FirmId
  spouseA: PersonId
  spouseB: PersonId
  score: number
  tick: number
}

export interface FirmMergeResult {
  mergedFirmId: FirmId
  retiredFirmIds: FirmId[]
  ownerIds: PersonId[]
  villageId: VillageId | null
  tick: number
}

export interface ProfessionDivergenceInput {
  childId: PersonId
  parentTracks: KinProfessionTrack[]
  siblingTracks: KinProfessionTrack[]
  opportunity: Partial<Record<KinProfessionTrack, number>>
  personality: {
    ambition: number
    curiosity: number
    sociability: number
    courage: number
    generosity: number
  }
  traditionPull: number
  roll: number
}

export interface ProfessionDivergenceResult {
  track: KinProfessionTrack
  inherited: boolean
  reason:
    | 'inherited_parent'
    | 'sibling_niche'
    | 'opportunity'
    | 'personality'
    | 'random_drift'
  scoreByTrack: Partial<Record<KinProfessionTrack, number>>
}

export interface CrossFactionKinLink {
  personA: PersonId
  personB: PersonId
  factionA: FactionId
  factionB: FactionId
  kinship: number
  stance: 'secret_aid' | 'enmity' | 'estranged' | 'neutral'
  aidPressure: number
  hatePressure: number
}

export interface LineageHorizonStats {
  lineageId: LineageId
  surnameHint: string | null
  generations: number
  living: number
  dead: number
  citiesTouched: number
  villageIds: VillageId[]
  trackMix: Partial<Record<KinProfessionTrack, number>>
  factionSplit: number
  firmCount: number
  wealthTotal: number
  wealthGiniApprox: number
  secretAidEdges: number
  enmityEdges: number
  branchOutcomes: BranchOutcomeKind[]
  horizonTicks: number
  horizonYears: number | null
  lifeTagsPresent: KinLifeTag[]
}

export interface KinTickContext {
  tick: number
  ticksPerYear?: number
  roll: number
  cityStress?: number
}

export const DEFAULT_TICKS_PER_YEAR = 360
export const HORIZON_YEARS_MIN = 50
export const HORIZON_YEARS_MAX = 100

export const ALL_TRACKS: KinProfessionTrack[] = [
  'merchant',
  'guild',
  'soldier',
  'farmer',
  'religion',
  'artisan',
  'none',
]