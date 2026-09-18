/**
 * Phase 7 WAVE 3 - pure wealth estimate (coins + priced inventory + home proxy).
 * READ-ONLY: uses priceOf from commerce; never mutates wealth or invents +X/day drift.
 *
 * Dual wealth APIs (do not invent a third currency):
 * - estimateDecisionWealth → ecology.estimateWealth (CAUSAL today: family, build hire, inheritance)
 * - estimateWealth / estimateWealthBreakdown → market-priced ledger (mostly DECORATIVE until wired)
 */

import { estimateWealth as ecologyEstimateWealth } from '../ecology'
import { priceOf } from '../commerce'
import { countOf, type ResourceType, type Slot } from '../inventory'
import type { SimState, Villager } from '../types'

/** Rough coin-equivalent proxy for owning a dwelling (not a rent stream). */
export const HOME_PROPERTY_PROXY = 12

/** Optional breakdown of estimateWealth — all figures are static snapshots. */
export interface WealthBreakdown {
  coins: number
  inventoryValue: number
  propertyProxy: number
  /** Capital goods proxy aligned with ecology (field/pen/mount/boat). */
  capitalProxy: number
  total: number
}

function slotsValue(slots: Slot[] | null | undefined, state?: SimState | null): number {
  if (!slots || slots.length === 0) return 0
  let sum = 0
  for (const slot of slots) {
    if (!slot.type || slot.count <= 0) continue
    // Coins counted at face value elsewhere — do not apply market priceOf('coin').
    if (slot.type === 'coin') continue
    const unit = priceOf(slot.type as ResourceType, state)
    sum += slot.count * (Number.isFinite(unit) ? unit : 0)
  }
  return sum
}

function coinCount(v: Villager): number {
  let n = countOf(v.inventory, 'coin')
  if (v.chestInventory) n += countOf(v.chestInventory, 'coin')
  if (v.cupboardInventory) n += countOf(v.cupboardInventory, 'coin')
  return n
}

function capitalProxyOf(v: Villager): number {
  let c = 0
  if (v.hasField) c += 2
  if (v.hasPen) c += 2
  if (v.horseId !== null) c += 2
  if (v.boatId !== null) c += 2
  return c
}

/**
 * Causal wealth used by live decisions (family inheritance, build hire offers).
 * Thin facade over ecology.estimateWealth — prefer this from economy callers.
 */
export function estimateDecisionWealth(v: Villager): number {
  return ecologyEstimateWealth(v)
}

/**
 * Snapshot market wealth: liquid coins + inventory at market prices + home/capital proxies.
 * Pure — no daily accrual, no payroll. Not yet the path build/family import.
 */
export function estimateWealth(v: Villager, state?: SimState | null): number {
  return estimateWealthBreakdown(v, state).total
}

/** Same as estimateWealth with an optional line-item breakdown. */
export function estimateWealthBreakdown(v: Villager, state?: SimState | null): WealthBreakdown {
  const coins = coinCount(v)
  const inventoryValue =
    slotsValue(v.inventory, state) +
    slotsValue(v.chestInventory, state) +
    slotsValue(v.cupboardInventory, state)
  const propertyProxy = v.hasHome ? HOME_PROPERTY_PROXY : 0
  const capitalProxy = capitalProxyOf(v)
  const total = coins + inventoryValue + propertyProxy + capitalProxy
  return { coins, inventoryValue, propertyProxy, capitalProxy, total }
}