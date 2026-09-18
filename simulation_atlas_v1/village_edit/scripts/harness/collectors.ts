/**
 * Stub collectors for WP1 — compile-safe no-op hooks.
 * Real sampling lands in later WPs (decide/HARD wrap optional).
 */

export type DecisionSample = {
  tick: number
  villagerId?: number
  taskKind?: string
  hard?: boolean
}

export type WhyFactorsSnapshot = {
  tick: number
  villagerId?: number
  factors: Record<string, number> | null
}

/** Counts decision / HARD assign samples for sec20 decision floor. */
export class DecisionCounter {
  samples: DecisionSample[] = []
  record(sample: DecisionSample): void {
    this.samples.push(sample)
  }
  get count(): number {
    return this.samples.length
  }
  reset(): void {
    this.samples = []
  }
}

/** Task-kind histogram + Shannon entropy over observed starts/ticks. */
export class TaskEntropyHook {
  private counts = new Map<string, number>()
  observe(taskKind: string | null | undefined): void {
    if (!taskKind) return
    this.counts.set(taskKind, (this.counts.get(taskKind) ?? 0) + 1)
  }
  uniqueKinds(): number {
    return this.counts.size
  }
  /** Shannon entropy in bits; null if empty. */
  entropy(): number | null {
    let total = 0
    for (const n of this.counts.values()) total += n
    if (total <= 0) return null
    let h = 0
    for (const n of this.counts.values()) {
      const p = n / total
      h -= p * Math.log2(p)
    }
    return h
  }
  histogram(): Record<string, number> {
    return Object.fromEntries(this.counts.entries())
  }
  reset(): void {
    this.counts.clear()
  }
}

/**
 * Retains last whyFactors bags observed at assign time.
 * No-op until probes/engine push snapshots — compiles and aggregates.
 */
export class WhyFactorsRetention {
  private buffer: WhyFactorsSnapshot[] = []
  readonly maxKeep: number
  constructor(maxKeep = 256) {
    this.maxKeep = maxKeep
  }
  retain(snap: WhyFactorsSnapshot): void {
    this.buffer.push(snap)
    if (this.buffer.length > this.maxKeep) this.buffer.shift()
  }
  get size(): number {
    return this.buffer.length
  }
  recent(n = 10): WhyFactorsSnapshot[] {
    return this.buffer.slice(-n)
  }
  reset(): void {
    this.buffer = []
  }
}

/** Bundle used by harness runners / probe adapters. */
export type TelemetryCollector = {
  decisions: DecisionCounter
  taskEntropy: TaskEntropyHook
  whyFactors: WhyFactorsRetention
  society?: SocietyMetricsHook
}

export function createTelemetryCollector(): TelemetryCollector {
  return {
    decisions: new DecisionCounter(),
    taskEntropy: new TaskEntropyHook(),
    whyFactors: new WhyFactorsRetention(),
    society: new SocietyMetricsHook(),
  }
}

/**
 * WP10 society metrics hook — snapshots SimState.societyCounters / longevity.
 * Prefer importing snapshotSocietyMetrics from sim for full typed snapshot.
 */
export class SocietyMetricsHook {
  last: Record<string, number | string | null> | null = null
  observe(snap: {
    livingCircles?: number
    livingInstitutions?: number
    institutionsAgeGe30d?: number
    circlePeakAgeDays?: number
    institutionPeakAgeDays?: number
    creedChanges?: number
    creedBehaviorFollowups?: number
    conflictsTotal?: number
    distinctConflictCauses?: number
    banditUnlockCalendar?: number
    banditUnlockPressure?: number
  }): void {
    this.last = {
      livingCircles: snap.livingCircles ?? 0,
      livingInstitutions: snap.livingInstitutions ?? 0,
      institutionsAgeGe30d: snap.institutionsAgeGe30d ?? 0,
      circlePeakAgeDays: snap.circlePeakAgeDays ?? 0,
      institutionPeakAgeDays: snap.institutionPeakAgeDays ?? 0,
      creedChanges: snap.creedChanges ?? 0,
      creedBehaviorFollowups: snap.creedBehaviorFollowups ?? 0,
      conflictsTotal: snap.conflictsTotal ?? 0,
      distinctConflictCauses: snap.distinctConflictCauses ?? 0,
      banditUnlockCalendar: snap.banditUnlockCalendar ?? 0,
      banditUnlockPressure: snap.banditUnlockPressure ?? 0,
    }
  }
  reset(): void {
    this.last = null
  }
}

