/**
 * Public API — merchant_network staging pack (Eren).
 * Isolated — integrator wires; no core imports.
 */

export type {
  ActorId,
  VillageId,
  FirmId,
  CircleId,
  NetworkId,
  EdgeId,
  MerchantLifeTag,
  MerchantPhase,
  MerchantEventKind,
  MerchantEvent,
  TraderProfile,
  NetworkEdge,
  MerchantNode,
  MerchantNetworkState,
  MerchantTickContext,
} from './types'

export { clamp01, pushEvent, nodeOf } from './util'

export {
  createNetworkId,
  createEmptyNetwork,
  tryFarmerToTrader,
  noteHorseOwned,
} from './career'

export { tryGrainArbitrage, reinforceEdge } from './trade'

export { tryFirmHire, tryMerchantMarriage, tryFirmSuccession } from './firm'

export { tryJoinOrFormTradeGuild, noteChildCareerDiverge } from './guild'

export { tickMerchantNetwork, merchantNetworkStats } from './tick'