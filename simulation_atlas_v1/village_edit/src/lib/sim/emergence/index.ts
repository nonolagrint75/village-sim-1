/**
 * Emergent world layer — Phase A foundations + Phase B career/group contracts.
 * Import from here in later phases; do not fork parallel facades.
 */
export {
  getRelation,
  recordInteraction,
  getHousehold,
  getHouseholdNeeds,
  relationDecisionBias,
  getMarketState,
  getJobOpportunities,
  getCurrentOccupation,
  evaluateCareerChange,
  getPrice,
  getGroups,
  getGroupState,
  groupMetricsSnapshot,
  careerMetricsSnapshot,
  getPoliticalContext,
  getFactions,
  type InteractionKind,
  type MarketStateStub,
  type JobOpportunity,
  type JobOpportunityStub,
  type CareerChangeEval,
  type GroupRef,
  type GroupRefStub,
  type GroupState,
  type PoliticalContextStub,
} from './contracts'
export type { HouseholdNeeds } from '../family'
export {
  evaluateLifeTypes,
  lifeTypesSummary,
  noteLifeHit,
  ensureLifePathBag,
  type LifeTypeId,
  type LifeTypeReport,
} from './lifePaths'
export { tickAtlasLifeSystems } from './atlasLifeSystems'