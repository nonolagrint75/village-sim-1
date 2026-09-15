/**
 * Predictive processing / interoception lite.
 * Needs = prediction errors (expected vs sensed homeostatic state).
 * Precision weighting: high-error channels dominate attention & action.
 */

import type { NeedPressures, PredictionError, PredictionErrorKind } from './types'

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

const NEED_TO_PE: { need: keyof NeedPressures; kind: PredictionErrorKind; label: string }[] = [
  { need: 'hunger', kind: 'hunger', label: 'erreur faim' },
  { need: 'fatigue', kind: 'fatigue', label: 'erreur fatigue' },
  { need: 'safety', kind: 'cold_threat', label: 'erreur menace / froid' },
  { need: 'shelter', kind: 'shelter', label: 'erreur abri' },
  { need: 'social', kind: 'social', label: 'erreur lien social' },
  { need: 'belonging', kind: 'belonging', label: 'erreur appartenance' },
  { need: 'status', kind: 'status', label: 'erreur statut' },
  { need: 'light', kind: 'darkness', label: 'erreur obscurité' },
  { need: 'warmth', kind: 'cold_comfort', label: 'erreur froid / feu' },
]

/**
 * Build ranked prediction errors. Magnitude ≈ need pressure;
 * precision rises with magnitude (active inference: attend to surprising errors).
 */
export function computePredictionErrors(needs: NeedPressures): PredictionError[] {
  const out: PredictionError[] = []
  for (const row of NEED_TO_PE) {
    const magnitude = clamp01(needs[row.need])
    if (magnitude < 0.12) continue
    const precision = clamp01(0.25 + magnitude * 0.75)
    out.push({
      kind: row.kind,
      magnitude,
      precision,
      weighted: magnitude * precision,
      label: row.label,
    })
  }
  out.sort((a, b) => b.weighted - a.weighted)
  return out.slice(0, 5)
}

/** Precision-weighted pull of a PE kind into action (0–1). */
export function peWeight(errors: PredictionError[], kind: PredictionErrorKind): number {
  let best = 0
  for (const e of errors) {
    if (e.kind === kind && e.weighted > best) best = e.weighted
  }
  return best
}

export function topPredictionErrors(errors: PredictionError[], n = 3): PredictionError[] {
  return errors.slice(0, n)
}
