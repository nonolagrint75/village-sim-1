/**
 * WP11 migration instrumentation (sec33) + Phase5 DP7 leave->camp stages.
 * Cheap counters: urge bands vs leave / found / rejoin acts with cause tags.
 * No CREATE_MIGRATE; no forced exodus; never `if leave: createCamp`.
 *
 * Design (INC-04): camp founding is hearth secession — only housed leavers
 * call foundMigrateCamp. Homeless leave -> travel -> dest eval -> rejoin|fail.
 */
import type { SimState } from './types'
import {
  noteCausalityMigrateDestEval,
  noteCausalityMigrateFail,
  noteCausalityMigrateFound,
  noteCausalityMigrateHomelessLeave,
  noteCausalityMigrateHousedLeave,
  noteCausalityMigrateLeave,
  noteCausalityMigrateLeaveAttempt,
  noteCausalityMigrateRejoin,
  noteCausalityMigrateSettlementAttempt,
  noteCausalityMigrateTravel,
  noteCausalityMigrateUrgeCross,
} from './causalityMetrics'

/** Identifiable leave / block causes for telemetry (not scripted events). */
export type MigrateLeaveCause =
  | 'famine'
  | 'low_sol'
  | 'unemployment'
  | 'crowding'
  | 'cohesion'
  | 'oppression'
  | 'pull_elsewhere'
  | 'grievance'
  | 'mixed'

export type MigrateBlockCause =
  | 'below_threshold'
  | 'home_loyalty'
  | 'elder'
  | 'low_curiosity'
  | 'job_field'

/** Destination-eval / settle factor tags (DP7 stage reasons). */
export type MigrateStageReason =
  | 'resources'
  | 'space'
  | 'group'
  | 'safety'
  | 'needs'
  | 'relations'
  | 'colony'
  | 'distance'
  | 'hasHome'
  | 'no_home'
  | 'score_low'
  | 'no_candidate'
  | 'mixed'

export type MigrationCounters = {
  /** Samples where migrationUrge was observed in tickMigration. */
  urgeSamples: number
  urgeMax: number
  /** Edge upward crossings into bands. */
  urgeCross070: number
  urgeCross086: number
  urgeCross094: number
  /** leaveThreshold reached (candidate for leave decision). */
  leaveAttempts: number
  leaves: number
  leavesByCause: Record<MigrateLeaveCause, number>
  blockedBy: Record<MigrateBlockCause, number>
  rejoins: number
  foundCamps: number
  /** Distinct destination village ids after rejoin/found (lite). */
  distinctDestinations: number
  /** DP7: leave split by housing (camp path only if hasHome). */
  migrateHomelessLeave: number
  migrateHousedLeave: number
  /** DP7 stages after leave. */
  migrateTravelStarts: number
  migrateDestEvals: number
  migrateSettlementAttempts: number
  migrateFails: number
  /** Top reason tags for dest eval / settle block. */
  destReasons: Record<MigrateStageReason, number>
  settleBlockReasons: Record<MigrateStageReason, number>
  _destSeen?: Set<number>
}

const EMPTY_LEAVE: Record<MigrateLeaveCause, number> = {
  famine: 0,
  low_sol: 0,
  unemployment: 0,
  crowding: 0,
  cohesion: 0,
  oppression: 0,
  pull_elsewhere: 0,
  grievance: 0,
  mixed: 0,
}

const EMPTY_BLOCK: Record<MigrateBlockCause, number> = {
  below_threshold: 0,
  home_loyalty: 0,
  elder: 0,
  low_curiosity: 0,
  job_field: 0,
}

const EMPTY_STAGE: Record<MigrateStageReason, number> = {
  resources: 0,
  space: 0,
  group: 0,
  safety: 0,
  needs: 0,
  relations: 0,
  colony: 0,
  distance: 0,
  hasHome: 0,
  no_home: 0,
  score_low: 0,
  no_candidate: 0,
  mixed: 0,
}

/** Per-villager last urge band for edge-triggered crossings (0/1/2/3). */
const LAST_URGE_BAND = new Map<number, number>()

export function emptyMigrationCounters(): MigrationCounters {
  return {
    urgeSamples: 0,
    urgeMax: 0,
    urgeCross070: 0,
    urgeCross086: 0,
    urgeCross094: 0,
    leaveAttempts: 0,
    leaves: 0,
    leavesByCause: { ...EMPTY_LEAVE },
    blockedBy: { ...EMPTY_BLOCK },
    rejoins: 0,
    foundCamps: 0,
    distinctDestinations: 0,
    migrateHomelessLeave: 0,
    migrateHousedLeave: 0,
    migrateTravelStarts: 0,
    migrateDestEvals: 0,
    migrateSettlementAttempts: 0,
    migrateFails: 0,
    destReasons: { ...EMPTY_STAGE },
    settleBlockReasons: { ...EMPTY_STAGE },
  }
}

export function ensureMigrationCounters(state: SimState): MigrationCounters {
  if (!state.migrationCounters) {
    state.migrationCounters = emptyMigrationCounters()
  } else {
    const c = state.migrationCounters
    if (!c.leavesByCause) c.leavesByCause = { ...EMPTY_LEAVE }
    if (!c.blockedBy) c.blockedBy = { ...EMPTY_BLOCK }
    if (typeof c.migrateHomelessLeave !== 'number') c.migrateHomelessLeave = 0
    if (typeof c.migrateHousedLeave !== 'number') c.migrateHousedLeave = 0
    if (typeof c.migrateTravelStarts !== 'number') c.migrateTravelStarts = 0
    if (typeof c.migrateDestEvals !== 'number') c.migrateDestEvals = 0
    if (typeof c.migrateSettlementAttempts !== 'number') c.migrateSettlementAttempts = 0
    if (typeof c.migrateFails !== 'number') c.migrateFails = 0
    if (!c.destReasons) c.destReasons = { ...EMPTY_STAGE }
    if (!c.settleBlockReasons) c.settleBlockReasons = { ...EMPTY_STAGE }
  }
  return state.migrationCounters
}

function urgeBand(urge: number): number {
  if (urge >= 0.94) return 3
  if (urge >= 0.86) return 2
  if (urge >= 0.7) return 1
  return 0
}

export function noteMigrateUrgeSample(state: SimState, villagerId: number, urge: number): void {
  const c = ensureMigrationCounters(state)
  c.urgeSamples += 1
  if (urge > c.urgeMax) c.urgeMax = urge
  const band = urgeBand(urge)
  const prev = LAST_URGE_BAND.get(villagerId) ?? 0
  if (band > prev) {
    if (band >= 1 && prev < 1) c.urgeCross070 += 1
    if (band >= 2 && prev < 2) c.urgeCross086 += 1
    if (band >= 3 && prev < 3) c.urgeCross094 += 1
    noteCausalityMigrateUrgeCross(state, villagerId)
  }
  LAST_URGE_BAND.set(villagerId, band)
}

export function noteMigrateLeaveAttempt(state: SimState, villagerId?: number): void {
  ensureMigrationCounters(state).leaveAttempts += 1
  noteCausalityMigrateLeaveAttempt(state, villagerId)
}

export function noteMigrateBlocked(state: SimState, cause: MigrateBlockCause): void {
  const c = ensureMigrationCounters(state)
  c.blockedBy[cause] = (c.blockedBy[cause] ?? 0) + 1
}

export function noteMigrateLeave(
  state: SimState,
  cause: MigrateLeaveCause,
  opts?: { housed?: boolean; villagerId?: number },
): void {
  const c = ensureMigrationCounters(state)
  c.leaves += 1
  c.leavesByCause[cause] = (c.leavesByCause[cause] ?? 0) + 1
  const npcId = opts?.villagerId
  noteCausalityMigrateLeave(state, npcId)
  const housed = opts?.housed === true
  if (housed) {
    c.migrateHousedLeave += 1
    noteCausalityMigrateHousedLeave(state, npcId)
  } else {
    c.migrateHomelessLeave += 1
    noteCausalityMigrateHomelessLeave(state, npcId)
  }
}

/** Homeless leave → wander (travel stage). */
export function noteMigrateTravelStart(state: SimState, villagerId?: number): void {
  const c = ensureMigrationCounters(state)
  c.migrateTravelStarts += 1
  noteCausalityMigrateTravel(state, villagerId)
}

/** Destination evaluation for wanderer rejoin (or fail). */
export function noteMigrateDestEval(
  state: SimState,
  outcome: 'rejoin' | 'fail',
  reason: MigrateStageReason,
  villagerId?: number,
): void {
  const c = ensureMigrationCounters(state)
  c.migrateDestEvals += 1
  c.destReasons[reason] = (c.destReasons[reason] ?? 0) + 1
  noteCausalityMigrateDestEval(state, reason, villagerId)
  if (outcome === 'fail') {
    c.migrateFails += 1
    noteCausalityMigrateFail(state, reason, villagerId)
  }
}

/**
 * Housed leave attempts hearth secession camp (INC-04).
 * Homeless leavers never attempt camp — settle blocked `no_home` (design).
 */
export function noteMigrateSettlementAttempt(
  state: SimState,
  reason: MigrateStageReason = 'hasHome',
  villagerId?: number,
): void {
  const c = ensureMigrationCounters(state)
  c.migrateSettlementAttempts += 1
  c.destReasons[reason] = (c.destReasons[reason] ?? 0) + 1
  noteCausalityMigrateSettlementAttempt(state, reason, villagerId)
}

/** Design gate: camp requires hearth; homeless leave cannot settle-found. */
export function noteMigrateSettleBlocked(state: SimState, reason: MigrateStageReason): void {
  const c = ensureMigrationCounters(state)
  c.settleBlockReasons[reason] = (c.settleBlockReasons[reason] ?? 0) + 1
}

export function noteMigrateRejoin(
  state: SimState,
  destVillageId: number,
  villagerId?: number,
): void {
  const c = ensureMigrationCounters(state)
  c.rejoins += 1
  trackDest(c, destVillageId)
  noteCausalityMigrateRejoin(state, villagerId)
}

export function noteMigrateFound(
  state: SimState,
  destVillageId: number,
  villagerId?: number,
): void {
  const c = ensureMigrationCounters(state)
  c.foundCamps += 1
  trackDest(c, destVillageId)
  noteCausalityMigrateFound(state, villagerId)
}

function trackDest(c: MigrationCounters, id: number): void {
  if (!c._destSeen) c._destSeen = new Set()
  c._destSeen.add(id)
  c.distinctDestinations = c._destSeen.size
}

export type MigrationMetricsSnapshot = {
  counters: MigrationCounters
  leaveActs: number
  identifiableCauseShare: number
  topLeaveCauses: string[]
  topBlocks: string[]
}

export function snapshotMigrationMetrics(state: SimState): MigrationMetricsSnapshot {
  const counters = ensureMigrationCounters(state)
  const leaveEntries = Object.entries(counters.leavesByCause).filter(([, n]) => n > 0)
  const blockEntries = Object.entries(counters.blockedBy).filter(([, n]) => n > 0)
  const leaveActs = counters.leaves + counters.rejoins + counters.foundCamps
  return {
    counters: {
      ...counters,
      leavesByCause: { ...counters.leavesByCause },
      blockedBy: { ...counters.blockedBy },
      destReasons: { ...counters.destReasons },
      settleBlockReasons: { ...counters.settleBlockReasons },
      _destSeen: undefined,
    },
    leaveActs,
    identifiableCauseShare: counters.leaves > 0 ? 1 : 0,
    topLeaveCauses: leaveEntries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, n]) => `${k}:${n}`),
    topBlocks: blockEntries
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([k, n]) => `${k}:${n}`),
  }
}

/** Pick dominant factor tag from scored contributions (ties → mixed). */
export function topMigrateStageReason(
  parts: Array<{ id: MigrateStageReason; w: number }>,
): MigrateStageReason {
  const scored = parts.filter((p) => p.w > 0).sort((a, b) => b.w - a.w)
  if (scored.length === 0) return 'mixed'
  if (scored.length >= 2 && scored[0]!.w - scored[1]!.w < 0.05) return 'mixed'
  return scored[0]!.id
}
