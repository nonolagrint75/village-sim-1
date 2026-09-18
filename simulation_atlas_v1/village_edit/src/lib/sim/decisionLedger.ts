/**
 * CP1 — Exact decision ledger (MESURE D'ABORD).
 * Counts real noteChosenAction / orphan setTask assigns — NOT PROXY task.kind deltas.
 * Aggregate counters + optional sampled ring (soak-safe at 100 NPC x 60d).
 */
import { TICKS_PER_DAY } from './calendar'
import { getSimConfig } from './simConfig'
import type { SimState, TaskKind, Villager } from './types'

export type DecisionExactSource = 'chooseTask' | 'HARD' | 'setTask' | 'other'

export type DecisionExactSample = {
  seed: number
  tick: number
  day: number
  villagerId: number
  kind: TaskKind | string
  source: DecisionExactSource
  /** whyFactors length, or a short tag when absent */
  whyTag: string
  prevKind?: string | null
}

export type DecisionExactCounters = {
  /** Exact decision events (noteChosenAction + orphan setTask). PROXY must never write here. */
  decisionExactTotal: number
  decisionExactBySource: Record<DecisionExactSource, number>
  /** All setTask assigns (coverage denominator). */
  decisionSetTaskAssigns: number
  /** All noteChosenAction hooks. */
  decisionNoteChosenActions: number
  /** setTask assigns that never got a following noteChosenAction (flushed as source=setTask). */
  decisionOrphanSetTask: number
  /** Sampled ring (last N kept; also 1/K subsample on record). */
  sampleRing: DecisionExactSample[]
}

const SAMPLE_RING_MAX = 48
const SAMPLE_EVERY_K = 32

let bound: SimState | null = null
let orphanPending: {
  villagerId: number
  kind: TaskKind
  prevKind: string | null
} | null = null

export function emptyDecisionExactCounters(): DecisionExactCounters {
  return {
    decisionExactTotal: 0,
    decisionExactBySource: {
      chooseTask: 0,
      HARD: 0,
      setTask: 0,
      other: 0,
    },
    decisionSetTaskAssigns: 0,
    decisionNoteChosenActions: 0,
    decisionOrphanSetTask: 0,
    sampleRing: [],
  }
}

/** Bind / re-bind the live SimState for hooks that lack a state arg (noteChosenAction). */
export function bindDecisionLedger(state: SimState): void {
  if (bound && bound !== state) flushOrphanSetTask()
  bound = state
}

export function unbindDecisionLedger(): void {
  flushOrphanSetTask()
  bound = null
}

export function snapshotDecisionExact(state: SimState): DecisionExactCounters {
  return {
    decisionExactTotal: state.decisionExact.decisionExactTotal,
    decisionExactBySource: { ...state.decisionExact.decisionExactBySource },
    decisionSetTaskAssigns: state.decisionExact.decisionSetTaskAssigns,
    decisionNoteChosenActions: state.decisionExact.decisionNoteChosenActions,
    decisionOrphanSetTask: state.decisionExact.decisionOrphanSetTask,
    sampleRing: state.decisionExact.sampleRing.slice(),
  }
}

/** % of setTask assigns paired with noteChosenAction (orphan-aware). */
export function decisionExactCoveragePct(state: SimState): number {
  const d = state.decisionExact
  if (d.decisionSetTaskAssigns <= 0) return d.decisionNoteChosenActions > 0 ? 100 : 0
  const covered = d.decisionSetTaskAssigns - d.decisionOrphanSetTask
  return +((100 * covered) / d.decisionSetTaskAssigns).toFixed(2)
}

function inferSource(factorWhy?: string[], whyExtra?: string): DecisionExactSource {
  if (factorWhy && factorWhy.length > 0 && factorWhy[0] === 'HARD') return 'HARD'
  if (factorWhy && factorWhy.length > 0) return 'chooseTask'
  if (whyExtra && (whyExtra.includes(' · T ') || /^U \d/.test(whyExtra) || whyExtra.includes('anti-AFK'))) {
    return 'chooseTask'
  }
  return 'other'
}

function whyTagOf(factorWhy?: string[], whyExtra?: string): string {
  if (factorWhy && factorWhy.length > 0) return 'n=' + factorWhy.length
  if (whyExtra && whyExtra.length) return 'extra:' + whyExtra.slice(0, 24)
  return 'n=0'
}

function pushSample(state: SimState, sample: DecisionExactSample): void {
  const ring = state.decisionExact.sampleRing
  if (state.decisionExact.decisionExactTotal % SAMPLE_EVERY_K !== 1 && ring.length >= SAMPLE_RING_MAX) {
    return
  }
  ring.push(sample)
  while (ring.length > SAMPLE_RING_MAX) ring.shift()
}

function recordExact(
  state: SimState,
  opts: {
    villagerId: number
    kind: TaskKind | string
    source: DecisionExactSource
    whyTag: string
    prevKind?: string | null
  },
): void {
  const d = state.decisionExact
  d.decisionExactTotal += 1
  d.decisionExactBySource[opts.source] += 1
  const seed = getSimConfig().seed
  pushSample(state, {
    seed,
    tick: state.tick,
    day: Math.floor(state.tick / TICKS_PER_DAY),
    villagerId: opts.villagerId,
    kind: opts.kind,
    source: opts.source,
    whyTag: opts.whyTag,
    prevKind: opts.prevKind ?? null,
  })
}

/** Called from setTask — coverage + orphan tracking. Does not double-count with noteChosenAction. */
export function noteSetTaskAssign(v: Villager, kind: TaskKind, prevKind: string | null): void {
  if (!bound) return
  flushOrphanSetTask()
  bound.decisionExact.decisionSetTaskAssigns += 1
  orphanPending = { villagerId: v.id, kind, prevKind }
}

/** Called from noteChosenAction — primary exact ledger. */
export function noteDecisionExact(
  v: Villager,
  kind: TaskKind,
  whyExtra?: string,
  factorWhy?: string[],
): void {
  if (!bound) return
  const paired =
    orphanPending !== null && orphanPending.villagerId === v.id && orphanPending.kind === kind
  const prevKind = paired ? orphanPending!.prevKind : v.task?.kind ?? null
  orphanPending = null
  bound.decisionExact.decisionNoteChosenActions += 1
  recordExact(bound, {
    villagerId: v.id,
    kind,
    source: inferSource(factorWhy, whyExtra),
    whyTag: whyTagOf(factorWhy, whyExtra),
    prevKind,
  })
}

/** Flush setTask assigns that never received noteChosenAction (source=setTask). */
export function flushOrphanSetTask(): void {
  if (!bound || !orphanPending) return
  const pending = orphanPending
  orphanPending = null
  bound.decisionExact.decisionOrphanSetTask += 1
  recordExact(bound, {
    villagerId: pending.villagerId,
    kind: pending.kind,
    source: 'setTask',
    whyTag: 'orphan-setTask',
    prevKind: pending.prevKind,
  })
}
