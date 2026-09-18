/**
 * Phase 7 WAVE 3 - pure pricing / demand pressure helpers.
 * No sim mutation; DemandTag urgency types from needsDemand.
 *
 * INTEGRATION NOTE (orchestrator): re-export via wave3Market.ts.
 */
import type { DemandTag, DemandUrgency } from './needsDemand'

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0
  return Math.max(0, Math.min(1, v))
}

/**
 * Net margin after transport: sell - buy - transportCost.
 * Positive = profitable arbitrage signal.
 */
export function expectedMargin(buy: number, sell: number, transportCost: number): number {
  const b = Number.isFinite(buy) ? buy : 0
  const s = Number.isFinite(sell) ? sell : 0
  const t = Number.isFinite(transportCost) ? transportCost : 0
  return s - b - t
}

/**
 * Demand pressure for one DemandTag channel urgency vs a supply proxy -> 0..1.
 * `urgency` is a single DemandUrgency[DemandTag] value (0..1).
 * Higher supplyProxy dampens pressure; zero supply keeps full urgency pressure.
 */
export function demandPressure(urgency: number, supplyProxy: number): number {
  const u = clamp01(urgency)
  const supply = Number.isFinite(supplyProxy) ? Math.max(0, supplyProxy) : 0
  return clamp01(u / (1 + supply))
}

/** Pressure for one DemandTag from a full DemandUrgency map. */
export function demandPressureForTag(
  urgency: DemandUrgency,
  tag: DemandTag,
  supplyProxy: number,
): number {
  return demandPressure(urgency[tag] ?? 0, supplyProxy)
}
