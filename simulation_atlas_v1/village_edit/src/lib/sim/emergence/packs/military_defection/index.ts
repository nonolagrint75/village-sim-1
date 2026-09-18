/**
 * Staging pack: military_defection (Jonas / Arvid)
 * Isolated — integrator wires into war, politics loyalty, repression, desertion.
 */

export type {
  ActorId,
  PolityId,
  VillageId,
  FactionId,
  WarId,
  MilitaryLifeTag,
  DefectionPhase,
  DefectionEventKind,
  PoliticalOfferKind,
  DefectionEvent,
  SoldierProfile,
  FriendDeathHint,
  SupplyHint,
  RepressOrderHint,
  PoliticalOffer,
  MilitaryFaction,
  DefectionTickContext,
} from './types'

export {
  meanLoyalty,
  noteLoyalBaseline,
  applyFriendDeath,
  applySupplyFailure,
  raiseOfficerDiscontent,
} from './loyalty'

export {
  createFactionId,
  seedLoyalUnit,
  onFriendDeath,
  onSupplyHint,
  tryOfficerDiscontent,
  tryFormMilitaryFaction,
  resolveRepressOrder,
  enterCivilWarCommand,
  makePoliticalOffer,
  resolvePoliticalOffer,
  tickMilitaryFaction,
} from './faction'