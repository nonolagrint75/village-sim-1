/**
 * Phase 7 WAVE 1 - map mind.needs / body hunger-fatigue to economic DemandTag urgency.
 * Pure functions; optional villager helper reads CognitiveState via mindOf.
 */
import { mindOf } from '../cognition/mindPool'
import type { NeedPressures } from '../cognition/types'
import type { Villager } from '../types'

/** Economic demand channels (frozen WAVE 1 contract). */
export type DemandTag =
  | 'food'
  | 'shelter'
  | 'tools'
  | 'clothing'
  | 'fuel'
  | 'medicine'
  | 'social'
  | 'luxury'

/** Need ids mirrored from NeedPressures (+ body proxies). */
export type NeedId = keyof NeedPressures | 'bodyHunger' | 'bodyFatigue'

export type DemandUrgency = Record<DemandTag, number>

export const DEMAND_TAGS: readonly DemandTag[] = [
  'food',
  'shelter',
  'tools',
  'clothing',
  'fuel',
  'medicine',
  'social',
  'luxury',
] as const

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(1, v))
}

function emptyDemand(): DemandUrgency {
  return {
    food: 0,
    shelter: 0,
    tools: 0,
    clothing: 0,
    fuel: 0,
    medicine: 0,
    social: 0,
    luxury: 0,
  }
}

/**
 * Map soft NeedPressures (0-1) onto DemandTag urgency (0-1).
 * Max-merge when several needs feed the same tag.
 */
export function demandFromNeeds(needs: NeedPressures): DemandUrgency {
  const d = emptyDemand()

  d.food = clamp01(needs.hunger)

  d.shelter = clamp01(Math.max(needs.shelter, needs.fatigue * 0.55, needs.safety * 0.35))

  // Tools: purposeful labor / safety gear pressure (weapons, implements).
  d.tools = clamp01(Math.max(needs.purpose * 0.7, needs.safety * 0.4, needs.creative * 0.35))

  // Clothing: cold comfort + status dress.
  d.clothing = clamp01(Math.max(needs.warmth * 0.75, needs.status * 0.35))

  // Fuel: warmth + light (hearth / torch / candle).
  d.fuel = clamp01(Math.max(needs.warmth, needs.light))

  // Medicine: injury / threat recovery (health channel proxied via safety + fatigue).
  d.medicine = clamp01(Math.max(needs.safety * 0.55, needs.fatigue * 0.25))

  d.social = clamp01(Math.max(needs.social, needs.belonging, needs.piety * 0.45))

  // Luxury: status / boredom / creative surplus wants.
  d.luxury = clamp01(Math.max(needs.status * 0.65, needs.boredom * 0.7, needs.creative * 0.55))

  return d
}

/**
 * Blend mind.needs with raw body hunger / stamina when available on the villager.
 * Body hunger is high when v.hunger is low (same sense as needs.ts: hunger pressure).
 * Body fatigue rises as stamina falls (0-4 scale).
 */
export function demandFromVillager(v: Villager): DemandUrgency {
  const needs = mindOf(v).needs
  const base = demandFromNeeds(needs)

  const bodyHunger = clamp01(1 - (typeof v.hunger === 'number' ? v.hunger : 6) / 6)
  const bodyFatigue = clamp01(typeof v.stamina === 'number' ? (4 - v.stamina) / 4 : needs.fatigue)

  base.food = clamp01(Math.max(base.food, bodyHunger))
  base.shelter = clamp01(Math.max(base.shelter, bodyFatigue * 0.5))
  base.medicine = clamp01(
    Math.max(base.medicine, typeof v.health === 'number' && v.health < 2 ? 0.45 + (2 - v.health) * 0.2 : 0),
  )

  return base
}

/** Dominant demand tag, or null if all urgencies are ~0. */
export function topDemand(urgency: DemandUrgency, min = 0.05): DemandTag | null {
  let best: DemandTag | null = null
  let bestV = min
  for (const tag of DEMAND_TAGS) {
    const v = urgency[tag]
    if (v > bestV) {
      bestV = v
      best = tag
    }
  }
  return best
}

/**
 * Optional note for WAVE 2 markets: pass SimState later to modulate village-level
 * shortages (granary empty -> food urgency floor). WAVE 1 stays villager-local / pure.
 */
export function noteDemandState(_note?: string): void {
  // Intentionally no-op - reserved for integrator probes / debug stamps.
}
