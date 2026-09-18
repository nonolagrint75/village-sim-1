// @ts-nocheck
/**
 * Forge / smith demand near productive mines (causal step 4).
 * Compatible with careers.ts forgeNeed nudge when village.hasMine && iron low.
 */

import { FORGE_DEMAND_RADIUS, FORGE_STOCK_THRESHOLD } from './constants'
import { pushEvent } from './events'
import type { ForgeDemandSignal, MinesOreBag } from './types'
import { sumOre } from './types'

export interface ForgeSiteHint {
  x: number
  y: number
  /** Optional: existing forge / workbench / blacksmith workplace. */
  kind?: 'forge' | 'workbench' | 'smith'
}

export interface RefreshForgeOpts {
  tick: number
  /** Existing forges / smith sites in the world (integrator supplies). */
  forges?: readonly ForgeSiteHint[]
  /** Village smith count soft shortage (profession === blacksmith). */
  smithCountByVillage?: ReadonlyMap<number, number> | Record<number, number>
}

function smithsOf(
  map: RefreshForgeOpts['smithCountByVillage'],
  villageId: number | null,
): number {
  if (villageId == null || map == null) return 0
  if (map instanceof Map) return map.get(villageId) ?? 0
  return map[villageId] ?? 0
}

function nearestForgeDist(x: number, y: number, forges: readonly ForgeSiteHint[]): number {
  let best = Infinity
  for (const f of forges) {
    const d = Math.abs(f.x - x) + Math.abs(f.y - y)
    if (d < best) best = d
  }
  return best
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n))
}

/**
 * Recompute forgeSignals for open/active mouths with ore stock.
 * Emits forge_demand visual events when demand crosses soft threshold.
 */
export function refreshForgeDemand(bag: MinesOreBag, opts: RefreshForgeOpts): ForgeDemandSignal[] {
  const forges = opts.forges ?? []
  const next: ForgeDemandSignal[] = []

  for (const mouth of bag.mouths) {
    if (mouth.status !== 'open' && mouth.status !== 'active' && mouth.status !== 'claimed') continue
    const oreStock = sumOre(mouth.stockpile, true)
    if (oreStock < FORGE_STOCK_THRESHOLD * 0.5 && mouth.status !== 'active') continue

    const forgeDist = nearestForgeDist(mouth.x, mouth.y, forges)
    const noNearby = !Number.isFinite(forgeDist) || forgeDist > FORGE_DEMAND_RADIUS
    const smiths = smithsOf(opts.smithCountByVillage, mouth.villageId)

    let demand = 0
    let reason: ForgeDemandSignal['reason'] = 'ore_stock'

    if (oreStock >= FORGE_STOCK_THRESHOLD) {
      demand += clamp01((oreStock - FORGE_STOCK_THRESHOLD) / 20) * 0.45 + 0.25
      reason = 'ore_stock'
    }
    if (mouth.status === 'active') {
      demand += 0.18
      if (reason === 'ore_stock' && oreStock < FORGE_STOCK_THRESHOLD) reason = 'active_mine'
    }
    if (noNearby) {
      demand += 0.28
      reason = 'no_nearby_forge'
    } else {
      demand *= 0.55
    }
    if (smiths <= 0 && mouth.villageId != null) {
      demand += 0.2
      reason = 'smith_shortage'
    } else if (smiths > 0) {
      demand *= 1 / (1 + smiths * 0.35)
    }

    demand = clamp01(demand)
    if (demand < 0.2) continue

    const signal: ForgeDemandSignal = {
      mouthId: mouth.id,
      villageId: mouth.villageId,
      x: mouth.x,
      y: mouth.y,
      demand,
      radius: FORGE_DEMAND_RADIUS,
      primaryOre: mouth.primaryOre,
      oreStock,
      tick: opts.tick,
      reason,
    }
    next.push(signal)

    const prev = bag.forgeSignals.find((s) => s.mouthId === mouth.id)
    const crossed = !prev || prev.demand < 0.35 && demand >= 0.35
    if (crossed || (demand >= 0.55 && (!prev || opts.tick - prev.tick > 40))) {
      pushEvent(bag, {
        kind: 'forge_demand',
        tick: opts.tick,
        mouthId: mouth.id,
        villageId: mouth.villageId,
        x: mouth.x,
        y: mouth.y,
        ore: mouth.primaryOre,
        amount: oreStock,
        intensity: demand,
        note: reason,
      })
    }
  }

  bag.forgeSignals = next
  return next
}

/** Soft careers-compatible forgeNeed delta 0..1 from village mouth signals. */
export function forgeNeedDelta(bag: MinesOreBag, villageId: number): number {
  let best = 0
  for (const s of bag.forgeSignals) {
    if (s.villageId === villageId) best = Math.max(best, s.demand)
  }
  return best
}

/** Suggested forge site: near mouth, offset toward open land if hint given. */
export function suggestForgeSite(
  signal: ForgeDemandSignal,
  prefer?: { x: number; y: number },
): { x: number; y: number } {
  if (!prefer) return { x: signal.x, y: signal.y }
  const dx = Math.sign(prefer.x - signal.x)
  const dy = Math.sign(prefer.y - signal.y)
  return {
    x: signal.x + dx * 2,
    y: signal.y + dy * 2,
  }
}