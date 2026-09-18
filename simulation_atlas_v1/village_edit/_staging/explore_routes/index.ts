/**
 * Public API — explore_routes staging pack (Ema / Boran).
 * Isolated — integrator wires; no core imports.
 */

export type {
  ActorId,
  VillageId,
  RegionId,
  RouteId,
  DiscoveryId,
  TownSeedId,
  GoodId,
  RouteLifeTag,
  RouteStatus,
  DiscoveryKind,
  RouteEventKind,
  RouteEvent,
  WorldEdgeHint,
  TradeRoutePad,
  RouteDiscoveryInput,
  RouteDiscoveryResult,
  MerchantInterestInput,
  PriceShockResult,
  CraftInspirationResult,
  MigrationFollowResult,
  RegionIntegrationResult,
  RerouteInput,
  RerouteResult,
  TownNucleationInput,
  TradeTownSeed,
  TownNucleationResult,
  ExploreRoutesState,
  ExploreTickContext,
} from './types'

export { discoverRoute, advanceMerchantInterest } from './discovery'
export {
  applyPriceShock,
  inspireCrafts,
  migrantsFollowRoute,
  integrateRegions,
  applyOpenRouteCascade,
} from './effects'
export { blockRouteByWar, findAlternateRoute, linkAlternate } from './reroute'
export { nucleateTradeTown, attachTownSeed } from './nucleation'
export {
  createExploreState,
  upsertRoute,
  tickEmaExploration,
  tickBoranReroute,
  tickExploreRoutes,
} from './tick'

/** README aliases for integrator convenience */
export { discoverRoute as tryDiscoverRoute } from './discovery'
export { advanceMerchantInterest as applyMerchantInterest } from './discovery'
export { blockRouteByWar as tryWarBlock } from './reroute'
export { findAlternateRoute as tryReroute } from './reroute'
export { nucleateTradeTown as tryNucleateTradeTown } from './nucleation'
export { inspireCrafts as applyCraftInspiration } from './effects'
export { migrantsFollowRoute as applyMigrantsFollow } from './effects'
export { integrateRegions as tryRegionIntegrate } from './effects'