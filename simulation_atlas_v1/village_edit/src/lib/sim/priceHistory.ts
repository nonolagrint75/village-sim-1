/**
 * Ring buffer of recent market prices for Economie panel sparklines.
 * Mutated only from commerce tickMarketPrices (not UI pack).
 */
import type { ResourceType } from './inventory'
import type { SimState } from './types'

export const PRICE_HISTORY_LEN = 12

export type PriceHistoryRow = {
  res: string
  price: number
  delta: number
  deltaPct: number
  spark: number[]
}

type Soft = SimState & { priceHistory?: Partial<Record<string, number[]>> }

export function pushPriceHistory(state: SimState, res: ResourceType, price: number): void {
  const soft = state as Soft
  if (!soft.priceHistory) soft.priceHistory = {}
  const ring = soft.priceHistory[res] ?? []
  ring.push(price)
  while (ring.length > PRICE_HISTORY_LEN) ring.shift()
  soft.priceHistory[res] = ring
}

export function packPriceHistoryRows(state: SimState, limit = 10): PriceHistoryRow[] {
  const soft = state as Soft
  const hist = soft.priceHistory ?? {}
  const prices = state.prices ?? {}
  const rows: PriceHistoryRow[] = []
  for (const [res, price] of Object.entries(prices)) {
    if (typeof price !== 'number' || !Number.isFinite(price)) continue
    const spark = [...(hist[res] ?? [])]
    if (spark.length === 0) spark.push(price)
    const prev = spark.length >= 2 ? spark[spark.length - 2]! : price
    const delta = Math.round((price - prev) * 10) / 10
    const deltaPct = prev > 0 ? Math.round(((price - prev) / prev) * 1000) / 10 : 0
    rows.push({ res, price, delta, deltaPct, spark })
  }
  rows.sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct) || b.price - a.price)
  return rows.slice(0, limit)
}