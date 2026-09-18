/**
 * Public API - religion_schism staging pack (Samir).
 */

export type {
  ActorId,
  VillageId,
  CircleId,
  CreedId,
  SchismId,
  FaithLifeTag,
  FaithPhase,
  FaithWing,
  FaithEventKind,
  FaithEvent,
  BelieverProfile,
  FamineCharityHint,
  FaithWingState,
  FaithMovement,
  FaithTickContext,
} from './types'

export { clamp01, pushEvent, createSchismId } from './util'

export { tryReinterpretCreed, applyFaithFollowing } from './creed'

export { applyFamineCharity, raiseBeliefTension } from './charity'

export { tryFaithSchism, tryRegionalCreed } from './schism'

export { tickReligionSchism, schismStats } from './tick'