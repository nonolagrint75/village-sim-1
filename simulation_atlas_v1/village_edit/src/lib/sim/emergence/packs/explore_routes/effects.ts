/**
 * Open-route effects: price shock, culture crafts, migrants, region integration (Ema chain).
 */

import type {
  CraftInspirationResult,
  ExploreTickContext,
  GoodId,
  MigrationFollowResult,
  PriceShockResult,
  RegionIntegrationResult,
  RouteEvent,
  TradeRoutePad,
} from './types'

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function push(route: TradeRoutePad, ev: RouteEvent): TradeRoutePad {
  return { ...route, events: [...route.events, ev] }
}

const DEFAULT_SHOCK_GOODS: GoodId[] = ['spice', 'dye', 'cloth', 'metalware', 'salt']

/** Goods / price shock when a new route opens or volume spikes. */
export function applyPriceShock(
  route: TradeRoutePad,
  tick: number,
  roll: number,
  goods: GoodId[] = DEFAULT_SHOCK_GOODS,
): { route: TradeRoutePad; shocks: PriceShockResult[] } {
  if (route.status !== 'open' && route.status !== 'shocked' && route.status !== 'integrated') {
    return { route, shocks: [] }
  }
  if (route.volume < 1.2 && route.merchantInterest < 0.6) return { route, shocks: [] }

  const shocks: PriceShockResult[] = []
  let next: TradeRoutePad = { ...route, shockGoods: [...route.shockGoods], events: [...route.events] }
  const count = 1 + Math.floor(roll * 2)
  for (let i = 0; i < count; i++) {
    const good = goods[Math.floor((roll + i * 0.17) * goods.length) % goods.length]!
    const cheaper = roll + i * 0.1 > 0.45
    const priceMul = cheaper ? 0.65 + roll * 0.2 : 1.25 + roll * 0.35
    const volumeMoved = next.volume * (0.4 + roll * 0.4)
    shocks.push({ goodId: good, priceMul, volumeMoved })
    if (!next.shockGoods.includes(good)) next.shockGoods.push(good)
    next = push(next, {
      kind: 'price_shock',
      tick,
      routeId: next.id,
      amount: priceMul,
      note: good,
    })
    next = push(next, {
      kind: 'goods_arrived',
      tick,
      routeId: next.id,
      amount: volumeMoved,
      note: good,
    })
  }
  next.status = 'shocked'
  next.volume += shocks.reduce((s, g) => s + g.volumeMoved * 0.1, 0)
  return { route: next, shocks }
}

/** Culture-inspired crafts from foreign goods. */
export function inspireCrafts(
  route: TradeRoutePad,
  tick: number,
  roll: number,
): { route: TradeRoutePad; crafts: CraftInspirationResult[] } {
  if (route.shockGoods.length === 0) return { route, crafts: [] }

  const crafts: CraftInspirationResult[] = []
  let next: TradeRoutePad = { ...route, craftTags: [...route.craftTags], events: [...route.events] }
  for (const good of next.shockGoods) {
    if (roll < 0.35 && next.craftTags.some((t) => t.includes(good))) continue
    const craftTag = `${good}_craft`
    const adoption = clamp01(0.3 + next.merchantInterest * 0.3 + roll * 0.25)
    if (adoption < 0.4) continue
    if (!next.craftTags.includes(craftTag)) next.craftTags.push(craftTag)
    crafts.push({ craftTag, sourceGood: good, adoption })
    next = push(next, {
      kind: 'craft_inspired',
      tick,
      routeId: next.id,
      amount: adoption,
      note: craftTag,
    })
  }
  return { route: next, crafts }
}

/** Migrants follow open profitable routes. */
export function migrantsFollowRoute(
  route: TradeRoutePad,
  pool: number[],
  tick: number,
  roll: number,
): { route: TradeRoutePad; migration: MigrationFollowResult } {
  if (route.status === 'abandoned' || route.status === 'blocked_war') {
    return { route, migration: { followerIds: [], pull: 0 } }
  }
  const pull = clamp01(route.volume * 0.12 + route.profitIndex * 0.25 + route.merchantInterest * 0.2)
  if (pull < 0.35 || pool.length === 0) {
    return { route, migration: { followerIds: [], pull } }
  }
  const take = Math.min(pool.length, 1 + Math.floor(pull * 3 + roll * 2))
  const followerIds = pool.slice(0, take)
  let next: TradeRoutePad = {
    ...route,
    migrantFollowerIds: [...new Set([...route.migrantFollowerIds, ...followerIds])],
    events: [...route.events],
  }
  next = push(next, {
    kind: 'migrants_follow',
    tick,
    routeId: next.id,
    amount: followerIds.length,
    note: `pull=${pull.toFixed(2)}`,
  })
  return { route: next, migration: { followerIds, pull } }
}

/** Region coupling after sustained traffic + crafts + migrants. */
export function integrateRegions(
  route: TradeRoutePad,
  tick: number,
): { route: TradeRoutePad; results: RegionIntegrationResult[] } {
  const traffic = route.volume + route.migrantFollowerIds.length * 0.35 + route.craftTags.length * 0.4
  const results: RegionIntegrationResult[] = []
  let next: TradeRoutePad = { ...route, events: [...route.events] }
  for (const regionId of next.regionIds) {
    const coupling = clamp01(traffic / 8)
    const integrated = coupling > 0.55 && next.status !== 'discovered'
    results.push({ regionId, coupling, integrated })
    if (integrated) {
      next = push(next, {
        kind: 'region_integrated',
        tick,
        routeId: next.id,
        amount: coupling,
        note: regionId,
      })
    }
  }
  if (results.some((r) => r.integrated)) next.status = 'integrated'
  return { route: next, results }
}

/** Convenience: run Ema-style post-open cascade on one route. */
export function applyOpenRouteCascade(
  route: TradeRoutePad,
  ctx: ExploreTickContext,
): TradeRoutePad {
  let next = route
  const shock = applyPriceShock(next, ctx.tick, ctx.roll)
  next = shock.route
  const crafts = inspireCrafts(next, ctx.tick, ctx.roll)
  next = crafts.route
  const mig = migrantsFollowRoute(next, ctx.migrantPool ?? [], ctx.tick, ctx.roll)
  next = mig.route
  const integ = integrateRegions(next, ctx.tick)
  return integ.route
}