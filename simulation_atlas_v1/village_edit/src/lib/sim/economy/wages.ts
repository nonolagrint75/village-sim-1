/**
 * Phase 7 WAVE 3 - wage score helpers (reservation vs employer offer).
 * Pure scores only — no payroll mutation, no coin transfers.
 *
 * Units: scores are unitless (~0.12–~2), NOT coins. Live payroll in
 * build/npcBuildBehaviors.payHelper still transfers a flat 1 coin when
 * wageWouldClear passes — these helpers only gate hire/pay eligibility.
 */

import { mindOf } from '../cognition/mindPool'
import type { ProceduralSkill } from '../cognition/types'
import type { Villager } from '../types'
import { estimateDecisionWealth } from './wealthLedger'
import { demandFromVillager } from './needsDemand'

const SKILL_KEYS: readonly ProceduralSkill[] = [
  'chop',
  'build',
  'trade',
  'fish',
  'mine',
  'craft',
  'farm',
  'fight',
  'social',
]

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(1, v))
}

function meanSkill(v: Villager): number {
  const skills = mindOf(v).skills
  let sum = 0
  for (const k of SKILL_KEYS) sum += skills[k] ?? 0
  return sum / SKILL_KEYS.length
}

/**
 * Worker's reservation wage score from skills + demand polarity.
 * Skill / status pride raise the ask; food/shelter/medicine desperation
 * lowers it (classic labor-supply: hungry workers accept cheaper hire).
 * Returns a unitless score in roughly [0.12, ~2]; not coins.
 */
export function reservationWage(v: Villager): number {
  const skill = meanSkill(v)
  const d = demandFromVillager(v)
  const desperation = clamp01(Math.max(d.food, d.shelter * 0.7, d.medicine * 0.5))
  const pride = clamp01(Math.max(d.luxury, d.social * 0.4, d.clothing * 0.35))
  return Math.max(0.12, 0.25 + skill * 1.1 - desperation * 0.45 + pride * 0.35)
}

/**
 * Employer's offer score from productivity and a profit proxy.
 * Pure; caller supplies both numbers. No state / inventory mutation.
 * Common call shape: employerOffer(prod, estimateDecisionWealth(owner) * 0.05).
 */
export function employerOffer(productivity: number, profitProxy: number): number {
  const prod = Number.isFinite(productivity) ? Math.max(0, productivity) : 0
  const profit = Number.isFinite(profitProxy) ? Math.max(0, profitProxy) : 0
  // Offer scales with what the worker produces and what the firm can spare.
  return prod * 0.85 + profit * 0.4
}

/**
 * Convenience: offer from ecology decision-wealth (same proxy build/ already uses).
 * Prefer this over hand-rolling wealth*0.05 so economy + build stay aligned.
 */
export function employerOfferFromDecisionWealth(owner: Villager, productivity: number): number {
  return employerOffer(productivity, estimateDecisionWealth(owner) * 0.05)
}

/** True when employerOffer meets or exceeds reservationWage (no hire side effects). */
export function wageWouldClear(reservation: number, offer: number): boolean {
  return offer + 1e-9 >= reservation
}