/**
 * Explore routes staging types — local copies only (no core imports).
 * Life types: **Ema** (storm divert discovery → trade → crafts → migrants → integration),
 * **Boran** (war-blocked route → alternate path → followers → trade town).
 * Soft life-type tags for probes — never day-timer biography scripts.
 */

export type ActorId = number
export type VillageId = number
export type RegionId = string
export type RouteId = string
export type DiscoveryId = string
export type TownSeedId = string
export type GoodId = string

export type RouteLifeTag = 'Ema' | 'Boran' | 'generic'

export type RouteStatus =
  | 'unknown'
  | 'discovered'
  | 'scouted'
  | 'merchant_interest'
  | 'open'
  | 'shocked'
  | 'blocked_war'
  | 'rerouted'
  | 'integrated'
  | 'abandoned'

export type DiscoveryKind = 'storm_divert' | 'scout' | 'refugee_tip' | 'war_detour'

export type RouteEventKind =
  | 'discovery'
  | 'merchant_interest'
  | 'route_opened'
  | 'price_shock'
  | 'goods_arrived'
  | 'craft_inspired'
  | 'migrants_follow'
  | 'region_integrated'
  | 'war_blocked'
  | 'reroute_found'
  | 'followers_join'
  | 'town_nucleated'
  | 'route_abandoned'

export interface RouteEvent {
  kind: RouteEventKind
  tick: number
  routeId: RouteId
  actorId?: ActorId
  amount?: number
  note?: string
}

export interface WorldEdgeHint {
  ref: string
  x: number
  y: number
}

export interface TradeRoutePad {
  id: RouteId
  lifeTag: RouteLifeTag
  status: RouteStatus
  fromVillageId: VillageId
  toVillageId: VillageId | null
  regionIds: RegionId[]
  waypoints: WorldEdgeHint[]
  discoveredTick: number
  discovererId: ActorId | null
  discoveryKind: DiscoveryKind | null
  merchantInterest: number
  volume: number
  profitIndex: number
  shockGoods: GoodId[]
  craftTags: string[]
  migrantFollowerIds: ActorId[]
  warBlock: number
  parentRouteId: RouteId | null
  alternateRouteId: RouteId | null
  townSeedId: TownSeedId | null
  events: RouteEvent[]
}

export interface RouteDiscoveryInput {
  explorerId: ActorId
  lifeTag: RouteLifeTag
  fromVillageId: VillageId
  stormIntensity?: number
  warPressure?: number
  blockedRouteId?: RouteId | null
  waypoints: WorldEdgeHint[]
  regionIds?: RegionId[]
  roll: number
  tick: number
}

export interface RouteDiscoveryResult {
  discovered: boolean
  route: TradeRoutePad | null
  kind: DiscoveryKind | null
  note: string
}

export interface MerchantInterestInput {
  route: TradeRoutePad
  surplusHint: number
  merchantCount: number
  roll: number
}

export interface PriceShockResult {
  goodId: GoodId
  priceMul: number
  volumeMoved: number
}

export interface CraftInspirationResult {
  craftTag: string
  sourceGood: GoodId
  adoption: number
}

export interface MigrationFollowResult {
  followerIds: ActorId[]
  pull: number
}

export interface RegionIntegrationResult {
  regionId: RegionId
  coupling: number
  integrated: boolean
}

export interface RerouteInput {
  blocked: TradeRoutePad
  explorerId: ActorId
  lifeTag: RouteLifeTag
  warPressure: number
  alternateWaypoints: WorldEdgeHint[]
  alternateRegions?: RegionId[]
  toVillageId?: VillageId | null
  roll: number
  tick: number
}

export interface RerouteResult {
  rerouted: boolean
  alternate: TradeRoutePad | null
  note: string
}

export interface TownNucleationInput {
  route: TradeRoutePad
  traffic: number
  alongFrac: number
  settlerIds: ActorId[]
  roll: number
  tick: number
}

export interface TradeTownSeed {
  id: TownSeedId
  routeId: RouteId
  formedTick: number
  waypoint: WorldEdgeHint
  founderIds: ActorId[]
  marketIntent: number
  populationHint: number
}

export interface TownNucleationResult {
  nucleated: boolean
  seed: TradeTownSeed | null
  note: string
}

export interface ExploreRoutesState {
  routes: TradeRoutePad[]
  towns: TradeTownSeed[]
}

export interface ExploreTickContext {
  tick: number
  roll: number
  surplusHint?: number
  merchantCount?: number
  warPressure?: number
  migrantPool?: ActorId[]
}