/**
 * WP10 society instrumentation (secs 34-37).
 * Cheap counters only: group longevity, creed->score followups, conflict taxonomy.
 * No CREATE_X; no farm/mill/brain soft changes.
 */
import { TICKS_PER_DAY } from './calendar'
import type { SimState } from './types'
import {
  noteCausalityCreedChange,
  noteCausalityCreedFollowup,
  noteCreedChildBehaviorInfluenced as noteCausalityCreedChildBehaviorInfluenced,
  noteCreedParentChildTransmission as noteCausalityCreedParentChildTransmission,
} from './causalityMetrics'

/** Conflict cause tags for sec37 taxonomy (identifiable != random). */
export type ConflictCause =
  | 'raid'
  | 'confront'
  | 'theft_feud'
  | 'succession'
  | 'rivalry'
  | 'territory_absorb'
  | 'schism'
  | 'exclusion'
  | 'war'
  | 'war_battle'
  | 'war_end'
  | 'coup'
  | 'alliance_vs_third'

export type SocietyCounters = {
  circlesFormed: number
  circlesDissolved: number
  /** Max circle age (ticks) observed at dissolve or via snapshot refresh. */
  circlePeakAgeTicks: number
  institutionsFormed: number
  institutionsDissolved: number
  institutionPeakAgeTicks: number
  /** Institutions that reached >=30 days while alive (or at dissolve). */
  institutionsLived30d: number
  circleJoins: number
  circleDrops: number
  creedChanges: number
  /** Creed change -> matching task-kind scored within followup window (attribution lite). */
  creedBehaviorFollowups: number
  conflictsTotal: number
  conflictsByCause: Record<ConflictCause, number>
  /** Band formation unlock path counts (anti-script honesty). */
  banditUnlockCalendar: number
  banditUnlockPressure: number
}

const EMPTY_CAUSES: Record<ConflictCause, number> = {
  raid: 0,
  confront: 0,
  theft_feud: 0,
  succession: 0,
  rivalry: 0,
  territory_absorb: 0,
  schism: 0,
  exclusion: 0,
  war: 0,
  war_battle: 0,
  war_end: 0,
  coup: 0,
  alliance_vs_third: 0,
}

export function emptySocietyCounters(): SocietyCounters {
  return {
    circlesFormed: 0,
    circlesDissolved: 0,
    circlePeakAgeTicks: 0,
    institutionsFormed: 0,
    institutionsDissolved: 0,
    institutionPeakAgeTicks: 0,
    institutionsLived30d: 0,
    circleJoins: 0,
    circleDrops: 0,
    creedChanges: 0,
    creedBehaviorFollowups: 0,
    conflictsTotal: 0,
    conflictsByCause: { ...EMPTY_CAUSES },
    banditUnlockCalendar: 0,
    banditUnlockPressure: 0,
  }
}

export function ensureSocietyCounters(state: SimState): SocietyCounters {
  if (!state.societyCounters) {
    state.societyCounters = emptySocietyCounters()
  } else if (!state.societyCounters.conflictsByCause) {
    state.societyCounters.conflictsByCause = { ...EMPTY_CAUSES }
  }
  return state.societyCounters
}

const DAY_30 = TICKS_PER_DAY * 30

export function noteCircleFormed(state: SimState): void {
  ensureSocietyCounters(state).circlesFormed += 1
}

export function noteInstitutionFormed(state: SimState): void {
  ensureSocietyCounters(state).institutionsFormed += 1
}

export function noteCircleJoin(state: SimState): void {
  ensureSocietyCounters(state).circleJoins += 1
}

export function noteCircleDrop(state: SimState): void {
  ensureSocietyCounters(state).circleDrops += 1
}

/** Call when a circle is removed; records longevity peaks. */
export function noteCircleDissolved(
  state: SimState,
  opts: { formedTick: number; isInstitution: boolean },
): void {
  const c = ensureSocietyCounters(state)
  const age = Math.max(0, state.tick - opts.formedTick)
  c.circlesDissolved += 1
  if (age > c.circlePeakAgeTicks) c.circlePeakAgeTicks = age
  if (opts.isInstitution) {
    c.institutionsDissolved += 1
    if (age > c.institutionPeakAgeTicks) c.institutionPeakAgeTicks = age
    if (age >= DAY_30) c.institutionsLived30d += 1
  }
}

export function noteCreedChange(state: SimState, npcId?: number): void {
  ensureSocietyCounters(state).creedChanges += 1
  noteCausalityCreedChange(state, npcId)
}

export function noteCreedBehaviorFollowup(state: SimState, npcId?: number): void {
  ensureSocietyCounters(state).creedBehaviorFollowups += 1
  noteCausalityCreedFollowup(state, npcId)
}

/** DP11: parent→child creed acquisition (natural; no birth force). */
export function noteCreedParentChildTransmission(
  state: SimState,
  childId: number,
  depth: number,
): void {
  noteCausalityCreedParentChildTransmission(state, childId, depth)
}

/** DP11: child with parent-sourced creed scores a creed-matching task. */
export function noteCreedChildBehaviorInfluenced(state: SimState, childId: number): void {
  noteCausalityCreedChildBehaviorInfluenced(state, childId)
}

export function noteConflict(state: SimState, cause: ConflictCause): void {
  const c = ensureSocietyCounters(state)
  c.conflictsTotal += 1
  c.conflictsByCause[cause] = (c.conflictsByCause[cause] ?? 0) + 1
}

export function noteBanditUnlock(state: SimState, path: 'calendar' | 'pressure'): void {
  const c = ensureSocietyCounters(state)
  if (path === 'calendar') c.banditUnlockCalendar += 1
  else c.banditUnlockPressure += 1
}

/** Refresh peak ages from living circles (probe / harness). */
export function refreshSocietyLongevitySnapshot(state: SimState): void {
  const c = ensureSocietyCounters(state)
  for (const circ of state.circles) {
    const age = Math.max(0, state.tick - circ.formedTick)
    if (age > c.circlePeakAgeTicks) c.circlePeakAgeTicks = age
    if (circ.isInstitution && age > c.institutionPeakAgeTicks) {
      c.institutionPeakAgeTicks = age
    }
  }
}

export type SocietyMetricsSnapshot = {
  counters: SocietyCounters
  livingCircles: number
  livingInstitutions: number
  livingInstitutionKinds: string[]
  institutionsAgeGe30d: number
  circlePeakAgeDays: number
  institutionPeakAgeDays: number
  distinctConflictCauses: number
  identifiableConflictShare: number
  creedFollowupRate: number | null
}

export function snapshotSocietyMetrics(state: SimState): SocietyMetricsSnapshot {
  refreshSocietyLongevitySnapshot(state)
  const counters = ensureSocietyCounters(state)
  const livingInst = state.circles.filter((c) => c.isInstitution)
  const kinds = [...new Set(livingInst.map((c) => (c.isGuild ? 'guild' : c.kind)))]
  const ageGe30 = livingInst.filter((c) => state.tick - c.formedTick >= DAY_30).length
  const causeEntries = Object.entries(counters.conflictsByCause).filter(([, n]) => n > 0)
  const distinct = causeEntries.length
  const total = counters.conflictsTotal
  const identifiable = total > 0 ? 1 : 0
  return {
    counters: { ...counters, conflictsByCause: { ...counters.conflictsByCause } },
    livingCircles: state.circles.length,
    livingInstitutions: livingInst.length,
    livingInstitutionKinds: kinds,
    institutionsAgeGe30d: ageGe30,
    circlePeakAgeDays: +(counters.circlePeakAgeTicks / TICKS_PER_DAY).toFixed(2),
    institutionPeakAgeDays: +(counters.institutionPeakAgeTicks / TICKS_PER_DAY).toFixed(2),
    distinctConflictCauses: distinct,
    identifiableConflictShare: identifiable,
    creedFollowupRate:
      counters.creedChanges > 0
        ? +(counters.creedBehaviorFollowups / counters.creedChanges).toFixed(3)
        : null,
  }
}
