/**
 * `_staging/migrant_quarters` — Elian life-type module (isolated).
 * Do not import from World / canvas / index. Wire later via hooks in README.
 */

export {
  ELIAN_LIFE_TYPE,
  CULTURE_FEATURE_COUNT,
  CULTURE_TRAIT_Q,
} from './types'
export type {
  AssociationStage,
  CulturalTraitId,
  CulturalTraitProfile,
  CultureFeatures,
  HostStance,
  MigrantAssociation,
  MigrantEvent,
  MigrantEventKind,
  MigrantPerson,
  MigrantPhase,
  MigrantQuartersState,
  MixedChild,
  QuarterHabitSet,
  QuarterIdentity,
  SettlementMigrantView,
} from './types'

export {
  blendFeatures,
  clamp01,
  cultureSimilarity,
  driftTowardPeers,
  hostBaselineFeatures,
  makeOriginCulture,
  meanFeatures,
  mixChildCulture,
  randomFeatures,
  traitsFromFeatures,
} from './cultureMix'

export {
  assignCoRegionCluster,
  buildHabits,
  ensureQuarter,
  exportSettlementMigrantView,
  quarterIdFor,
  refreshQuarterIdentity,
  setAssociationStage,
  stanceFromScores,
  updateHostAttitudes,
} from './quarterIdentity'

export {
  desiredAssociationStage,
  ensureAssociation,
  findAssociationForQuarter,
  tickAssociations,
} from './association'

export {
  createMigrantQuartersState,
  culturalTraitsSnapshot,
  meanPeerFeaturesForQuarter,
  spawnOrphanLeaver,
  tickMigrantQuarters,
} from './tick'
export type { TickSignals } from './tick'