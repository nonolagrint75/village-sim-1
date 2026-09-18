/**
 * Staging module: dynasty_mismanage (Malik).
 * Isolated — do not import from core World.
 */

export type {
  ActorId,
  VillageId,
  HouseId,
  BranchId,
  CreditorId,
  ClaimId,
  DynastyLifeTag,
  InheritancePersonalityModifiers,
  HousePhase,
  DynastyEventKind,
  DynastyEvent,
  HeirProfile,
  TenantSnapshot,
  CreditorClaim,
  DynastyBranch,
  DynastyHouse,
  MismanagementPressureInput,
  MismanagementPressureResult,
  FamilySchismResult,
  DynastyTickContext,
} from './types'

export {
  defaultInheritanceModifiers,
  malikInheritanceModifiers,
  resolveInheritanceModifiers,
  applySuccession,
  personalityHookHints,
  modifierSpendMultiplier,
} from './inheritance'

export {
  scoreMismanagementPressure,
  applyMismanagementTick,
  tenantExitPressure,
} from './pressure'

export {
  applyPeasantExit,
  applyCreditorSeize,
  resolveFamilySchism,
} from './cascade'

export { createDynastyHouse, tickDynastyHouse } from './tick'
