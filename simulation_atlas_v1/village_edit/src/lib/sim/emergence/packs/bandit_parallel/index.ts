/**
 * Public API — bandit_parallel staging pack (life types Daren, Kael).
 */

export type {
  ActorId,
  AmbushTarget,
  AuthorityHunt,
  BanditEvent,
  BanditEventKind,
  BanditLifeTag,
  Bounty,
  BountyId,
  BranchOutcome,
  EncounterChoice,
  EncounterContext,
  EncounterResult,
  FactionDeal,
  GangId,
  GangMember,
  GangPhase,
  GangRole,
  LootPile,
  OutlawCandidate,
  OutlawPressure,
  ParallelGang,
  ParallelMarket,
  VillageId,
} from './types'

export { clamp, hash01, pushEventCap, aliveMembers } from './util'

export { combinePressure, outlawAttraction, shouldAttemptCrime } from './pressure'

export {
  createGang,
  ensureOrganizerHierarchy,
  promoteMember,
  recruitToGang,
} from './recruitment'

export {
  attemptAmbush,
  gangAmbushPower,
  pettyTheft,
  trainAmbushSkill,
  type AmbushResult,
} from './ambush'

export { fenceLoot, parallelEconomySnapshot } from './parallelEconomy'

export {
  clearBounty,
  huntPressure,
  postBounty,
  shouldPostBounty,
  startAuthorityHunt,
} from './bounty'

export {
  applyFactionDeal,
  chooseEncounterAction,
  destroyGang,
  resolveEncounter,
  tryPoliticalIntegration,
} from './encounter'

export {
  tickParallelGang,
  type BanditTickInput,
  type BanditTickResult,
} from './tick'

export { selfTestBanditParallel, SELF_TEST_NOTES as BANDIT_PARALLEL_SELF_TEST_NOTES } from './selfTest'
