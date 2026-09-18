/**
 * Migrant quarters — isolated staging types (Elian life-type chain).
 * Self-contained: no imports from src/lib. Naming mirrors sim conventions.
 */

export type CulturalTraitId =
  | 'food_habit'
  | 'speech_cadence'
  | 'craft_style'
  | 'dress_code'
  | 'festivity'
  | 'build_motif'

export type HostStance = 'welcome' | 'neutral' | 'wary' | 'hostile'

export type AssociationStage =
  | 'none'
  | 'informal_cluster'
  | 'mutual_aid'
  | 'named_association'
  | 'recognized_institution'

export type MigrantPhase =
  | 'orphan_leave'
  | 'city_labor'
  | 'trade_apprentice'
  | 'married_local'
  | 'workshop_anchor'
  | 'quarter_resident'
  | 'association_member'
  | 'institution_elder'

/** Discrete cultural feature vector (Axelrod-like, local copy). */
export type CultureFeatures = number[]

export interface CulturalTraitProfile {
  traits: Partial<Record<CulturalTraitId, number>>
  /** 0..CULTURE_TRAIT_Q per feature */
  features: CultureFeatures
  originTag: string
  hostBlend: number
}

export interface QuarterHabitSet {
  foodPrefs: string[]
  architectureMotifs: string[]
  gatheringPlaces: string[]
  festivityWeight: number
}

export interface QuarterIdentity {
  id: string
  settlementId: number
  name: string
  originRegionId: number
  coRegionShare: number
  habits: QuarterHabitSet
  culturalMean: CultureFeatures
  hostStance: HostStance
  suspicion: number
  welcome: number
  popShare: number
  formedTick: number
  associationStage: AssociationStage
}

export interface MigrantPerson {
  id: number
  name: string
  originRegionId: number
  settlementId: number
  quarterId: string | null
  phase: MigrantPhase
  culture: CulturalTraitProfile
  spouseLocalId: number | null
  workshopId: string | null
  associationId: number | null
  laborSkill: number
  tradeSkill: number
  wealth: number
  arrivalTick: number
  generation: number
}

export interface MixedChild {
  id: number
  parentMigrantId: number
  parentLocalId: number
  culture: CulturalTraitProfile
  birthTick: number
  generation: number
}

export interface MigrantAssociation {
  id: number
  quarterId: string
  name: string
  stage: AssociationStage
  memberIds: number[]
  cohesion: number
  treasury: number
  norms: string[]
  formedTick: number
  isInstitution: boolean
}

export interface SettlementMigrantView {
  settlementId: number
  totalPop: number
  migrantPop: number
  migrantShare: number
  quarters: QuarterIdentity[]
  associations: MigrantAssociation[]
  hostStanceMean: number
}

export interface MigrantQuartersState {
  tick: number
  nextPersonId: number
  nextAssociationId: number
  nextChildId: number
  people: MigrantPerson[]
  children: MixedChild[]
  quarters: QuarterIdentity[]
  associations: MigrantAssociation[]
  /** settlementId → host pop estimate */
  hostPopBySettlement: Record<number, number>
  events: MigrantEvent[]
}

export type MigrantEventKind =
  | 'left_village'
  | 'took_city_labor'
  | 'began_apprenticeship'
  | 'married_local'
  | 'child_cultural_drift'
  | 'founded_workshop'
  | 'clustered_co_region'
  | 'quarter_habits_formed'
  | 'host_stance_shift'
  | 'association_formed'
  | 'association_instituted'
  | 'pop_share_updated'

export interface MigrantEvent {
  tick: number
  kind: MigrantEventKind
  personId?: number
  quarterId?: string
  associationId?: number
  detail?: string
}

export const CULTURE_FEATURE_COUNT = 5
export const CULTURE_TRAIT_Q = 8

export const ELIAN_LIFE_TYPE = 'elian' as const