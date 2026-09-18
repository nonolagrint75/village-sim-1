/**
 * Route discovery — Ema storm/divert and soft scout pads.
 */

import type {
  DiscoveryKind,
  RouteDiscoveryInput,
  RouteDiscoveryResult,
  RouteEvent,
  TradeRoutePad,
} from './types'

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function push(route: TradeRoutePad, ev: RouteEvent): TradeRoutePad {
  return { ...route, events: [...route.events, ev] }
}

function newRouteId(input: RouteDiscoveryInput): string {
  return `route_${input.lifeTag}_${input.fromVillageId}_${input.tick}_${input.explorerId}`
}

/**
 * Storm divert (Ema) or opportunistic scout discovery.
 * Does not open trade yet — only marks a corridor pad.
 */
export function discoverRoute(input: RouteDiscoveryInput): RouteDiscoveryResult {
  const storm = clamp01(input.stormIntensity ?? 0)
  const war = clamp01(input.warPressure ?? 0)

  let kind: DiscoveryKind | null = null
  let chance = 0.2

  if (input.lifeTag === 'Ema' || storm > 0.35) {
    kind = 'storm_divert'
    chance = 0.35 + storm * 0.45
  } else if (input.blockedRouteId || war > 0.4) {
    kind = 'war_detour'
    chance = 0.25 + war * 0.4
  } else if (input.roll > 0.7) {
    kind = 'scout'
    chance = 0.3
  } else {
    kind = 'refugee_tip'
    chance = 0.22
  }

  if (input.waypoints.length < 2) {
    return { discovered: false, route: null, kind: null, note: 'need waypoints' }
  }
  if (input.roll > chance) {
    return { discovered: false, route: null, kind, note: 'no discovery this tick' }
  }

  let route: TradeRoutePad = {
    id: newRouteId(input),
    lifeTag: input.lifeTag,
    status: 'discovered',
    fromVillageId: input.fromVillageId,
    toVillageId: null,
    regionIds: input.regionIds ?? [],
    waypoints: input.waypoints.map((w) => ({ ...w })),
    discoveredTick: input.tick,
    discovererId: input.explorerId,
    discoveryKind: kind,
    merchantInterest: 0,
    volume: 0,
    profitIndex: 1 + storm * 0.15 + (kind === 'war_detour' ? 0.25 : 0),
    shockGoods: [],
    craftTags: [],
    migrantFollowerIds: [],
    warBlock: kind === 'war_detour' ? war * 0.3 : 0,
    parentRouteId: input.blockedRouteId ?? null,
    alternateRouteId: null,
    townSeedId: null,
    events: [],
  }

  route = push(route, {
    kind: 'discovery',
    tick: input.tick,
    routeId: route.id,
    actorId: input.explorerId,
    amount: chance,
    note: `${kind} by ${input.lifeTag}`,
  })

  return {
    discovered: true,
    route,
    kind,
    note: `${kind} corridor discovered`,
  }
}

/**
 * Merchant interest → open route when surplus + merchants align.
 */
export function advanceMerchantInterest(
  route: TradeRoutePad,
  surplusHint: number,
  merchantCount: number,
  tick: number,
  roll: number,
): TradeRoutePad {
  if (route.status === 'abandoned' || route.status === 'blocked_war') return route

  let next: TradeRoutePad = { ...route, events: [...route.events] }
  const pull = clamp01(surplusHint * 0.45 + merchantCount * 0.08 + next.profitIndex * 0.15)
  next.merchantInterest = clamp01(next.merchantInterest * 0.85 + pull * 0.4 + (1 - roll) * 0.05)

  if (next.merchantInterest > 0.35 && next.status === 'discovered') {
    next.status = 'merchant_interest'
    next = push(next, {
      kind: 'merchant_interest',
      tick,
      routeId: next.id,
      amount: next.merchantInterest,
    })
  }

  if (next.merchantInterest > 0.55 && (next.status === 'merchant_interest' || next.status === 'scouted')) {
    next.status = 'open'
    next.volume = Math.max(next.volume, 1 + surplusHint * 2)
    next = push(next, {
      kind: 'route_opened',
      tick,
      routeId: next.id,
      amount: next.volume,
      note: 'merchants commit to corridor',
    })
  }

  return next
}