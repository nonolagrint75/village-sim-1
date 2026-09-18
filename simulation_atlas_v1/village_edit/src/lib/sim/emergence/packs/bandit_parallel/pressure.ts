/**
 * Poverty → migration → unemployment → crime pressure (no calendar biography).
 */

import type { OutlawCandidate, OutlawPressure } from './types'
import { clamp } from './util'

export function combinePressure(p: OutlawPressure | null | undefined): number {
  if (!p) return 0.35
  return clamp(
    (p.poverty ?? 0) * 0.22 +
      (p.unemployment ?? 0) * 0.22 +
      (p.migrationUrge ?? 0) * 0.12 +
      (p.foodInsecurity ?? 0) * 0.18 +
      (1 - (p.villageSecurity ?? 0.5)) * 0.12 +
      (p.harvestShock ?? 0) * 0.08 +
      (p.debtPressure ?? 0) * 0.06,
    0,
    1,
  )
}

/** Likelihood a desperate villager turns to petty crime / joins a gang. */
export function outlawAttraction(c: OutlawCandidate): number {
  const base = combinePressure(c.pressure)
  const trait =
    c.impulsivity * 0.35 + c.distrust * 0.25 + c.robustness * 0.15 + (c.employed ? 0 : 0.2)
  const wealthPenalty = clamp(c.wealth / 25, 0, 0.35)
  const life =
    c.lifeTag === 'Daren' || c.lifeTag === 'Kael' ? 0.12 : 0
  return clamp(base * 0.55 + trait * 0.45 + life - wealthPenalty, 0, 1)
}

export function shouldAttemptCrime(c: OutlawCandidate, roll: number): boolean {
  return roll < outlawAttraction(c) * 0.85
}
