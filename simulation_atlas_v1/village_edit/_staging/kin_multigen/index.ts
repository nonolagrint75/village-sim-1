/**
 * `kin_multigen` public API — multi-gen kinship / profession / crisis / stats.
 * Integrator: import from here only.
 */

export * from './types'
export {
  createEmptyKinGraph,
  upsertPerson,
  ensureEdge,
  registerKinBirth,
  registerKinMarriage,
  livingMembers,
  citiesForLineage,
  neighbors,
  kinshipReach,
  seedOrdinaryHousehold,
} from './kinshipGraph'
export {
  chooseProfessionTrack,
  coreProfessionCandidates,
  pickCoreProfession,
  siblingTrackEntropy,
} from './professionDivergence'
export {
  scoreFirmMarriageMerge,
  shouldMergeFirms,
  applyFirmMergeLocal,
  type FirmSnapshot,
} from './firmMarriage'
export {
  createCrisis,
  splitDescendantsAcrossFactions,
  collectCrossFactionKin,
  resolveCrossFactionStances,
  secretAidTransferHint,
  factionBalance,
} from './crisisKin'
export { evaluateBranchOutcome, evaluateAllRootBranches } from './branchOutcomes'
export {
  computeLineageHorizonStats,
  computeAllLineageStats,
  meetsMultigenHorizon,
  societyRewriteSignal,
} from './lineageStats'