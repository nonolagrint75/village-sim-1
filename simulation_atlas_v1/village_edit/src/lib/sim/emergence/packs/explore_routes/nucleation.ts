/**
 * Town nucleation along busy roads / alternate trade paths (Boran follow-on).
 */

import type {
  TownNucleationInput,
  TownNucleationResult,
  TradeRoutePad,
  TradeTownSeed,
} from './types'

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

/**
 * When traffic + settlers + profit align, nucleate a trade town seed on a waypoint.
 * Mid-route waypoints preferred (alongFrac ~ 0.5).
 */
export function nucleateTradeTown(input: TownNucleationInput): TownNucleationResult {
  const { route } = input
  if (route.townSeedId) {
    return { nucleated: false, seed: null, note: 'town already seeded on route' }
  }
  if (route.waypoints.length === 0) {
    return { nucleated: false, seed: null, note: 'no waypoints' }
  }
  if (route.status === 'blocked_war' || route.status === 'abandoned') {
    return { nucleated: false, seed: null, note: 'route unsafe' }
  }

  const midBonus = 1 - Math.abs(input.alongFrac - 0.5) * 2
  const score =
    clamp01(input.traffic / 6) * 0.35 +
    clamp01(route.profitIndex - 0.8) * 0.25 +
    clamp01(route.migrantFollowerIds.length / 5) * 0.2 +
    midBonus * 0.15 +
    (route.status === 'rerouted' || route.status === 'integrated' ? 0.1 : 0)

  if (score < 0.45 || input.roll > score + 0.15) {
    return { nucleated: false, seed: null, note: `score=${score.toFixed(2)} insufficient` }
  }

  const idx = Math.min(
    route.waypoints.length - 1,
    Math.max(0, Math.floor(input.alongFrac * route.waypoints.length)),
  )
  const waypoint = route.waypoints[idx]!
  const founders =
    input.settlerIds.length > 0
      ? input.settlerIds.slice(0, 4)
      : route.migrantFollowerIds.slice(0, 4)

  if (founders.length === 0) {
    return { nucleated: false, seed: null, note: 'no settlers' }
  }

  const seed: TradeTownSeed = {
    id: `town_${route.id}_${input.tick}`,
    routeId: route.id,
    formedTick: input.tick,
    waypoint: { ...waypoint },
    founderIds: founders,
    marketIntent: clamp01(0.4 + route.merchantInterest * 0.4 + score * 0.2),
    populationHint: founders.length + Math.floor(input.traffic),
  }

  return {
    nucleated: true,
    seed,
    note: `trade town seed at ${waypoint.ref}`,
  }
}

/** Attach town seed id onto the route and emit event. */
export function attachTownSeed(route: TradeRoutePad, seed: TradeTownSeed, tick: number): TradeRoutePad {
  return {
    ...route,
    townSeedId: seed.id,
    events: [
      ...route.events,
      {
        kind: 'town_nucleated',
        tick,
        routeId: route.id,
        amount: seed.populationHint,
        note: seed.id,
      },
    ],
  }
}