/**
 * Lot 3D — emergence metrics derived from real construction / work-order actions.
 * Counters bump only on successful place / haul / pay / WO terminal transitions.
 */
import type { SimState, Villager } from '../types'
import { buildQueueRemaining, buildQueueComplete } from './homeContracts'
import { isActiveHomeSite } from './collabContracts'
import type { WorkOrder } from './workOrders'

export interface EmergenceMetrics {
  workOrdersCreated: number
  workOrdersCompleted: number
  workOrdersFailed: number
  workOrdersCancelled: number
  workOrdersExpired: number
  blocksBuilt: number
  materialsMoved: number
  wagesPaidCoins: number
  homesStarted: number
  homesCompleted: number
  taskSwitches: number
  /** Ring of short observed chains (real events only). */
  chains: string[]
}

const CHAIN_CAP = 48

let boundState: SimState | null = null

/** Called once per step so setTask can record switches without a state arg. */
export function bindEmergenceState(state: SimState): void {
  boundState = state
}

export function noteTaskSwitchBound(v: Villager, from: string | null, to: string): void {
  if (!boundState || !from || from === to) return
  noteTaskSwitch(boundState, v, from, to)
}

export function emptyEmergenceMetrics(): EmergenceMetrics {
  return {
    workOrdersCreated: 0,
    workOrdersCompleted: 0,
    workOrdersFailed: 0,
    workOrdersCancelled: 0,
    workOrdersExpired: 0,
    blocksBuilt: 0,
    materialsMoved: 0,
    wagesPaidCoins: 0,
    homesStarted: 0,
    homesCompleted: 0,
    taskSwitches: 0,
    chains: [],
  }
}

export function ensureEmergenceMetrics(state: SimState): EmergenceMetrics {
  if (!state.emergence) state.emergence = emptyEmergenceMetrics()
  return state.emergence
}

function pushChain(m: EmergenceMetrics, line: string): void {
  m.chains.push(line)
  if (m.chains.length > CHAIN_CAP) m.chains.splice(0, m.chains.length - CHAIN_CAP)
}

export function noteWorkOrderCreated(state: SimState, kind: string, ownerId: number): void {
  const m = ensureEmergenceMetrics(state)
  m.workOrdersCreated++
  pushChain(m, `t${state.tick} WO+ ${kind} site#${ownerId}`)
}

export function noteWorkOrderCompleted(state: SimState, kind: string, ownerId: number): void {
  const m = ensureEmergenceMetrics(state)
  m.workOrdersCompleted++
  pushChain(m, `t${state.tick} WO✓ ${kind} site#${ownerId}`)
}

export function noteWorkOrderFailed(state: SimState, kind: string, reason: string): void {
  const m = ensureEmergenceMetrics(state)
  m.workOrdersFailed++
  pushChain(m, `t${state.tick} WO✗ ${kind} (${reason})`)
}

export function noteWorkOrderCancelled(state: SimState, kind: string, reason: string): void {
  const m = ensureEmergenceMetrics(state)
  m.workOrdersCancelled++
  pushChain(m, `t${state.tick} WO⊘ ${kind} (${reason})`)
}

export function noteWorkOrderExpired(state: SimState, kind: string): void {
  const m = ensureEmergenceMetrics(state)
  m.workOrdersExpired++
  pushChain(m, `t${state.tick} WO⏱ expire ${kind}`)
}

export function noteBlockBuilt(state: SimState, x: number, y: number, builderId: number, ownerId: number): void {
  const m = ensureEmergenceMetrics(state)
  m.blocksBuilt++
  pushChain(m, `t${state.tick} block @(${x},${y}) by#${builderId} for#${ownerId}`)
}

export function noteMaterialsMoved(state: SimState, amount: number, res: string, fromId: number, toId: number): void {
  if (amount <= 0) return
  const m = ensureEmergenceMetrics(state)
  m.materialsMoved += amount
  pushChain(m, `t${state.tick} haul ${amount} ${res} #${fromId}→#${toId}`)
}

export function noteWagePaid(state: SimState, coins: number, fromId: number, toId: number): void {
  if (coins <= 0) return
  const m = ensureEmergenceMetrics(state)
  m.wagesPaidCoins += coins
  pushChain(m, `t${state.tick} wage ${coins}c #${fromId}→#${toId}`)
}

export function noteHomeStarted(state: SimState, ownerId: number): void {
  const m = ensureEmergenceMetrics(state)
  m.homesStarted++
  pushChain(m, `t${state.tick} homeStart #${ownerId}`)
}

export function noteHomeCompleted(state: SimState, ownerId: number): void {
  const m = ensureEmergenceMetrics(state)
  m.homesCompleted++
  pushChain(m, `t${state.tick} homeDone #${ownerId}`)
}

export function noteTaskSwitch(state: SimState, v: Villager, from: string | null, to: string): void {
  const m = ensureEmergenceMetrics(state)
  m.taskSwitches++
  if (from && from !== to) pushChain(m, `t${state.tick} task #${v.id} ${from}→${to}`)
}

export type EmergenceSnapshot = {
  tick: number
  npcsAlive: number
  homeless: number
  openWorkOrders: number
  assignedWorkOrders: number
  /** Cumulative created — real WO spawn only (see noteWorkOrderCreated). */
  createdWorkOrders: number
  completedWorkOrders: number
  failedWorkOrders: number
  cancelledWorkOrders: number
  expiredWorkOrders: number
  blocksBuilt: number
  materialsMoved: number
  wagesPaidCoins: number
  homesStarted: number
  homesCompleted: number
  sitesOpen: number
  npcsOnBuildTasks: number
  taskSwitches: number
  foodCrisis: number
  meanHunger: number
  professionNone: number
  builders: number
  coinTotal: number
  recentChains: string[]
}

/**
 * Real-action counters only — values that bump exclusively via note* hooks
 * on successful place / haul / pay / WO terminal / setTask switch / home start|done.
 * Do not invent probes that increment these without those call sites.
 */
export type EmergenceCoreCounters = {
  workOrdersCreated: number
  workOrdersCompleted: number
  workOrdersFailed: number
  workOrdersCancelled: number
  workOrdersExpired: number
  blocksBuilt: number
  materialsMoved: number
  wagesPaidCoins: number
  homesStarted: number
  homesCompleted: number
  taskSwitches: number
}

export function coreEmergenceCounters(m: EmergenceMetrics | EmergenceSnapshot): EmergenceCoreCounters {
  if ('workOrdersCreated' in m) {
    return {
      workOrdersCreated: m.workOrdersCreated,
      workOrdersCompleted: m.workOrdersCompleted,
      workOrdersFailed: m.workOrdersFailed,
      workOrdersCancelled: m.workOrdersCancelled,
      workOrdersExpired: m.workOrdersExpired,
      blocksBuilt: m.blocksBuilt,
      materialsMoved: m.materialsMoved,
      wagesPaidCoins: m.wagesPaidCoins,
      homesStarted: m.homesStarted,
      homesCompleted: m.homesCompleted,
      taskSwitches: m.taskSwitches,
    }
  }
  const s = m as EmergenceSnapshot
  return {
    workOrdersCreated: s.createdWorkOrders,
    workOrdersCompleted: s.completedWorkOrders,
    workOrdersFailed: s.failedWorkOrders,
    workOrdersCancelled: s.cancelledWorkOrders,
    workOrdersExpired: s.expiredWorkOrders,
    blocksBuilt: s.blocksBuilt,
    materialsMoved: s.materialsMoved,
    wagesPaidCoins: s.wagesPaidCoins,
    homesStarted: s.homesStarted,
    homesCompleted: s.homesCompleted,
    taskSwitches: s.taskSwitches,
  }
}

/** Compact deterministic fingerprint for reproducibility (same seed → same fp). */
export function fingerprintEmergence(
  snap: Pick<
    EmergenceSnapshot,
    | 'tick'
    | 'npcsAlive'
    | 'homeless'
    | 'createdWorkOrders'
    | 'completedWorkOrders'
    | 'failedWorkOrders'
    | 'cancelledWorkOrders'
    | 'expiredWorkOrders'
    | 'blocksBuilt'
    | 'materialsMoved'
    | 'wagesPaidCoins'
    | 'homesStarted'
    | 'homesCompleted'
    | 'taskSwitches'
    | 'coinTotal'
  > & { deaths?: number; villages?: number },
): string {
  const parts = [
    snap.tick,
    snap.npcsAlive,
    snap.homeless,
    snap.createdWorkOrders,
    snap.completedWorkOrders,
    snap.failedWorkOrders,
    snap.cancelledWorkOrders,
    snap.expiredWorkOrders,
    snap.blocksBuilt,
    snap.materialsMoved,
    snap.wagesPaidCoins,
    snap.homesStarted,
    snap.homesCompleted,
    snap.taskSwitches,
    snap.coinTotal,
    snap.deaths ?? -1,
    snap.villages ?? -1,
  ]
  return `e:${parts.join('|')}`
}

export type EmergenceBaselineRow = {
  seed: number
  tick: number
  npcsAlive: number
  deaths: number
  villages: number
  blocksBuilt: number
  homesCompleted: number
  woCreated: number
  woCompleted: number
  woFailed: number
  woCancelled: number
  woExpired: number
  materialsMoved: number
  wagesPaidCoins: number
  taskSwitches: number
  fingerprint: string
}

export function baselineRowFromSnap(
  seed: number,
  snap: EmergenceSnapshot,
  extra?: { deaths?: number; villages?: number },
): EmergenceBaselineRow {
  const deaths = extra?.deaths ?? 0
  const villages = extra?.villages ?? 0
  return {
    seed,
    tick: snap.tick,
    npcsAlive: snap.npcsAlive,
    deaths,
    villages,
    blocksBuilt: snap.blocksBuilt,
    homesCompleted: snap.homesCompleted,
    woCreated: snap.createdWorkOrders,
    woCompleted: snap.completedWorkOrders,
    woFailed: snap.failedWorkOrders,
    woCancelled: snap.cancelledWorkOrders,
    woExpired: snap.expiredWorkOrders,
    materialsMoved: snap.materialsMoved,
    wagesPaidCoins: snap.wagesPaidCoins,
    taskSwitches: snap.taskSwitches,
    fingerprint: fingerprintEmergence({ ...snap, deaths, villages }),
  }
}

/** Markdown table comparing seeds at one horizon (for reports / CI logs). */
export function formatEmergenceBaselineTable(rows: EmergenceBaselineRow[]): string {
  const header =
    '| seed | tick | alive | deaths | villages | blocks | homes✓ | WO+ | WO✓ | WO✗ | WO⊘ | WO⏱ | haul | wages | switches | fingerprint |'
  const sep =
    '|------|------|-------|--------|----------|--------|--------|-----|-----|-----|-----|-----|------|-------|----------|-------------|'
  const body = rows.map((r) =>
    [
      r.seed,
      r.tick,
      r.npcsAlive,
      r.deaths,
      r.villages,
      r.blocksBuilt,
      r.homesCompleted,
      r.woCreated,
      r.woCompleted,
      r.woFailed,
      r.woCancelled,
      r.woExpired,
      r.materialsMoved,
      r.wagesPaidCoins,
      r.taskSwitches,
      r.fingerprint,
    ].join(' | '),
  )
  return [header, sep, ...body.map((line) => `| ${line} |`)].join('\n')
}

export type EmergenceReproResult = {
  match: boolean
  fingerprintA: string
  fingerprintB: string
  diffs: string[]
}

export function compareEmergenceRepro(
  a: EmergenceBaselineRow,
  b: EmergenceBaselineRow,
): EmergenceReproResult {
  const keys: (keyof EmergenceBaselineRow)[] = [
    'tick',
    'npcsAlive',
    'deaths',
    'villages',
    'blocksBuilt',
    'homesCompleted',
    'woCreated',
    'woCompleted',
    'woFailed',
    'woCancelled',
    'woExpired',
    'materialsMoved',
    'wagesPaidCoins',
    'taskSwitches',
    'fingerprint',
  ]
  const diffs: string[] = []
  for (const k of keys) {
    if (a[k] !== b[k]) diffs.push(`${k}: ${String(a[k])} ≠ ${String(b[k])}`)
  }
  return {
    match: diffs.length === 0,
    fingerprintA: a.fingerprint,
    fingerprintB: b.fingerprint,
    diffs,
  }
}

export function snapshotEmergence(state: SimState): EmergenceSnapshot {
  const m = ensureEmergenceMetrics(state)
  const orders: WorkOrder[] = state.workOrders ?? []
  let open = 0
  let assigned = 0
  for (const o of orders) {
    if (o.status === 'open') open++
    if (o.status === 'reserved' || o.status === 'active') assigned++
  }
  let alive = 0
  let homeless = 0
  let onBuild = 0
  let foodCrisis = 0
  let hungerSum = 0
  let profNone = 0
  let builders = 0
  let coin = 0
  let sites = 0
  for (const v of state.villagers) {
    if (!v.alive) continue
    alive++
    hungerSum += v.hunger
    if (!v.hasHome) homeless++
    if (v.hunger < 1.5 || v.starveTimer > 0) foodCrisis++
    if (v.profession === 'none') profNone++
    if (v.profession === 'builder' || v.profession === 'mason') builders++
    for (const s of v.inventory) if (s.type === 'coin') coin += s.count
    const k = v.task?.kind
    if (k === 'helpBuild' || k === 'haulForBuild' || k === 'hireBuilder' || k === 'assistCraftTools' || k === 'buildHouse') {
      onBuild++
    }
    if (isActiveHomeSite(v)) sites++
  }
  return {
    tick: state.tick,
    npcsAlive: alive,
    homeless,
    openWorkOrders: open,
    assignedWorkOrders: assigned,
    createdWorkOrders: m.workOrdersCreated,
    completedWorkOrders: m.workOrdersCompleted,
    failedWorkOrders: m.workOrdersFailed,
    cancelledWorkOrders: m.workOrdersCancelled,
    expiredWorkOrders: m.workOrdersExpired,
    blocksBuilt: m.blocksBuilt,
    materialsMoved: m.materialsMoved,
    wagesPaidCoins: m.wagesPaidCoins,
    homesStarted: m.homesStarted,
    homesCompleted: m.homesCompleted,
    sitesOpen: sites,
    npcsOnBuildTasks: onBuild,
    taskSwitches: m.taskSwitches,
    foodCrisis,
    meanHunger: alive > 0 ? hungerSum / alive : 0,
    professionNone: profNone,
    builders,
    coinTotal: coin,
    recentChains: m.chains.slice(-12),
  }
}

/** Derive queue completeness without mutating. */
export function countCompleteHomeQueues(state: SimState): number {
  let n = 0
  for (const v of state.villagers) {
    if (!v.alive || !v.buildQueue || v.buildQueue.length === 0) continue
    if (buildQueueComplete(v.buildQueue) || (v.hasHome && buildQueueRemaining(v.buildQueue) === 0)) n++
  }
  return n
}