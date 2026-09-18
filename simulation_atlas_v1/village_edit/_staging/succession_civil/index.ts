/**
 * Public API - succession_civil staging pack (Alena contested succession -> civil war).
 */

export type {
  ActorId,
  PolityId,
  VillageId,
  WarId,
  CrisisId,
  FirmId,
  SuccessionLifeTag,
  SuccessionPhase,
  SuccessionEventKind,
  RewardKind,
  SuccessionEvent,
  ClaimantProfile,
  SuccessionFaction,
  MerchantAlly,
  PoliticalReward,
  SuccessionCrisis,
  SuccessionTickContext,
} from './types'

export { clamp01, pushEvent } from './util'

export {
  createCrisisId,
  seedSuccessionCrisis,
  registerClaimant,
  formClaimantFactions,
} from './crisis'

export { tryMerchantAlliance } from './alliances'

export { tryIgniteCivilWar, resolveCivilWar } from './war'

export { tickSuccessionCivil, successionStats } from './tick'