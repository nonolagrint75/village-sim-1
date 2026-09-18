/**
 * Explore routes tick + state helpers — Ema / Boran chains (staging only).
 */

import { advanceMerchantInterest, discoverRoute } from './discovery'
import { applyOpenRouteCascade } from './effects'
import { attachTownSeed, nucleateTradeTown } from './nucleation'
import { blockRouteByWar, findAlternateRoute, linkAlternate } from './reroute'
import type {
  ExploreRoutesState,
  ExploreTickContext,
  RouteDiscoveryInput,
  RerouteInput,
  TradeRoutePad,
  TradeTownSeed,
  WorldEdgeHint,
} from './types'

export function createExploreState(): ExploreRoutesState {
  return { routes: [], towns: [] }
}

export function upsertRoute(state: ExploreRoutesState, route: TradeRoutePad): ExploreRoutesState {
  const idx = state.routes.findIndex((r) => r.id === route.id)
  const routes = [...state.routes]
  if (idx >= 0) routes[idx] = route
  else routes.push(route)
  return { ...state, routes }
}

/**
 * Ema-oriented step: optional discovery → merchant interest → open cascade.
 */
export function tickEmaExploration(
  state: ExploreRoutesState,
  discovery: RouteDiscoveryInput | null,
  ctx: ExploreTickContext,
): ExploreRoutesState {
  let next = { ...state, routes: [...state.routes], towns: [...state.towns] }

  if (discovery) {
    const result = discoverRoute({ ...discovery, lifeTag: discovery.lifeTag === 'generic' ? 'Ema' : discovery.lifeTag })
    if (result.discovered && result.route) next = upsertRoute(next, result.route)
  }

  const surplus = ctx.surplusHint ?? 0.4
  const merchants = ctx.merchantCount ?? 2
  next.routes = next.routes.map((r) => {
    if (r.lifeTag !== 'Ema' && r.discoveryKind !== 'storm_divert') return r
    let route = advanceMerchantInterest(r, surplus, merchants, ctx.tick, ctx.roll)
    if (route.status === 'open' || route.status === 'shocked' || route.status === 'merchant_interest') {
      route = applyOpenRouteCascade(route, ctx)
    }
    return route
  })

  return next
}

/**
 * Boran-oriented step: war-block → alternate → followers → town nucleation.
 */
export function tickBoranReroute(
  state: ExploreRoutesState,
  opts: {
    routeId: string
    explorerId: number
    alternateWaypoints: WorldEdgeHint[]
    alternateRegions?: string[]
    toVillageId?: number | null
    settlerIds?: number[]
  },
  ctx: ExploreTickContext,
): ExploreRoutesState {
  let next = { ...state, routes: [...state.routes], towns: [...state.towns] }
  const war = ctx.warPressure ?? 0.6
  const idx = next.routes.findIndex((r) => r.id === opts.routeId)
  if (idx < 0) return next

  let blocked = blockRouteByWar(next.routes[idx]!, war, ctx.tick)
  next.routes[idx] = blocked

  const input: RerouteInput = {
    blocked,
    explorerId: opts.explorerId,
    lifeTag: 'Boran',
    warPressure: war,
    alternateWaypoints: opts.alternateWaypoints,
    alternateRegions: opts.alternateRegions,
    toVillageId: opts.toVillageId,
    roll: ctx.roll,
    tick: ctx.tick,
  }
  const found = findAlternateRoute(input)
  if (!found.rerouted || !found.alternate) return next

  const linked = linkAlternate(blocked, found.alternate)
  next.routes[idx] = linked.blocked
  next = upsertRoute(next, linked.alternate)

  // Followers already on alternate; try town nucleation along detour
  const alt = linked.alternate
  const nuc = nucleateTradeTown({
    route: alt,
    traffic: alt.volume + alt.migrantFollowerIds.length,
    alongFrac: 0.45 + ctx.roll * 0.1,
    settlerIds: opts.settlerIds ?? alt.migrantFollowerIds,
    roll: ctx.roll,
    tick: ctx.tick,
  })
  if (nuc.nucleated && nuc.seed) {
    const seeded = attachTownSeed(alt, nuc.seed, ctx.tick)
    next = upsertRoute(next, seeded)
    next.towns = [...next.towns, nuc.seed]
  }

  return next
}

/**
 * Generic tick: advance all open routes (merchant + cascade) and try nucleation
 * on high-traffic corridors.
 */
export function tickExploreRoutes(state: ExploreRoutesState, ctx: ExploreTickContext): ExploreRoutesState {
  let next = { ...state, routes: [...state.routes], towns: [...state.towns] }
  const surplus = ctx.surplusHint ?? 0.35
  const merchants = ctx.merchantCount ?? 2

  const towns: TradeTownSeed[] = [...next.towns]
  next.routes = next.routes.map((r) => {
    let route = r
    if (ctx.warPressure && ctx.warPressure > 0.5 && route.status === 'open') {
      route = blockRouteByWar(route, ctx.warPressure, ctx.tick)
    }
    route = advanceMerchantInterest(route, surplus, merchants, ctx.tick, ctx.roll)
    if (route.status === 'open' || route.status === 'shocked' || route.status === 'rerouted') {
      route = applyOpenRouteCascade(route, ctx)
    }
    if (!route.townSeedId && (route.volume > 3 || route.migrantFollowerIds.length >= 3)) {
      const nuc = nucleateTradeTown({
        route,
        traffic: route.volume + route.migrantFollowerIds.length,
        alongFrac: 0.5,
        settlerIds: route.migrantFollowerIds,
        roll: ctx.roll,
        tick: ctx.tick,
      })
      if (nuc.nucleated && nuc.seed) {
        route = attachTownSeed(route, nuc.seed, ctx.tick)
        towns.push(nuc.seed)
      }
    }
    return route
  })

  return { ...next, towns }
}