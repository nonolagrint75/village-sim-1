/**
 * War-blocked reroute (Boran) — alternate profitable path + followers.
 */

import type {
  RerouteInput,
  RerouteResult,
  RouteEvent,
  TradeRoutePad,
} from './types'

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function push(route: TradeRoutePad, ev: RouteEvent): TradeRoutePad {
  return { ...route, events: [...route.events, ev] }
}

/** Mark a corridor blocked by war; raises warBlock and freezes volume. */
export function blockRouteByWar(
  route: TradeRoutePad,
  warPressure: number,
  tick: number,
): TradeRoutePad {
  const pressure = clamp01(warPressure)
  if (pressure < 0.35) return route
  let next: TradeRoutePad = { ...route, events: [...route.events] }
  next.warBlock = clamp01(Math.max(next.warBlock, pressure))
  next.status = 'blocked_war'
  next.volume *= 0.25
  next.merchantInterest *= 0.5
  next = push(next, {
    kind: 'war_blocked',
    tick,
    routeId: next.id,
    amount: next.warBlock,
    note: 'corridor unsafe',
  })
  return next
}

/**
 * Boran-style detour: find alternate profitable path when primary is war-blocked.
 */
export function findAlternateRoute(input: RerouteInput): RerouteResult {
  const { blocked } = input
  if (blocked.status !== 'blocked_war' && blocked.warBlock < 0.4) {
    return { rerouted: false, alternate: null, note: 'route not blocked enough' }
  }
  if (input.alternateWaypoints.length < 2) {
    return { rerouted: false, alternate: null, note: 'need alternate waypoints' }
  }

  const chance = 0.3 + clamp01(input.warPressure) * 0.35 + (input.lifeTag === 'Boran' ? 0.2 : 0)
  if (input.roll > chance) {
    return { rerouted: false, alternate: null, note: 'no detour this tick' }
  }

  const profitBoost = 1.15 + clamp01(input.warPressure) * 0.35 + (1 - input.roll) * 0.1
  let alternate: TradeRoutePad = {
    id: `route_alt_${blocked.id}_${input.tick}`,
    lifeTag: input.lifeTag,
    status: 'rerouted',
    fromVillageId: blocked.fromVillageId,
    toVillageId: input.toVillageId ?? blocked.toVillageId,
    regionIds: input.alternateRegions ?? [...blocked.regionIds, `detour_${input.tick}`],
    waypoints: input.alternateWaypoints.map((w) => ({ ...w })),
    discoveredTick: input.tick,
    discovererId: input.explorerId,
    discoveryKind: 'war_detour',
    merchantInterest: clamp01(0.4 + blocked.merchantInterest * 0.3),
    volume: Math.max(0.8, blocked.volume * 0.6),
    profitIndex: blocked.profitIndex * profitBoost,
    shockGoods: [],
    craftTags: [],
    migrantFollowerIds: [],
    warBlock: 0,
    parentRouteId: blocked.id,
    alternateRouteId: null,
    townSeedId: null,
    events: [],
  }

  alternate = push(alternate, {
    kind: 'reroute_found',
    tick: input.tick,
    routeId: alternate.id,
    actorId: input.explorerId,
    amount: alternate.profitIndex,
    note: `detour of ${blocked.id}`,
  })

  // Followers peel from blocked corridor toward safer profit
  const followN = Math.min(
    blocked.migrantFollowerIds.length,
    1 + Math.floor(alternate.profitIndex + input.roll * 2),
  )
  if (followN > 0) {
    const followers = blocked.migrantFollowerIds.slice(0, followN)
    alternate.migrantFollowerIds = followers
    alternate = push(alternate, {
      kind: 'followers_join',
      tick: input.tick,
      routeId: alternate.id,
      amount: followers.length,
      note: 'followers leave war path',
    })
  }

  return {
    rerouted: true,
    alternate,
    note: 'alternate profitable path opened',
  }
}

/** Link parent ↔ alternate after successful reroute. */
export function linkAlternate(
  blocked: TradeRoutePad,
  alternate: TradeRoutePad,
): { blocked: TradeRoutePad; alternate: TradeRoutePad } {
  return {
    blocked: { ...blocked, alternateRouteId: alternate.id, events: [...blocked.events] },
    alternate: { ...alternate, parentRouteId: blocked.id },
  }
}