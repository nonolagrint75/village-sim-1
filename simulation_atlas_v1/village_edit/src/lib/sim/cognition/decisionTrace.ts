/**
 * Optional decision tracer - OFF by default.
 * Cognition-local only; behaviors can call later without being required to.
 *
 * Usage (from console / future behaviors wire):
 *   setDecisionTraceEnabled(true)
 *   ... run ticks ...
 *   const samples = drainDecisionTrace()
 */

import type { TaskKind } from '../types'

export type DecisionTraceSample = {
  tick: number
  villagerId: number
  chosen: TaskKind
  utility: number
  temperature: number
  optionCount: number
  /** Top-K utilities before softmax (kind + util). */
  top: { kind: TaskKind; utility: number }[]
  whyFactors: string[]
  backend: 'cpu' | 'webgpu'
}

const MAX_SAMPLES = 96
let enabled = false
let ring: DecisionTraceSample[] = []

export function setDecisionTraceEnabled(on: boolean): void {
  enabled = on
  if (!on) ring = []
}

export function isDecisionTraceEnabled(): boolean {
  return enabled
}

export function noteDecisionTrace(sample: DecisionTraceSample): void {
  if (!enabled) return
  ring.push(sample)
  if (ring.length > MAX_SAMPLES) ring.splice(0, ring.length - MAX_SAMPLES)
}

/** Copy + clear. */
export function drainDecisionTrace(): DecisionTraceSample[] {
  const out = ring
  ring = []
  return out
}

/** Read-only peek (does not clear). */
export function peekDecisionTrace(): readonly DecisionTraceSample[] {
  return ring
}

export function clearDecisionTrace(): void {
  ring = []
}

/** Compact summary for audit / console. */
export function summarizeDecisionTrace(samples: readonly DecisionTraceSample[] = ring): {
  n: number
  byKind: Record<string, number>
  meanT: number
  meanOptions: number
} {
  const byKind: Record<string, number> = {}
  let sumT = 0
  let sumOpts = 0
  for (const s of samples) {
    byKind[s.chosen] = (byKind[s.chosen] ?? 0) + 1
    sumT += s.temperature
    sumOpts += s.optionCount
  }
  const n = samples.length
  return {
    n,
    byKind,
    meanT: n ? sumT / n : 0,
    meanOptions: n ? sumOpts / n : 0,
  }
}
