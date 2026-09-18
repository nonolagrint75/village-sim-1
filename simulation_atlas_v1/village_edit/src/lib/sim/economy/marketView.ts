/**
 * Phase 7 WAVE 3 - market / price facade over live commerce prices.
 *
 * Market founding stays in commerce.tryFoundMarket (tradeRuns + roads) -
 * do NOT add pop>X / year / tech unlock scripts here. This module only reads prices.
 *
 * INTEGRATION NOTE (orchestrator): merge via wave3Market.ts into economy/index.ts once.
 */
import { priceOf } from '../commerce'
import { TRADEABLE_RESOURCES } from '../resources'
import type { ResourceType } from '../inventory'
import type { SimState } from '../types'
import { ECONOMY_RESOURCE_IDS } from './resourcesCatalog'
import type { ResourceId } from './resourcesCatalog'

export type MarketPriceRow = { resource: ResourceType; price: number }

/** Going local price for a resource - wraps commerce.priceOf (live state.prices when set). */
export function localPrice(state: SimState, resource: ResourceType): number {
  return priceOf(resource, state)
}

/**
 * Scarcity signal from live state.prices when present: live / base (>1 = scarce).
 * Returns 1 (neutral) when the resource has no positive entry in state.prices.
 */
export function scarcitySignal(state: SimState, resource: ResourceType): number {
  const live = state.prices[resource]
  if (live === undefined || !(live > 0)) return 1
  const base = priceOf(resource, null)
  if (!(base > 0)) return 1
  return live / base
}

/**
 * Snapshot of market prices for TRADEABLE resources (fallback: ECONOMY catalog ids).
 * Prices come from localPrice / commerce clearing - no founding side effects.
 */
export function marketSnapshot(state: SimState): MarketPriceRow[] {
  const ids: readonly ResourceType[] =
    TRADEABLE_RESOURCES.length > 0
      ? TRADEABLE_RESOURCES
      : (ECONOMY_RESOURCE_IDS as ResourceId[] as ResourceType[])
  return ids.map((resource) => ({
    resource,
    price: localPrice(state, resource),
  }))
}
