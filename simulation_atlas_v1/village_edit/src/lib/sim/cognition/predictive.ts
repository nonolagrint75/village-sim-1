/**
 * Predictive processing lite + Wave B world-model 1-step.
 * Needs PE = homeostatic remaps; model PE = expected − observed after outcomes.
 * estimateTaskOutcome = heuristic P(success)/danger — NOT full P(S'|S,A) / MCTS / Bayes.
 */

import type { Memory } from '../social'
import type { TaskKind } from '../types'
import { distance } from '../world'
import { knownSpots, skillForTask } from './memory'
import type {
  CognitiveState,
  NeedPressures,
  PredictedOutcome,
  PredictionError,
  PredictionErrorKind,
} from './types'

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

const EMPTY_OUTCOME: PredictedOutcome = {
  kind: null,
  success: 0.45,
  danger: 0.15,
  expected: 0.4,
}

export function emptyPredictedOutcome(): PredictedOutcome {
  return { ...EMPTY_OUTCOME }
}

/** Spot proximity weight within radius (cheap linear falloff). */
function spotPull(
  spots: { x: number; y: number; weight: number }[],
  x: number,
  y: number,
  radius: number,
): number {
  let best = 0
  for (const s of spots) {
    const d = distance(x, y, s.x, s.y)
    if (d > radius) continue
    const w = s.weight * (1 - d / radius)
    if (w > best) best = w
  }
  return Math.min(1, best)
}

/**
 * Wave B1 — lite local forecast for one (kind, x, y).
 * Heuristic from skills, known spots, habits, recent success ratio, affect.
 */
export function estimateTaskOutcome(
  mind: CognitiveState,
  kind: TaskKind,
  x: number,
  y: number,
  legacy: Memory[] | null = null,
): PredictedOutcome {
  const sk = skillForTask(kind)
  const skill = sk ? mind.skills[sk] : 0.35
  const habit = mind.habits[kind] ?? 0
  const total = mind.successes + mind.failures
  const recentRate = total > 0 ? mind.successes / total : 0.5

  let success = 0.38 + skill * 0.42 + habit * 0.18 + (recentRate - 0.5) * 0.16
  let danger = 0.08 + mind.emotions.fear * 0.22 + mind.emotions.stress * 0.12 + mind.needs.safety * 0.28

  const goods = knownSpots(mind.semantic, mind.episodic, legacy, 'good')
  const dangers = knownSpots(mind.semantic, mind.episodic, legacy, 'danger')
  const poors = knownSpots(mind.semantic, mind.episodic, legacy, 'poor')
  const goodNear = spotPull(goods, x, y, 16)
  const dangerNear = spotPull(dangers, x, y, 14)
  const poorNear = spotPull(poors, x, y, 14)

  const forage =
    kind === 'gatherFood' ||
    kind === 'gatherWood' ||
    kind === 'fish' ||
    kind === 'harvestWheat' ||
    kind === 'clearLand' ||
    kind === 'gatherStone' ||
    kind === 'gatherIron' ||
    kind === 'gatherFuel'
  if (forage) {
    success += goodNear * 0.22 - poorNear * 0.18
    danger += dangerNear * 0.35
  }
  if (kind === 'flee' || kind === 'fight' || kind === 'defend' || kind === 'confront') {
    danger += dangerNear * 0.25 + mind.needs.safety * 0.15
    success += (sk === 'fight' ? skill * 0.15 : 0) - dangerNear * 0.12
  }
  if (kind === 'rest' || kind === 'eat' || kind === 'takeFromChest') {
    success += 0.12 - mind.emotions.stress * 0.08
    danger *= 0.55
  }
  if (kind === 'idle' || kind === 'socialise' || kind === 'entertain') {
    success += 0.05 - mind.needs.hunger * 0.2 - mind.needs.fatigue * 0.12
  }

  // Mild bleed of last model PE: after a miss, damp confidence for same kind.
  if (mind.predictedOutcome.kind === kind && mind.modelPredictionError < -0.15) {
    success -= Math.min(0.12, -mind.modelPredictionError * 0.2)
  } else if (mind.predictedOutcome.kind === kind && mind.modelPredictionError > 0.15) {
    success += Math.min(0.08, mind.modelPredictionError * 0.12)
  }

  success = clamp01(success)
  danger = clamp01(danger)
  const expected = clamp01(success * (1 - danger * 0.55))
  return { kind, success, danger, expected }
}

/** Expected-utility multiplier for imagination / scoring (≈0.55–1.35). */
export function outcomeUtilityMult(est: PredictedOutcome): number {
  return 0.55 + est.expected * 0.8 - est.danger * 0.25
}

/** Store forecast on mind (B1) — call when act is chosen. */
export function storePredictedOutcome(mind: CognitiveState, est: PredictedOutcome): void {
  mind.predictedOutcome.kind = est.kind
  mind.predictedOutcome.success = est.success
  mind.predictedOutcome.danger = est.danger
  mind.predictedOutcome.expected = est.expected
}

/**
 * Wave B3 — model PE = expected − observed (observed 1 success / 0 fail).
 * Updates signed modelPredictionError (EMA) for next ticks / PE list.
 */
export function recordModelPredictionError(mind: CognitiveState, observedSuccess: boolean): number {
  const expected =
    mind.predictedOutcome.kind !== null ? mind.predictedOutcome.expected : 0.45
  const observed = observedSuccess ? 1 : 0
  const pe = expected - observed
  // EMA so one fluke doesn't dominate.
  mind.modelPredictionError = mind.modelPredictionError * 0.55 + pe * 0.45
  return pe
}

/** Decay signed model PE each cognition tick. */
export function decayModelPredictionError(mind: CognitiveState): void {
  mind.modelPredictionError *= 0.9
  if (Math.abs(mind.modelPredictionError) < 0.02) mind.modelPredictionError = 0
}

/**
 * Build ranked prediction errors.
 * Homeostatic needs + optional Wave B model PE channel (magnitude = |expected−observed|).
 */
export function computePredictionErrors(
  needs: NeedPressures,
  modelPredictionError = 0,
): PredictionError[] {
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
  const modelMag = clamp01(Math.abs(modelPredictionError))
  if (modelMag >= 0.12) {
    const precision = clamp01(0.35 + modelMag * 0.65)
    out.push({
      kind: 'task_model',
      magnitude: modelMag,
      precision,
      weighted: modelMag * precision,
      label: modelPredictionError < 0 ? 'surprise — pire que prévu' : 'surprise — mieux que prévu',
    })
  }
  out.sort((a, b) => b.weighted - a.weighted)
  return out.slice(0, 6)
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
