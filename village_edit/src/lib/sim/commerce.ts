import { addToInventory, countOf, removeFromInventory } from './inventory'
import { logEvent } from './social'
import { distance, findMillSite } from './world'
import type { ResourceType, Slot } from './inventory'
import type { SimState, Village } from './types'

export const TRADE_COOLDOWN = 420
export const MAX_TRADE_DIST = 520
export const PORT_TRADE_THRESHOLD = 10

/**
 * Every resource a village can hold a surplus of, be priced on the open market, and actually
 * trade away to another village. One shared list drives all three so a resource can never end up
 * priced-but-not-tradeable (or vice versa) again — the gap that let wool, cloth, iron, hide,
 * leather, clothing, wheat, flour and gold show a market price while having no real way to move
 * between villages.
 */
export const TRACKED_RESOURCES: ResourceType[] = [
  'wood',
  'stone',
  'iron',
  'wool',
  'cloth',
  'clothing',
  'hide',
  'leather',
  'wheat',
  'flour',
  'bread',
  'gold',
  'food',
]

const BASE_PRICE: Partial<Record<ResourceType, number>> = {
  wood: 2,
  stone: 3,
  iron: 6,
  wool: 2,
  cloth: 4,
  clothing: 9,
  hide: 3,
  leather: 7,
  wheat: 1.5,
  flour: 3,
  bread: 2,
  gold: 8,
  food: 1.5,
}

/**
 * How much of each resource the population "wants" to hold per capita before it feels spare.
 * Serves three roles: the denominator for market scarcity pricing, the per-village baseline a
 * trade surplus is measured against, and the safety reserve conductTrade refuses to sell below.
 */
const TARGET_PER_CAPITA: Partial<Record<ResourceType, number>> = {
  wood: 5,
  stone: 4,
  iron: 1.2,
  wool: 1.5,
  cloth: 0.8,
  clothing: 0.4,
  hide: 0.8,
  leather: 0.35,
  wheat: 3,
  flour: 1,
  bread: 2,
  gold: 0.6,
  food: 3,
}

/** A trade only fires once the per-capita surplus clears this fraction of what's "wanted" — scaled per resource, so scarce goods like gold aren't held to the same absolute bar as wood. */
const MIN_TRADE_GAIN_FRACTION = 0.4

function clampNum(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function targetOf(res: ResourceType): number {
  return TARGET_PER_CAPITA[res] ?? 1
}

/** The going rate for a resource, in coins — used both for the market display and to price a direct purchase between two villagers (see buyMaterial in behaviors.ts). */
export function priceOf(res: ResourceType): number {
  return BASE_PRICE[res] ?? 3
}

/** The per-capita reserve a villager or village keeps before selling — exported so buyMaterial in behaviors.ts won't buy a seller down to nothing. */
export function targetPerCapita(res: ResourceType): number {
  return targetOf(res)
}

/** Recomputes every village's per-capita surplus for every tradeable resource. Villages are few, so this is always cheap. */
export function tickVillageEconomy(state: SimState) {
  for (const village of state.villages) {
    const totals: Partial<Record<ResourceType, number>> = {}
    let n = 0
    for (const v of state.villagers) {
      if (!v.alive || v.villageId !== village.id) continue
      n++
      for (const res of TRACKED_RESOURCES) {
        const have = countOf(v.inventory, res) + (v.chestInventory ? countOf(v.chestInventory, res) : 0)
        totals[res] = (totals[res] ?? 0) + have
      }
    }
    if (n === 0) continue
    for (const res of TRACKED_RESOURCES) {
      village.surplus[res] = (totals[res] ?? 0) / n - targetOf(res)
    }
  }
}

/**
 * A single world market, priced by scarcity: how much of a resource exists right now against
 * how much the population would need to feel well-supplied. Feeds two things: the price shown
 * to the player, and (via BASE_PRICE) the coin reward a trader earns in conductTrade below — so
 * a trade run to sell something genuinely scarce actually pays better.
 */
export function tickMarketPrices(state: SimState) {
  let population = 0
  const totals: Partial<Record<ResourceType, number>> = {}
  for (const v of state.villagers) {
    if (!v.alive) continue
    population++
    for (const res of TRACKED_RESOURCES) {
      const have = countOf(v.inventory, res) + (v.chestInventory ? countOf(v.chestInventory, res) : 0)
      totals[res] = (totals[res] ?? 0) + have
    }
  }
  if (population === 0) return
  for (const res of TRACKED_RESOURCES) {
    const target = targetOf(res) * population
    const actual = Math.max(1, totals[res] ?? 0)
    const scarcity = clampNum(target / actual, 0.35, 3.5)
    const base = BASE_PRICE[res] ?? 3
    state.prices[res] = Math.round(base * scarcity * 10) / 10
  }
}

export interface TradeOpportunity {
  target: Village
  resource: ResourceType
  gain: number
  distance: number
}

/** The best reachable village to sell to, and what's worth carrying there — or null if none is. */
export function findTradeOpportunity(state: SimState, home: Village, fromX: number, fromY: number): TradeOpportunity | null {
  let best: TradeOpportunity | null = null
  for (const other of state.villages) {
    if (other.id === home.id || other.memberIds.length === 0) continue
    const d = distance(fromX, fromY, other.centerX, other.centerY)
    if (d > MAX_TRADE_DIST) continue

    for (const resource of TRACKED_RESOURCES) {
      const gain = (home.surplus[resource] ?? 0) - (other.surplus[resource] ?? 0)
      if (gain < targetOf(resource) * MIN_TRADE_GAIN_FRACTION) continue
      if (!best || gain / targetOf(resource) > best.gain / targetOf(best.resource)) best = { target: other, resource, gain, distance: d }
    }
  }
  return best
}

function routeKey(a: number, b: number): string {
  return a < b ? `${a}-${b}` : `${b}-${a}`
}

/**
 * The trader has arrived and struck the deal. This moves real goods — pulled only from home
 * village chests, never from what a villager is personally carrying — and never below the
 * village's own safety reserve (TARGET_PER_CAPITA). That reserve matters most for bread and
 * wheat: a trade moves surplus, not the larder, or "surplus" detection would starve the very
 * village it was supposed to be measuring. The coin reward is tied to the resource's market
 * price, so a load of iron or gold pays better than the same headcount of wood.
 */
export function conductTrade(state: SimState, trader: { inventory: Slot[]; villageId: number | null; name: string }, destVillage: Village, resource: ResourceType, gain: number) {
  const homeVillage = state.villages.find((vg) => vg.id === trader.villageId)
  const wanted = Math.max(1, Math.round(gain))
  let sourced = 0

  if (homeVillage) {
    let members = 0
    let stored = 0
    for (const v of state.villagers) {
      if (!v.alive || v.villageId !== homeVillage.id) continue
      members++
      if (v.chestInventory) stored += countOf(v.chestInventory, resource)
      stored += countOf(v.inventory, resource)
    }
    const safeToSell = Math.max(0, stored - targetOf(resource) * members)
    let remaining = Math.min(wanted, safeToSell)

    for (const v of state.villagers) {
      if (remaining <= 0 || v.villageId !== homeVillage.id || !v.chestInventory) continue
      const take = Math.min(countOf(v.chestInventory, resource), remaining)
      if (take > 0) {
        removeFromInventory(v.chestInventory, resource, take)
        remaining -= take
        sourced += take
      }
    }
  }

  if (sourced > 0) {
    for (const v of state.villagers) {
      if (v.villageId !== destVillage.id || !v.chestInventory) continue
      addToInventory(v.chestInventory, resource, sourced)
      break
    }
  }

  const fulfilment = sourced / wanted
  const portBonus = (homeVillage?.hasPort ? 1.3 : 1) * (destVillage.hasPort ? 1.3 : 1)
  const price = BASE_PRICE[resource] ?? 3
  const reward = Math.round(Math.max(2, Math.min(40, sourced * price * (0.5 + 0.5 * fulfilment) + 2)) * portBonus)
  addToInventory(trader.inventory, 'coin', reward)

  if (homeVillage) homeVillage.tradeRuns += 1
  destVillage.tradeRuns += 1

  if (homeVillage) {
    const key = routeKey(homeVillage.id, destVillage.id)
    if (!state.tradeRoutes.has(key)) {
      state.tradeRoutes.add(key)
      logEvent(state, `${trader.name} ouvre une route commerciale (${RESOURCE_FR[resource]})`)
    }
  }
}

const RESOURCE_FR: Record<ResourceType, string> = {
  wood: 'bois',
  stone: 'pierre',
  gold: 'or',
  food: 'baies',
  coin: 'pièces',
  wheat: 'blé',
  flour: 'farine',
  bread: 'pain',
  wool: 'laine',
  cloth: 'tissu',
  clothing: 'vêtements',
  hide: 'peau',
  leather: 'cuir',
  iron: 'fer',
}

/** Whether this village has earned a port: enough trade, and water close enough to build on. */
export function portEligible(state: SimState, village: Village): boolean {
  if (village.hasPort || village.tradeRuns < PORT_TRADE_THRESHOLD) return false
  return findMillSite(state.grid, village.centerX, village.centerY, 24) !== null
}
