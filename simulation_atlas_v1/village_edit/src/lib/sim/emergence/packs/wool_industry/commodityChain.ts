/**
 * Commodity chain: sheep → wool → yarn → cloth → dyed cloth + role ladder.
 * Causal conversions driven by stocks, prices, and firm roles — not day scripts.
 */

import type {
  ActorFirm,
  CommodityPrices,
  CommodityStock,
  TextileRole,
  WoolEvent,
  WoolIndustryState,
} from './types'
import { BASE_PRICES } from './types'

export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

export function emptyStock(): CommodityStock {
  return { sheep: 0, wool: 0, yarn: 0, cloth: 0, dyedCloth: 0 }
}

export function ensureStock(
  state: WoolIndustryState,
  settlementId: number,
): CommodityStock {
  if (!state.stocksBySettlement[settlementId]) {
    state.stocksBySettlement[settlementId] = emptyStock()
  }
  return state.stocksBySettlement[settlementId]!
}

function pushEvent(
  state: WoolIndustryState,
  kind: WoolEvent['kind'],
  extra: Partial<WoolEvent> = {},
): void {
  state.events.push({ tick: state.tick, kind, ...extra })
  if (state.events.length > 240) state.events.splice(0, state.events.length - 240)
}

/** Inherit sheep → founding herder capital (Yara entry). */
export function inheritSheep(
  state: WoolIndustryState,
  settlementId: number,
  ownerName: string,
  sheepCount: number,
): ActorFirm {
  const stock = ensureStock(state, settlementId)
  stock.sheep += Math.max(1, sheepCount)
  const firm: ActorFirm = {
    id: `firm:${state.nextFirmId++}`,
    ownerName,
    role: 'herder',
    settlementId,
    herdSize: Math.max(1, sheepCount),
    workers: 0,
    quality: 0.35 + Math.min(0.3, sheepCount * 0.02),
    capital: sheepCount * state.prices.sheep * 0.5,
    specialized: false,
    foundedTick: state.tick,
  }
  state.firms.push(firm)
  pushEvent(state, 'sheep_inherited', {
    firmId: firm.id,
    settlementId,
    detail: `sheep=${sheepCount}`,
  })
  return firm
}

/** Shear: herd → wool stock. */
export function produceWool(state: WoolIndustryState, firm: ActorFirm): number {
  if (firm.role !== 'herder' && firm.role !== 'copycat_herder') return 0
  const stock = ensureStock(state, firm.settlementId)
  const yieldPer = 0.35 + firm.quality * 0.25
  const produced = firm.herdSize * yieldPer * (1 + firm.workers * 0.08)
  stock.wool += produced
  return produced
}

/** Sell wool into regional demand; returns coins gained. */
export function sellWool(
  state: WoolIndustryState,
  firm: ActorFirm,
  amount: number,
  externalDemand: number,
): number {
  const stock = ensureStock(state, firm.settlementId)
  const qty = Math.min(stock.wool, Math.max(0, amount))
  if (qty <= 0) return 0
  stock.wool -= qty
  const price = state.prices.wool * (0.85 + externalDemand * 0.4)
  const coins = qty * price
  firm.capital += coins
  pushEvent(state, 'wool_sold', {
    firmId: firm.id,
    settlementId: firm.settlementId,
    detail: `qty=${qty.toFixed(1)} @${price.toFixed(2)}`,
  })
  return coins
}

/**
 * Downstream transforms — each role pulls input and pushes output.
 * Conversion ratios keep a single chain observable.
 */
export function convertChainForRole(state: WoolIndustryState, firm: ActorFirm): void {
  const stock = ensureStock(state, firm.settlementId)
  const labor = 1 + firm.workers * 0.35
  const q = 0.7 + firm.quality * 0.5

  if (firm.role === 'spinner') {
    const take = Math.min(stock.wool, 2.5 * labor)
    stock.wool -= take
    stock.yarn += take * 0.85 * q
  } else if (firm.role === 'weaver') {
    const take = Math.min(stock.yarn, 2.0 * labor)
    stock.yarn -= take
    stock.cloth += take * 0.8 * q
  } else if (firm.role === 'dyer') {
    const take = Math.min(stock.cloth, 1.5 * labor)
    stock.cloth -= take
    stock.dyedCloth += take * 0.75 * (firm.specialized ? 1.15 : 1)
  } else if (firm.role === 'merchant') {
    // Merchants clear finished goods for capital; soft regional drain.
    const move =
      Math.min(stock.dyedCloth, 1.2 * labor) + Math.min(stock.cloth, 0.8 * labor) * 0.5
    const clothTake = Math.min(stock.cloth, move * 0.4)
    const dyedTake = Math.min(stock.dyedCloth, move * 0.6)
    stock.cloth -= clothTake
    stock.dyedCloth -= dyedTake
    firm.capital +=
      clothTake * state.prices.cloth + dyedTake * state.prices.dyedCloth
  }
}

export function tryHire(
  state: WoolIndustryState,
  firm: ActorFirm,
  laborPool: number,
): boolean {
  if (laborPool < 0.15) return false
  if (firm.capital < 4) return false
  if (firm.workers >= 8) return false
  const need =
    firm.role === 'herder' || firm.role === 'copycat_herder'
      ? firm.herdSize > 6 && firm.workers < firm.herdSize / 4
      : firm.capital > 10
  if (!need) return false
  firm.workers += 1
  firm.capital -= 3
  pushEvent(state, 'worker_hired', { firmId: firm.id, settlementId: firm.settlementId })
  return true
}

export function expandHerd(state: WoolIndustryState, firm: ActorFirm, demand: number): void {
  if (firm.role !== 'herder' && firm.role !== 'copycat_herder') return
  if (demand < 0.45 || firm.capital < state.prices.sheep) return
  const add = demand > 0.75 ? 2 : 1
  firm.herdSize += add
  ensureStock(state, firm.settlementId).sheep += add
  firm.capital -= add * state.prices.sheep * 0.6
  pushEvent(state, 'herd_expanded', {
    firmId: firm.id,
    settlementId: firm.settlementId,
    detail: `herd=${firm.herdSize}`,
  })
}

export function spawnCopycat(
  state: WoolIndustryState,
  pioneer: ActorFirm,
  rng: () => number,
): ActorFirm | null {
  if (pioneer.role !== 'herder') return null
  if (pioneer.herdSize < 8 || pioneer.capital < 20) return null
  if (rng() > 0.08) return null
  const copy: ActorFirm = {
    id: `firm:${state.nextFirmId++}`,
    ownerName: `Copycat-${state.nextFirmId}`,
    role: 'copycat_herder',
    settlementId: pioneer.settlementId,
    herdSize: 3 + Math.floor(rng() * 3),
    workers: 0,
    quality: Math.max(0.2, pioneer.quality - 0.1),
    capital: 8 + rng() * 6,
    specialized: false,
    foundedTick: state.tick,
  }
  state.firms.push(copy)
  ensureStock(state, copy.settlementId).sheep += copy.herdSize
  pushEvent(state, 'copycat_entered', {
    firmId: copy.id,
    settlementId: copy.settlementId,
  })
  return copy
}

/** Demand + local surplus differentiate spinner/weaver/dyer/merchant. */
export function maybeDifferentiateRole(
  state: WoolIndustryState,
  firm: ActorFirm,
  rng: () => number,
): void {
  if (firm.role !== 'herder' && firm.role !== 'copycat_herder') return
  const stock = ensureStock(state, firm.settlementId)
  if (stock.wool < 8 || firm.capital < 12) return
  if (rng() > 0.06) return
  const roll = rng()
  let role: TextileRole = 'spinner'
  if (stock.yarn > 6 && roll > 0.35) role = 'weaver'
  if (stock.cloth > 4 && roll > 0.6) role = 'dyer'
  if (firm.capital > 25 && roll > 0.8) role = 'merchant'
  firm.role = role
  pushEvent(state, 'role_differentiated', {
    firmId: firm.id,
    settlementId: firm.settlementId,
    detail: role,
  })
}

export function repriceFromStocks(
  state: WoolIndustryState,
  regionalDemand: number,
): CommodityPrices {
  const totals = emptyStock()
  for (const s of Object.values(state.stocksBySettlement)) {
    totals.sheep += s.sheep
    totals.wool += s.wool
    totals.yarn += s.yarn
    totals.cloth += s.cloth
    totals.dyedCloth += s.dyedCloth
  }
  const scarcity = (base: number, stock: number, target: number) =>
    base * (0.55 + regionalDemand * 0.5) * (target / Math.max(0.5, stock + target * 0.35))

  state.prices = {
    sheep: scarcity(BASE_PRICES.sheep, totals.sheep, 20),
    wool: scarcity(BASE_PRICES.wool, totals.wool, 15),
    yarn: scarcity(BASE_PRICES.yarn, totals.yarn, 10),
    cloth: scarcity(BASE_PRICES.cloth, totals.cloth, 8),
    dyedCloth: scarcity(BASE_PRICES.dyedCloth, totals.dyedCloth, 5),
  }
  return state.prices
}

export function exportCommodityChainSnapshot(state: WoolIndustryState) {
  const totals = emptyStock()
  for (const s of Object.values(state.stocksBySettlement)) {
    totals.sheep += s.sheep
    totals.wool += s.wool
    totals.yarn += s.yarn
    totals.cloth += s.cloth
    totals.dyedCloth += s.dyedCloth
  }
  const roles: Record<string, number> = {}
  for (const f of state.firms) roles[f.role] = (roles[f.role] ?? 0) + 1
  return {
    stocks: totals,
    prices: { ...state.prices },
    roleCounts: roles,
    firmCount: state.firms.length,
  }
}