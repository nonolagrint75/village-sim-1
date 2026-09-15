/**
 * Executive control (PFC-like inhibition).
 * Suppresses impulsive steal/fight/confront when norms internalized —
 * unless stress / fear / anger overwhelm control.
 */

import { politicsOf } from '../politics'
import type { Villager } from '../types'
import type { CognitiveState, ProcessMode } from './types'
import { workspaceLoad } from './workspace'

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

/**
 * Dual-process mode: stress, fatigue, workspace load → System-1 habitual.
 * Low load + rest → System-2 deliberative.
 */
export function resolveProcessMode(
  mind: CognitiveState,
  depth: 'fast' | 'deep',
): ProcessMode {
  const stress = mind.emotions.stress
  const fatigue = mind.needs.fatigue
  const load = workspaceLoad(mind.broadcast)
  const s1Pressure = stress * 0.45 + fatigue * 0.3 + load * 0.35 + mind.emotions.fear * 0.15
  if (depth === 'fast') return 'S1'
  if (s1Pressure > 0.62) return 'S1'
  if (stress < 0.35 && fatigue < 0.4 && mind.goal.commitment > 12) return 'S2'
  return s1Pressure > 0.42 ? 'S1' : 'S2'
}

/**
 * Control strength 0–1: internalization & honor vs affective overwhelm.
 */
export function executiveStrength(v: Villager, mind: CognitiveState): number {
  const pol = politicsOf(v)
  const base =
    pol.normInternalization * 0.55 +
    mind.values.honor * 0.25 +
    pol.beliefs.fairness * 0.2
  const overwhelm =
    mind.emotions.stress * 0.4 +
    mind.emotions.anger * 0.35 +
    mind.emotions.fear * 0.2 +
    mind.needs.hunger * 0.25
  return clamp01(base - overwhelm * 0.85)
}

/**
 * Multiplier on impulsive antisocial acts. High control → strong inhibition.
 * Under overwhelm, control collapses (stress → S1).
 */
export function executiveInhibit(
  v: Villager,
  mind: CognitiveState,
  kind: string,
): number {
  if (kind !== 'steal' && kind !== 'confront' && kind !== 'fight') return 1
  const ctrl = executiveStrength(v, mind)
  if (kind === 'steal') return Math.max(0.12, 1 - ctrl * 0.85)
  if (kind === 'confront') return Math.max(0.2, 1 - ctrl * 0.55)
  // fight: milder inhibition — sometimes necessary; still tempered by control
  return Math.max(0.35, 1 - ctrl * 0.35)
}

export function processModeLabelFr(mode: ProcessMode): string {
  return mode === 'S1' ? 'S1 habituel / réactif' : 'S2 délibératif'
}
