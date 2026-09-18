/**
 * PHASE 5 STEP6 — Natural causality soak (DP1–12 counters).
 * NO induced famine / profession / CREATE_*. stepSimulation only.
 *
 *   npx tsx scripts/_probe_phase5_causality_soak.ts [days=60] [seeds=1,3,7]
 *
 * Writes: _phase5_soak_s{seed}.json, _phase5_soak_summary.json, _phase5_soak_run.txt
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { mindOf } from '../src/lib/sim/cognition'
import { edibleValue } from '../src/lib/sim/inventory'
import { politicsOf } from '../src/lib/sim/politics'
import { snapshotSocietyMetrics } from '../src/lib/sim/societyMetrics'
import { snapshotMigrationMetrics } from '../src/lib/sim/migrationMetrics'
import { getTerrain } from '../src/lib/sim/world'
import { MILL, WHEAT } from '../src/lib/sim/types'
import { WHEAT_RIPE } from '../src/lib/sim/behaviors'
import { resolveSimConfig } from '../src/lib/sim/simConfig'
import {
  assessScaleCapacity,
  assessSocialStart300Blocked,
  formatScaleCapacityReport,
  SCALE_CLAMPS,
} from './harness/scalePolicy.ts'
import { adaptPhase3EmergenceSoak, printAdaptedReport } from './harness/adapters.ts'
import {
  decisionExactCoveragePct,
  snapshotDecisionExact,
} from '../src/lib/sim/decisionLedger'
import { snapshotCausalityMetrics } from '../src/lib/sim/causalityMetrics'
import { snapshotAttribution } from '../src/lib/sim/attributionMetrics'
import { snapshotBehaviorSeqMetrics } from '../src/lib/sim/behaviorSequenceMetrics'
import {
  snapshotSec22Evidence,
  sec22PriorityLabels,
  sec22UnderFloors,
} from '../src/lib/sim/sec22Evidence'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const RUN_LOG = path.join(ROOT, '_phase5_soak_run.txt')

const days = Math.max(1, Number(process.argv[2] ?? 60))
const seeds = (process.argv[3] ?? '1,3,7')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n))

const CONFIG = {
  initialVillagers: 100,
  maxPopulation: 250,
  preset: 'standard' as const,
  worldSize: 1000 as const,
}

function installTee(): void {
  fs.writeFileSync(RUN_LOG, '', 'utf8')
  const orig = {
    log: console.log.bind(console),
    warn: console.warn.bind(console),
    error: console.error.bind(console),
  }
  const write = (args: unknown[]) => {
    const line = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
    fs.appendFileSync(RUN_LOG, line + '\n', 'utf8')
  }
  console.log = (...args: unknown[]) => {
    orig.log(...args)
    write(args)
  }
  console.warn = (...args: unknown[]) => {
    orig.warn(...args)
    write(args)
  }
  console.error = (...args: unknown[]) => {
    orig.error(...args)
    write(args)
  }
}

function histInc(h: Record<string, number>, k: string, n = 1): void {
  h[k] = (h[k] ?? 0) + n
}

function shannonEntropy(counts: Record<string, number>): number {
  const vals = Object.values(counts).filter((n) => n > 0)
  const total = vals.reduce((a, b) => a + b, 0)
  if (total <= 0) return 0
  let h = 0
  for (const n of vals) {
    const p = n / total
    h -= p * Math.log2(p)
  }
  return +h.toFixed(4)
}

function countFoodStock(state: ReturnType<typeof createSimulation>): Record<string, number> {
  // Slots use { type, count } — prior probe used kind/qty and always reported 0 (INC-01).
  const stock: Record<string, number> = {
    food: 0,
    wheat: 0,
    flour: 0,
    bread: 0,
    meat: 0,
    edibleTotal: 0,
  }
  const bump = (inv: { type: string | null; count: number }[] | null | undefined) => {
    if (!inv) return
    for (const it of inv) {
      if (!it.type || it.count <= 0) continue
      if (it.type in stock) stock[it.type]! += it.count
    }
  }
  for (const v of state.villagers) {
    if (!v.alive) continue
    bump(v.inventory)
    bump(v.chestInventory)
    bump(v.cupboardInventory)
    stock.edibleTotal! += edibleValue(v.inventory)
    if (v.chestInventory) stock.edibleTotal! += edibleValue(v.chestInventory)
    if (v.cupboardInventory) stock.edibleTotal! += edibleValue(v.cupboardInventory)
  }
  stock.edibleTotal = Math.round(stock.edibleTotal!)
  return stock
}

function countMillsWheat(state: ReturnType<typeof createSimulation>): {
  mills: number
  wheatTiles: number
  ripe: number
  houses: number
  fields: number
} {
  let mills = 0
  let wheatTiles = 0
  let ripe = 0
  let houses = 0
  let fields = 0
  for (const vg of state.villages) {
    if (vg.hasMill || (vg.millX >= 0 && getTerrain(state.grid, vg.millX, vg.millY) === MILL)) mills++
  }
  for (const v of state.villagers) {
    if (v.hasMill) mills++
    if (v.hasHome) houses++
    if (v.alive && v.fieldX >= 0) {
      fields++
      for (let y = v.fieldY - 3; y <= v.fieldY + 3; y++) {
        for (let x = v.fieldX - 3; x <= v.fieldX + 3; x++) {
          if (getTerrain(state.grid, x, y) !== WHEAT) continue
          wheatTiles++
          if (state.grid.amount[y * state.grid.width + x] >= WHEAT_RIPE) ripe++
        }
      }
    }
  }
  return { mills, wheatTiles, ripe, houses, fields }
}

type SeedDump = {
  seed: number
  days: number
  status: 'ok' | 'crash' | 'oom'
  error?: string
  configResolved: ReturnType<typeof resolveSimConfig>
  startPop: number
  aliveEnd: number
  deaths: number
  births: number
  deathsByWolf: number
  deathsByBandit: number
  peakAlive: number
  decisionsExact: {
    decisionExactTotal: number
    decisionExactBySource: Record<string, number>
    decisionSetTaskAssigns: number
    decisionNoteChosenActions: number
    decisionOrphanSetTask: number
    coveragePct: number
  }
  decisionsProxy: {
    label: 'PROXY_task_kind_change'
    taskKindChanges: number
    factorWhySeen: number
    uniqueTaskKinds: number
    taskKindHistogram: Record<string, number>
    taskStartHistogram: Record<string, number>
    entropyStarts: number
    entropyOccupancy: number
  }
  causality: ReturnType<typeof snapshotCausalityMetrics>
  attribution: ReturnType<typeof snapshotAttribution>
  /** DP12 Sec.22 per-priority evidence (samples trimmed). */
  sec22Evidence: {
    sec22Status: string
    priorityLabels: Record<string, string>
    underFloors: string[]
    allLocalFloorsMet: boolean
    missionFloorsMet: boolean
    chainBlocks: string[]
    priorities: Array<{
      id: string
      label: string
      floors: unknown
      sampleLines: string[]
    }>
  }
  /** DP10 anti-loop / day-sequences. */
  behaviorSeq: ReturnType<typeof snapshotBehaviorSeqMetrics>
  professionsEnd: Record<string, number>
  professionChanges: number
  professionChangeNpcs: number
  professionsInvolved: string[]
  foodChain: {
    harvestStarts: number
    grindStarts: number
    bakeStarts: number
    sowStarts: number
    buildMillStarts: number
    /** INC-02 / DP6: who starts grindFlour (task ≠ end-of-run miller count). */
    grindByProfession: Record<string, number>
    /** Peak alive with profession===miller (often 0 - expected under GRIND_OPEN_TASK). */
    millerPeakAlive: number
    /** Alias of millerPeakAlive (Phase5 DP6 naming). */
    millerAlivePeak: number
    /** Design label: grindFlour is an open task, not miller-gated. */
    grindLabel: 'GRIND_OPEN_TASK'
  }
  helpCounters: Record<string, number>
  helpCategoryCount: number
  helpTotal: number
  society: ReturnType<typeof snapshotSocietyMetrics>
  migration: ReturnType<typeof snapshotMigrationMetrics>
  families: { familyCount: number; withMembers: number; births: number }
  buildings: ReturnType<typeof countMillsWheat>
  prices: Record<string, number>
  foodStock: Record<string, number>
  creeds: Record<string, number>
  creedHolders: number
  groups: { circles: number; institutions: number; guilds: number; polities: number; villages: number }
  teachCraftStarts: number
  elapsedMs: number
  daySnapshots: Array<{ day: number; alive: number; deaths: number; mills: number; leaves: number }>
}

function emptySocietySnap(): ReturnType<typeof snapshotSocietyMetrics> {
  return {
    counters: {
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
      conflictsByCause: {},
      banditUnlockCalendar: 0,
      banditUnlockPressure: 0,
    },
    livingCircles: 0,
    livingInstitutions: 0,
    livingInstitutionKinds: [],
    institutionsAgeGe30d: 0,
    circlePeakAgeDays: 0,
    institutionPeakAgeDays: 0,
    distinctConflictCauses: 0,
    identifiableConflictShare: 0,
    creedFollowupRate: null,
  }
}

function emptyMigrationSnap(): ReturnType<typeof snapshotMigrationMetrics> {
  return {
    counters: {
      urgeSamples: 0,
      urgeMax: 0,
      urgeCross070: 0,
      urgeCross086: 0,
      urgeCross094: 0,
      leaveAttempts: 0,
      leaves: 0,
      leavesByCause: {},
      blockedBy: {},
      rejoins: 0,
      foundCamps: 0,
      distinctDestinations: 0,
    },
    topBlocks: [],
    topLeaveCauses: [],
  }
}


function emptyCausalitySnap(): ReturnType<typeof snapshotCausalityMetrics> {
  return {
    counters: {
      foodHarvestProduces: 0, foodGrindConsumes: 0, foodBakeConsumes: 0, foodEatConsequences: 0,
      foodStockConsequences: 0, foodNpcCount: 0, teachEvents: 0, teachSkillChanges: 0,
      teachLaterUses: 0, teachTrueLaterUses: 0, teachNpcCount: 0,
      creedChanges: 0, creedFollowups: 0, creedNpcCount: 0,
      creedParentChildTransmissions: 0, creedChildBehaviorInfluenced: 0,
      creedGenDepthMax: 0, creedGen2Events: 0, creedGen3Events: 0,
      migrateUrgeCrosses: 0, migrateLeaveAttempts: 0, migrateLeaves: 0, migrateFoundCamps: 0,
      migrateHomelessLeave: 0, migrateHousedLeave: 0, migrateTravelStarts: 0, migrateDestEvals: 0,
      migrateSettlementAttempts: 0, migrateRejoins: 0, migrateFails: 0,
      migrateDestReasons: {}, migrateSettleReasons: {},
      priceDeltaEvents: 0, priceTaskShifts: 0, priceProfessionShifts: 0, priceNpcCount: 0,
      priceShockTaggedDeltas: 0, priceShockLinkedTaskShifts: 0, priceShockLinkedProfessionShifts: 0,
      helpEvents: 0, helpOutcomes: 0,
      helpEventsByKind: { food: 0, teach: 0, defend: 0, build: 0, haul: 0, labor: 0 },
      helpOutcomesByKind: { food: 0, teach: 0, defend: 0, build: 0, haul: 0, labor: 0 },
      defendHelpOpportunities: 0, defendHelpTaken: 0,
    },
    chains: {
      food: 'NOT_TESTED',
      teach: 'NOT_TESTED',
      creed: 'NOT_TESTED',
      creedCulture: 'NOT_TESTED',
      migrate: 'NOT_TESTED',
      price: 'NOT_TESTED',
      help: 'NOT_TESTED',
    },
    sec22Status: 'NOT_TESTED',
    decisionExactTotal: 0,
  }
}

function emptyAttributionSnap(): ReturnType<typeof snapshotAttribution> {
  return {
    memoryAttributedDecisions: 0, memoryAttributedNpcs: 0,
    emotionAttributedDecisions: 0, emotionAttributedNpcs: 0,
    personalityAttributedDecisions: 0, personalityAttributedNpcs: 0,
    personalityPairSamples: 0, personalityPairReady: 0, personalityPairDivergent: 0,
    memoryMemorableEvents: 0, memoryRetrievals: 0, memoryUses: 0,
    memoryCausalFlips: 0, memoryMaterialNoFlip: 0, memoryCausalSamples: [],
    emotionChanges: 0, emotionUses: 0, emotionCausalFlips: 0, emotionMaterialNoFlip: 0,
    emotionCausalSamples: [],
    personalityUses: 0, personalityCausalFlips: 0, personalityMaterialNoFlip: 0,
    personalityCausalSamples: [], personalityPairMatchSamples: [],
    professionChanges: 0, professionChangesMultiFactor: 0, professionExplainableShare: 0,
    professionFactorSamples: [],
    floors: {
      memorable: { value: 0, floor: 50, ok: false },
      retrievals: { value: 0, floor: 30, ok: false },
      uses: { value: 0, floor: 20, ok: false },
      causalFlips: { value: 0, floor: 20, ok: false },
      emotionChanges: { value: 0, floor: 50, ok: false },
      emotionUses: { value: 0, floor: 30, ok: false },
      emotionCausalFlips: { value: 0, floor: 15, ok: false },
      personalityUses: { value: 0, floor: 30, ok: false },
      personalityCausalFlips: { value: 0, floor: 15, ok: false },
      personalityPairReady: { value: 0, floor: 30, ok: false },
      personalityDivergentRatio: { value: 0, floor: 0.5, ok: false, ready: 0, divergent: 0 },
      professionMultiFactorShare: { value: 0, floor: 0.7, ok: false, changes: 0, multi: 0 },
    },
    status: 'NOT_TESTED',
  }
}

function emptyBehaviorSeqSnap(): ReturnType<typeof snapshotBehaviorSeqMetrics> {
  return {
    counters: {
      seqNpcTracked: 0,
      seqNpcWithVariation30d: 0,
      seqNpcStuckLoop14d: 0,
      seqLongestSameLoopDays: 0,
      seqUniqueDaySequences: 0,
      seqSecondaryGoalStableSamples: 0,
      seqSecondaryGoalStableHits: 0,
      seqDayOccupancyTeach: 0,
      seqDayOccupancySocial: 0,
      seqDayOccupancyRest: 0,
      seqDampApplications: 0,
    },
    variationPct: 0,
    stuckLoop14dPct: 0,
    secondaryGoalStablePct: 0,
    acceptanceTargets: {
      variationPctMin: 0.3,
      stuckLoop14dPctMax: 0.5,
      secondaryGoalStablePctMin: 0.2,
    },
    note: 'empty',
  }
}

function emptySec22Evidence() {
  return {
    sec22Status: 'NOT_TESTED',
    priorityLabels: {} as Record<string, string>,
    underFloors: [] as string[],
    allLocalFloorsMet: false,
    missionFloorsMet: false,
    chainBlocks: [] as string[],
    priorities: [] as Array<{
      id: string
      label: string
      floors: unknown
      sampleLines: string[]
    }>,
  }
}

/** Trim bulky sample rings for JSON dumps (keep counters intact). */
function thinAttribution(a: ReturnType<typeof snapshotAttribution>) {
  return {
    ...a,
    memoryCausalSamples: (a.memoryCausalSamples ?? []).slice(0, 5),
    emotionCausalSamples: (a.emotionCausalSamples ?? []).slice(0, 5),
    personalityCausalSamples: (a.personalityCausalSamples ?? []).slice(0, 5),
    personalityPairMatchSamples: (a.personalityPairMatchSamples ?? []).slice(0, 5),
    professionFactorSamples: (a.professionFactorSamples ?? []).slice(0, 8),
  }
}

function thinCausality(c: ReturnType<typeof snapshotCausalityMetrics>) {
  const counters = { ...c.counters } as Record<string, unknown>
  for (const k of Object.keys(counters)) {
    if (k.endsWith('Samples') && Array.isArray(counters[k])) {
      counters[k] = (counters[k] as unknown[]).slice(0, 5)
    }
  }
  return { ...c, counters }
}

function runSeed(seed: number): SeedDump {
  const t0 = Date.now()
  const configResolved = resolveSimConfig({ ...CONFIG, seed })
  const state = createSimulation(seed, CONFIG)
  const startPop = state.villagers.filter((v) => v.alive).length
  const ticks = days * TICKS_PER_DAY

  const prevTask = new Map<number, string | null>()
  const prevProf = new Map<number, string>()
  for (const v of state.villagers) {
    prevTask.set(v.id, v.task?.kind ?? null)
    prevProf.set(v.id, v.profession)
  }

  let taskKindChanges = 0
  let factorWhySeen = 0
  const taskKindHist: Record<string, number> = {}
  const taskStartHist: Record<string, number> = {}
  let professionChanges = 0
  const profChangeNpc = new Set<number>()
  const professionsInvolved = new Set<string>()
  const foodChain = {
    harvestStarts: 0,
    grindStarts: 0,
    bakeStarts: 0,
    sowStarts: 0,
    buildMillStarts: 0,
    grindByProfession: {} as Record<string, number>,
    millerPeakAlive: 0,
    millerAlivePeak: 0,
    grindLabel: 'GRIND_OPEN_TASK' as const,
  }
  let teachCraftStarts = 0
  let peakAlive = startPop
  const daySnapshots: SeedDump['daySnapshots'] = []

  for (let t = 1; t <= ticks; t++) {
    stepSimulation(state)

    let millersAlive = 0
    for (const v of state.villagers) {
      if (!v.alive) continue
      if (v.profession === 'miller') millersAlive++
      const kind = v.task?.kind ?? null
      const prev = prevTask.get(v.id) ?? null
      if (kind !== prev) {
        taskKindChanges++
        if (kind) {
          histInc(taskStartHist, kind)
          if (kind === 'harvestWheat') foodChain.harvestStarts++
          else if (kind === 'grindFlour') {
            foodChain.grindStarts++
            histInc(foodChain.grindByProfession, v.profession || 'none')
          } else if (kind === 'bakeBread') foodChain.bakeStarts++
          else if (kind === 'sowField') foodChain.sowStarts++
          else if (kind === 'buildMill') foodChain.buildMillStarts++
          else if (kind === 'teachCraft') teachCraftStarts++
        }
      }
      prevTask.set(v.id, kind)
      if (kind) histInc(taskKindHist, kind)

      const mind = mindOf(v)
      if (mind.lastFactorWhy?.length) factorWhySeen++

      const prof = v.profession
      const prevP = prevProf.get(v.id)
      if (prevP !== undefined && prevP !== prof) {
        professionChanges++
        profChangeNpc.add(v.id)
        professionsInvolved.add(prevP)
        professionsInvolved.add(prof)
      }
      prevProf.set(v.id, prof)
    }
    if (millersAlive > foodChain.millerPeakAlive) {
      foodChain.millerPeakAlive = millersAlive
      foodChain.millerAlivePeak = millersAlive
    }

    for (const v of state.villagers) {
      if (!prevTask.has(v.id)) {
        prevTask.set(v.id, v.task?.kind ?? null)
        prevProf.set(v.id, v.profession)
      }
    }

    if (t % TICKS_PER_DAY === 0) {
      const alive = state.villagers.filter((v) => v.alive).length
      peakAlive = Math.max(peakAlive, alive)
      const day = t / TICKS_PER_DAY
      daySnapshots.push({
        day,
        alive,
        deaths: state.deaths,
        mills: state.villagers.filter((v) => v.hasMill).length,
        leaves: state.migrationCounters?.leaves ?? 0,
      })
      if (day % 10 === 0 || day === days) {
        const exactLive = state.decisionExact?.decisionExactTotal ?? 0
        console.log(
          `  seed=${seed} d${day} alive=${alive} deaths=${state.deaths} leaves=${state.migrationCounters?.leaves ?? 0} ` +
            `exact=${exactLive} taskDeltaPROXY=${taskKindChanges} profDelta=${professionChanges}`,
        )
      }
    }
  }

  const exact = snapshotDecisionExact(state)
  const exactCoverage = decisionExactCoveragePct(state)
  const causalityRaw = snapshotCausalityMetrics(state)
  const attributionRaw = snapshotAttribution(state)
  const causality = thinCausality(causalityRaw) as ReturnType<typeof snapshotCausalityMetrics>
  const attribution = thinAttribution(attributionRaw) as ReturnType<typeof snapshotAttribution>
  const behaviorSeq = snapshotBehaviorSeqMetrics(state)
  const sec22Raw = snapshotSec22Evidence(state, {
    seedCount: seeds.length,
    causality: causalityRaw,
    attribution: attributionRaw,
  })
  const sec22Evidence = {
    sec22Status: sec22Raw.sec22Status,
    priorityLabels: sec22PriorityLabels(sec22Raw),
    underFloors: sec22UnderFloors(sec22Raw),
    allLocalFloorsMet: sec22Raw.allLocalFloorsMet,
    missionFloorsMet: sec22Raw.missionFloorsMet,
    chainBlocks: sec22Raw.chainBlocks,
    priorities: sec22Raw.priorities.map((p) => ({
      id: p.id,
      label: p.label,
      floors: p.floors,
      sampleLines: (p.sampleLines ?? []).slice(0, 3),
    })),
  }
  const stats = computeStats(state)
  const professionsEnd: Record<string, number> = { ...stats.professions }
  const help = { ...(state.helpCounters ?? {}) }
  const helpTotal = Object.values(help).reduce((a, b) => a + b, 0)
  const helpByKindLive = causality.counters.helpEventsByKind ?? {}
  const helpCategoryCount = Math.max(
    Object.values(helpByKindLive).filter((n) => (n as number) > 0).length,
    Object.values(help).filter((n) => n > 0).length,
  )
  const society = snapshotSocietyMetrics(state)
  const migration = snapshotMigrationMetrics(state)
  const familyIds = new Set<number>()
  for (const v of state.villagers) {
    if (v.alive && v.familyId != null) familyIds.add(v.familyId)
  }
  const withMembers = (state.families ?? []).filter((f) => (f.memberIds?.length ?? 0) > 0).length
  const creeds: Record<string, number> = {}
  let creedHolders = 0
  for (const v of state.villagers) {
    if (!v.alive) continue
    const c = politicsOf(v).creed
    if (c) {
      creedHolders++
      histInc(creeds, String(c))
    }
  }
  const prices: Record<string, number> = {}
  for (const [k, val] of Object.entries(state.prices ?? {})) {
    if (typeof val === 'number') prices[k] = val
  }

  return {
    seed,
    days,
    status: 'ok',
    configResolved,
    startPop,
    aliveEnd: stats.villagers,
    deaths: stats.deaths,
    births: state.births,
    deathsByWolf: state.deathsByWolf,
    deathsByBandit: state.deathsByBandit,
    peakAlive,
    decisionsExact: {
      decisionExactTotal: exact.decisionExactTotal,
      decisionExactBySource: exact.decisionExactBySource,
      decisionSetTaskAssigns: exact.decisionSetTaskAssigns,
      decisionNoteChosenActions: exact.decisionNoteChosenActions,
      decisionOrphanSetTask: exact.decisionOrphanSetTask,
      coveragePct: exactCoverage,
    },
    decisionsProxy: {
      label: 'PROXY_task_kind_change',
      taskKindChanges,
      factorWhySeen,
      uniqueTaskKinds: Object.keys(taskStartHist).length,
      taskKindHistogram: taskKindHist,
      taskStartHistogram: taskStartHist,
      entropyStarts: shannonEntropy(taskStartHist),
      entropyOccupancy: shannonEntropy(taskKindHist),
    },
    causality,
    attribution,
    sec22Evidence,
    behaviorSeq,
    professionsEnd,
    professionChanges,
    professionChangeNpcs: profChangeNpc.size,
    professionsInvolved: [...professionsInvolved],
    foodChain,
    helpCounters: help,
    helpCategoryCount,
    helpTotal,
    society,
    migration,
    families: {
      familyCount: Math.max(familyIds.size, withMembers),
      withMembers,
      births: state.births,
    },
    buildings: countMillsWheat(state),
    prices,
    foodStock: countFoodStock(state),
    creeds,
    creedHolders,
    groups: {
      circles: state.circles.length,
      institutions: state.circles.filter((c) => c.isInstitution).length,
      guilds: state.circles.filter((c) => c.isGuild).length,
      polities: state.polities.length,
      villages: state.villages.filter((vg) => vg.memberIds.length > 0).length,
    },
    teachCraftStarts,
    elapsedMs: Date.now() - t0,
    daySnapshots,
  }
}

installTee()

console.log('=== PHASE 5 STEP6 NATURAL CAUSALITY SOAK ===')
console.log(`days=${days} seeds=${seeds.join(',')} config=${JSON.stringify(CONFIG)}`)
console.log(
  `clamps: initialVillagers ${SCALE_CLAMPS.initialVillagersMin}..${SCALE_CLAMPS.initialVillagersMax}; maxPopulation<=${SCALE_CLAMPS.maxPopulationHardCap}`,
)
console.log('\n--- scalePolicy capacity ---')
const indCap = assessScaleCapacity('individual', CONFIG)
console.log(formatScaleCapacityReport(indCap))
const social300 = assessSocialStart300Blocked()
console.log(formatScaleCapacityReport(social300))
console.log(
  `SOCIAL START@300 BLOCKED capacite (requested 300 -> clamped ${social300.resolvedInitial}; clamp max=${SCALE_CLAMPS.initialVillagersMax})`,
)
console.log('NATURAL path: no induce famine/profession/CREATE_*; stepSimulation only')
console.log('DP dumps: decisionExact, causality, attribution CF, profession MF, migrate stages, help, seq, creed, sec22\n')

const rows: SeedDump[] = []
for (const seed of seeds) {
  console.log(`\n>>> START seed=${seed}`)
  try {
    const dump = runSeed(seed)
    rows.push(dump)
    const outPath = path.join(ROOT, `_phase5_soak_s${seed}.json`)
    fs.writeFileSync(outPath, JSON.stringify(dump, null, 2), 'utf8')
    console.log(`>>> DONE seed=${seed} status=${dump.status} elapsedMs=${dump.elapsedMs} -> ${outPath}`)
    console.log(
      `    exact=${dump.decisionsExact.decisionExactTotal} memCF=${dump.attribution.memoryCausalFlips} ` +
        `emoCF=${dump.attribution.emotionCausalFlips} persCF=${dump.attribution.personalityCausalFlips} ` +
        `teachTrue=${dump.causality.counters.teachTrueLaterUses ?? 0} ` +
        `profMF=${dump.attribution.professionChangesMultiFactor}/${dump.attribution.professionChanges} ` +
        `sec22=${dump.sec22Evidence.sec22Status} migrate=${dump.causality.chains.migrate} ` +
        `foundCamps=${dump.migration.counters.foundCamps} labor=${dump.causality.counters.helpEventsByKind?.labor ?? 0}`,
    )
  } catch (err) {
    const msg = err instanceof Error ? `${err.name}: ${err.message}\n${err.stack ?? ''}` : String(err)
    const isOom = /heap|out of memory|ENOMEM|allocation failed/i.test(msg)
    console.error(`>>> CRASH seed=${seed} ${isOom ? 'OOM' : 'ERROR'}: ${msg}`)
    const crashDump: SeedDump = {
      seed,
      days,
      status: isOom ? 'oom' : 'crash',
      error: msg.slice(0, 4000),
      configResolved: resolveSimConfig({ ...CONFIG, seed }),
      startPop: 0,
      aliveEnd: 0,
      deaths: 0,
      births: 0,
      deathsByWolf: 0,
      deathsByBandit: 0,
      peakAlive: 0,
      decisionsExact: {
        decisionExactTotal: 0,
        decisionExactBySource: { chooseTask: 0, HARD: 0, setTask: 0, other: 0 },
        decisionSetTaskAssigns: 0,
        decisionNoteChosenActions: 0,
        decisionOrphanSetTask: 0,
        coveragePct: 0,
      },
      decisionsProxy: {
        label: 'PROXY_task_kind_change',
        taskKindChanges: 0,
        factorWhySeen: 0,
        uniqueTaskKinds: 0,
        taskKindHistogram: {},
        taskStartHistogram: {},
        entropyStarts: 0,
        entropyOccupancy: 0,
      },
      causality: emptyCausalitySnap(),
      attribution: emptyAttributionSnap(),
      sec22Evidence: emptySec22Evidence(),
      behaviorSeq: emptyBehaviorSeqSnap(),
      professionsEnd: {},
      professionChanges: 0,
      professionChangeNpcs: 0,
      professionsInvolved: [],
      foodChain: {
        harvestStarts: 0,
        grindStarts: 0,
        bakeStarts: 0,
        sowStarts: 0,
        buildMillStarts: 0,
        grindByProfession: {},
        millerPeakAlive: 0,
        millerAlivePeak: 0,
        grindLabel: 'GRIND_OPEN_TASK',
      },
      helpCounters: {},
      helpCategoryCount: 0,
      helpTotal: 0,
      society: emptySocietySnap(),
      migration: emptyMigrationSnap(),
      families: { familyCount: 0, withMembers: 0, births: 0 },
      buildings: { mills: 0, wheatTiles: 0, ripe: 0, houses: 0, fields: 0 },
      prices: {},
      foodStock: {},
      creeds: {},
      creedHolders: 0,
      groups: { circles: 0, institutions: 0, guilds: 0, polities: 0, villages: 0 },
      teachCraftStarts: 0,
      elapsedMs: 0,
      daySnapshots: [],
    }
    rows.push(crashDump)
    fs.writeFileSync(path.join(ROOT, `_phase5_soak_s${seed}.json`), JSON.stringify(crashDump, null, 2), 'utf8')
    console.error(`>>> Continuing remaining seeds after seed=${seed} failure`)
  }
}

const okRows = rows.filter((r) => r.status === 'ok')
const totals = {
  seedsRequested: seeds.length,
  seedsOk: okRows.length,
  seedsFailed: rows
    .filter((r) => r.status !== 'ok')
    .map((r) => ({ seed: r.seed, status: r.status, error: r.error?.slice(0, 200) })),
  decisionsProxyTotal: okRows.reduce((a, r) => a + r.decisionsProxy.taskKindChanges, 0),
  decisionsExactTotal: okRows.reduce((a, r) => a + (r.decisionsExact?.decisionExactTotal ?? 0), 0),
  decisionsExactBySource: okRows.reduce(
    (acc, r) => {
      const s = r.decisionsExact?.decisionExactBySource ?? {}
      for (const k of Object.keys(s)) acc[k] = (acc[k] ?? 0) + (s[k] ?? 0)
      return acc
    },
    {} as Record<string, number>,
  ),
  professionChangesTotal: okRows.reduce((a, r) => a + r.professionChanges, 0),
  harvestStartsTotal: okRows.reduce((a, r) => a + r.foodChain.harvestStarts, 0),
  grindStartsTotal: okRows.reduce((a, r) => a + r.foodChain.grindStarts, 0),
  bakeStartsTotal: okRows.reduce((a, r) => a + r.foodChain.bakeStarts, 0),
  helpTotal: okRows.reduce((a, r) => a + r.helpTotal, 0),
  leavesTotal: okRows.reduce((a, r) => a + (r.migration.counters.leaves ?? 0), 0),
  rejoinsTotal: okRows.reduce((a, r) => a + (r.migration.counters.rejoins ?? 0), 0),
  foundCampsTotal: okRows.reduce((a, r) => a + (r.migration.counters.foundCamps ?? 0), 0),
  edibleTotalSum: okRows.reduce((a, r) => a + (r.foodStock.edibleTotal ?? 0), 0),
  helpCategoriesMax: okRows.length ? Math.max(...okRows.map((r) => r.helpCategoryCount)) : 0,
  millerPeakMax: okRows.length ? Math.max(...okRows.map((r) => r.foodChain.millerPeakAlive)) : 0,
  millerAlivePeakMax: okRows.length
    ? Math.max(...okRows.map((r) => r.foodChain.millerAlivePeak ?? r.foodChain.millerPeakAlive))
    : 0,
  grindLabel: 'GRIND_OPEN_TASK' as const,
  birthsTotal: okRows.reduce((a, r) => a + r.births, 0),
  deathsTotal: okRows.reduce((a, r) => a + r.deaths, 0),
  teachCraftStartsTotal: okRows.reduce((a, r) => a + r.teachCraftStarts, 0),
  teachTrueLaterUsesTotal: okRows.reduce(
    (a, r) => a + (r.causality.counters.teachTrueLaterUses ?? 0),
    0,
  ),
  teachLaterUsesProxyTotal: okRows.reduce((a, r) => a + (r.causality.counters.teachLaterUses ?? 0), 0),
  conflictsTotal: okRows.reduce((a, r) => a + (r.society.counters.conflictsTotal ?? 0), 0),
  circlesFormedTotal: okRows.reduce((a, r) => a + (r.society.counters.circlesFormed ?? 0), 0),
  creedChangesTotal: okRows.reduce((a, r) => a + (r.society.counters.creedChanges ?? 0), 0),
  creedGen2EventsTotal: okRows.reduce(
    (a, r) => a + (r.causality.counters.creedGen2Events ?? 0),
    0,
  ),
  creedParentChildTransmissionsTotal: okRows.reduce(
    (a, r) => a + (r.causality.counters.creedParentChildTransmissions ?? 0),
    0,
  ),
  maxPop: Math.max(0, ...okRows.map((r) => Math.max(r.startPop, r.peakAlive, r.aliveEnd))),
  minAliveEnd: okRows.length ? Math.min(...okRows.map((r) => r.aliveEnd)) : 0,
  attribution: {
    memoryAttributedDecisions: okRows.reduce((a, r) => a + r.attribution.memoryAttributedDecisions, 0),
    emotionAttributedDecisions: okRows.reduce((a, r) => a + r.attribution.emotionAttributedDecisions, 0),
    personalityAttributedDecisions: okRows.reduce(
      (a, r) => a + r.attribution.personalityAttributedDecisions,
      0,
    ),
    personalityPairSamples: okRows.reduce((a, r) => a + r.attribution.personalityPairSamples, 0),
    personalityPairReady: okRows.reduce((a, r) => a + r.attribution.personalityPairReady, 0),
    personalityPairDivergent: okRows.reduce(
      (a, r) => a + (r.attribution.personalityPairDivergent ?? 0),
      0,
    ),
    memoryCausalFlips: okRows.reduce((a, r) => a + (r.attribution.memoryCausalFlips ?? 0), 0),
    emotionCausalFlips: okRows.reduce((a, r) => a + (r.attribution.emotionCausalFlips ?? 0), 0),
    personalityCausalFlips: okRows.reduce(
      (a, r) => a + (r.attribution.personalityCausalFlips ?? 0),
      0,
    ),
    memoryMemorableEvents: okRows.reduce((a, r) => a + (r.attribution.memoryMemorableEvents ?? 0), 0),
    memoryRetrievals: okRows.reduce((a, r) => a + (r.attribution.memoryRetrievals ?? 0), 0),
    memoryUses: okRows.reduce((a, r) => a + (r.attribution.memoryUses ?? 0), 0),
    emotionChanges: okRows.reduce((a, r) => a + (r.attribution.emotionChanges ?? 0), 0),
    emotionUses: okRows.reduce((a, r) => a + (r.attribution.emotionUses ?? 0), 0),
    personalityUses: okRows.reduce((a, r) => a + (r.attribution.personalityUses ?? 0), 0),
    professionChanges: okRows.reduce((a, r) => a + (r.attribution.professionChanges ?? 0), 0),
    professionChangesMultiFactor: okRows.reduce(
      (a, r) => a + (r.attribution.professionChangesMultiFactor ?? 0),
      0,
    ),
    professionExplainableShare:
      okRows.reduce((a, r) => a + (r.attribution.professionChanges ?? 0), 0) > 0
        ? okRows.reduce((a, r) => a + (r.attribution.professionChangesMultiFactor ?? 0), 0) /
          okRows.reduce((a, r) => a + (r.attribution.professionChanges ?? 0), 0)
        : 0,
  },
  helpByKind: okRows.reduce(
    (acc, r) => {
      const h = r.causality.counters.helpEventsByKind ?? {}
      for (const k of Object.keys(h)) {
        acc[k] = (acc[k] ?? 0) + ((h as Record<string, number>)[k] ?? 0)
      }
      return acc
    },
    {} as Record<string, number>,
  ),
  defendHelpOpportunities: okRows.reduce(
    (a, r) => a + (r.causality.counters.defendHelpOpportunities ?? 0),
    0,
  ),
  defendHelpTaken: okRows.reduce((a, r) => a + (r.causality.counters.defendHelpTaken ?? 0), 0),
  migrateStages: {
    urgeCrosses: okRows.reduce((a, r) => a + (r.causality.counters.migrateUrgeCrosses ?? 0), 0),
    leaveAttempts: okRows.reduce((a, r) => a + (r.causality.counters.migrateLeaveAttempts ?? 0), 0),
    leaves: okRows.reduce((a, r) => a + (r.causality.counters.migrateLeaves ?? 0), 0),
    homelessLeave: okRows.reduce((a, r) => a + (r.causality.counters.migrateHomelessLeave ?? 0), 0),
    housedLeave: okRows.reduce((a, r) => a + (r.causality.counters.migrateHousedLeave ?? 0), 0),
    travelStarts: okRows.reduce((a, r) => a + (r.causality.counters.migrateTravelStarts ?? 0), 0),
    destEvals: okRows.reduce((a, r) => a + (r.causality.counters.migrateDestEvals ?? 0), 0),
    settlementAttempts: okRows.reduce(
      (a, r) => a + (r.causality.counters.migrateSettlementAttempts ?? 0),
      0,
    ),
    foundCamps: okRows.reduce((a, r) => a + (r.causality.counters.migrateFoundCamps ?? 0), 0),
    rejoins: okRows.reduce((a, r) => a + (r.causality.counters.migrateRejoins ?? 0), 0),
    fails: okRows.reduce((a, r) => a + (r.causality.counters.migrateFails ?? 0), 0),
  },
  behaviorSeq: {
    trackedMax: okRows.length
      ? Math.max(...okRows.map((r) => r.behaviorSeq.counters.seqNpcTracked))
      : 0,
    variationPctMin: okRows.length ? Math.min(...okRows.map((r) => r.behaviorSeq.variationPct)) : 0,
    stuckLoop14dPctMax: okRows.length
      ? Math.max(...okRows.map((r) => r.behaviorSeq.stuckLoop14dPct))
      : 0,
    secondaryGoalStablePctMin: okRows.length
      ? Math.min(...okRows.map((r) => r.behaviorSeq.secondaryGoalStablePct))
      : 0,
    dampAppsTotal: okRows.reduce((a, r) => a + r.behaviorSeq.counters.seqDampApplications, 0),
    longestSameLoopDaysMax: okRows.length
      ? Math.max(...okRows.map((r) => r.behaviorSeq.counters.seqLongestSameLoopDays))
      : 0,
  },
  causalitySec22BySeed: okRows.map((r) => ({
    seed: r.seed,
    sec22Status: r.causality.sec22Status,
    chains: r.causality.chains,
    priorityLabels: r.sec22Evidence.priorityLabels,
    underFloors: r.sec22Evidence.underFloors,
    allLocalFloorsMet: r.sec22Evidence.allLocalFloorsMet,
    missionFloorsMet: r.sec22Evidence.missionFloorsMet,
  })),
}

const summary = {
  phase: 5,
  step: 'STEP6',
  channel: 'EMERGENCE',
  induced: false,
  days,
  seeds,
  config: CONFIG,
  scalePolicy: {
    individual: indCap,
    socialStart300: social300,
    note:
      'Individual START@100 READY (clamp max 120). Social START@300 BLOCKED capacite (300->120). Do not raise clamp.',
  },
  decisionsNote:
    'PROXY = task-kind deltas. Exact = state.decisionExact (CP1 noteChosenAction/orphan setTask). PASS gate uses exact only.',
  totals,
  rows: rows.map((r) => ({
    seed: r.seed,
    status: r.status,
    error: r.error,
    startPop: r.startPop,
    aliveEnd: r.aliveEnd,
    peakAlive: r.peakAlive,
    deaths: r.deaths,
    births: r.births,
    decisionsProxy: r.decisionsProxy.taskKindChanges,
    decisionsExact: r.decisionsExact?.decisionExactTotal ?? 0,
    uniqueTaskKinds: r.decisionsProxy.uniqueTaskKinds,
    entropyStarts: r.decisionsProxy.entropyStarts,
    professionChanges: r.professionChanges,
    professionMultiFactor: r.attribution.professionChangesMultiFactor,
    professionExplainableShare: r.attribution.professionExplainableShare,
    foodChain: r.foodChain,
    helpTotal: r.helpTotal,
    helpCategories: r.helpCategoryCount,
    helpByKind: r.causality.counters.helpEventsByKind,
    defendHelp: {
      opportunities: r.causality.counters.defendHelpOpportunities,
      taken: r.causality.counters.defendHelpTaken,
    },
    families: r.families,
    buildings: r.buildings,
    migration: {
      leaves: r.migration.counters.leaves,
      rejoins: r.migration.counters.rejoins,
      foundCamps: r.migration.counters.foundCamps,
      leaveAttempts: r.migration.counters.leaveAttempts,
      urgeMax: r.migration.counters.urgeMax,
      distinctDestinations: r.migration.counters.distinctDestinations,
      stages: {
        homelessLeave: r.causality.counters.migrateHomelessLeave,
        housedLeave: r.causality.counters.migrateHousedLeave,
        travelStarts: r.causality.counters.migrateTravelStarts,
        destEvals: r.causality.counters.migrateDestEvals,
        settlementAttempts: r.causality.counters.migrateSettlementAttempts,
        fails: r.causality.counters.migrateFails,
      },
    },
    society: {
      circles: r.groups.circles,
      institutions: r.groups.institutions,
      conflicts: r.society.counters.conflictsTotal,
      creedChanges: r.society.counters.creedChanges,
      inst30d: r.society.institutionsAgeGe30d,
    },
    teachCraftStarts: r.teachCraftStarts,
    teachTrueLaterUses: r.causality.counters.teachTrueLaterUses,
    teachLaterUsesProxy: r.causality.counters.teachLaterUses,
    creedGen: {
      parentChild: r.causality.counters.creedParentChildTransmissions,
      childBehavior: r.causality.counters.creedChildBehaviorInfluenced,
      genDepthMax: r.causality.counters.creedGenDepthMax,
      gen2: r.causality.counters.creedGen2Events,
      gen3: r.causality.counters.creedGen3Events,
    },
    prices: r.prices,
    foodStock: r.foodStock,
    creeds: r.creeds,
    causality: { sec22Status: r.causality.sec22Status, chains: r.causality.chains, counters: r.causality.counters },
    attribution: {
      memoryCausalFlips: r.attribution.memoryCausalFlips,
      emotionCausalFlips: r.attribution.emotionCausalFlips,
      personalityCausalFlips: r.attribution.personalityCausalFlips,
      personalityPairReady: r.attribution.personalityPairReady,
      personalityPairDivergent: r.attribution.personalityPairDivergent,
      professionChanges: r.attribution.professionChanges,
      professionChangesMultiFactor: r.attribution.professionChangesMultiFactor,
      professionExplainableShare: r.attribution.professionExplainableShare,
      floors: r.attribution.floors,
      status: r.attribution.status,
      memoryAttributedDecisions: r.attribution.memoryAttributedDecisions,
      emotionAttributedDecisions: r.attribution.emotionAttributedDecisions,
      personalityAttributedDecisions: r.attribution.personalityAttributedDecisions,
    },
    sec22Evidence: r.sec22Evidence,
    behaviorSeq: r.behaviorSeq,
    elapsedMs: r.elapsedMs,
  })),
}

const summaryPath = path.join(ROOT, '_phase5_soak_summary.json')
fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2), 'utf8')
console.log(`\n=== SUMMARY -> ${summaryPath}`)
console.log(JSON.stringify(totals, null, 2))

const harness = adaptPhase3EmergenceSoak({
  days,
  seeds,
  induced: false,
  maxPop: totals.maxPop,
  decisionsProxyTotal: totals.decisionsProxyTotal,
  decisionsExactTotal: totals.decisionsExactTotal,
  decisionsExactBySource: totals.decisionsExactBySource,
  decisionsAreProxy: true,
  causality: {
    sec22Status: okRows.some((r) => r.causality.sec22Status === 'PARTIAL')
      ? 'PARTIAL'
      : okRows.some((r) => r.causality.sec22Status === 'CONNECTION_NOT_PROVEN')
        ? 'CONNECTION_NOT_PROVEN'
        : 'NOT_TESTED',
    chains: okRows[0]?.causality.chains,
    priorityLabels: okRows[0]?.sec22Evidence.priorityLabels,
    chainBlocks: okRows.flatMap((r) => r.sec22Evidence.chainBlocks ?? []).slice(0, 30),
    underFloors: [...new Set(okRows.flatMap((r) => r.sec22Evidence.underFloors ?? []))],
    allLocalFloorsMet: okRows.length > 0 && okRows.every((r) => r.sec22Evidence.allLocalFloorsMet),
    missionFloorsMet: okRows.length >= 3 && okRows.every((r) => r.sec22Evidence.missionFloorsMet),
  },
  attribution: {
    memoryAttributedDecisions: totals.attribution.memoryAttributedDecisions,
    emotionAttributedDecisions: totals.attribution.emotionAttributedDecisions,
    personalityAttributedDecisions: totals.attribution.personalityAttributedDecisions,
    personalityPairSamples: totals.attribution.personalityPairSamples,
    personalityPairReady: totals.attribution.personalityPairReady,
    personalityPairDivergent: totals.attribution.personalityPairDivergent,
    memoryCausalFlips: totals.attribution.memoryCausalFlips,
    memoryMemorableEvents: totals.attribution.memoryMemorableEvents,
    memoryRetrievals: totals.attribution.memoryRetrievals,
    memoryUses: totals.attribution.memoryUses,
    emotionCausalFlips: totals.attribution.emotionCausalFlips,
    emotionChanges: totals.attribution.emotionChanges,
    emotionUses: totals.attribution.emotionUses,
    personalityCausalFlips: totals.attribution.personalityCausalFlips,
    personalityUses: totals.attribution.personalityUses,
  },
  rows: okRows.map((r) => ({
    seed: r.seed,
    startPop: r.startPop,
    aliveEnd: r.aliveEnd,
    peakAlive: r.peakAlive,
    deaths: r.deaths,
    births: r.births,
    decisionsProxy: r.decisionsProxy.taskKindChanges,
    uniqueTaskKinds: r.decisionsProxy.uniqueTaskKinds,
    professionChanges: r.professionChanges,
    professionChangeNpcs: r.professionChangeNpcs,
    professionsInvolved: r.professionsInvolved.length,
    harvestStarts: r.foodChain.harvestStarts,
    grindStarts: r.foodChain.grindStarts,
    bakeStarts: r.foodChain.bakeStarts,
    helpTotal: r.helpTotal,
    helpCategoryCount: r.helpCategoryCount,
    familyCount: r.families.familyCount,
    houses: r.buildings.houses,
    mills: r.buildings.mills,
    leaves: r.migration.counters.leaves ?? 0,
    rejoins: r.migration.counters.rejoins ?? 0,
    foundCamps: r.migration.counters.foundCamps ?? 0,
    distinctDestinations: r.migration.counters.distinctDestinations ?? 0,
    circlesFormed: r.society.counters.circlesFormed ?? 0,
    livingCircles: r.groups.circles,
    institutionsFormed: r.society.counters.institutionsFormed ?? 0,
    institutionsAgeGe30d: r.society.institutionsAgeGe30d,
    creedChanges: r.society.counters.creedChanges ?? 0,
    creedFollowups: r.society.counters.creedBehaviorFollowups ?? 0,
    creedParentChildTransmissions: r.causality.counters.creedParentChildTransmissions ?? 0,
    creedChildBehaviorInfluenced: r.causality.counters.creedChildBehaviorInfluenced ?? 0,
    creedGenDepthMax: r.causality.counters.creedGenDepthMax ?? 0,
    creedGen2Events: r.causality.counters.creedGen2Events ?? 0,
    creedGen3Events: r.causality.counters.creedGen3Events ?? 0,
    creedNpcCount: r.causality.counters.creedNpcCount ?? 0,
    conflictsTotal: r.society.counters.conflictsTotal ?? 0,
    distinctConflictCauses: r.society.distinctConflictCauses,
    teachCraftStarts: r.teachCraftStarts,
    teachTrueLaterUses: r.causality.counters.teachTrueLaterUses ?? 0,
    teachLaterUses: r.causality.counters.teachLaterUses ?? 0,
    priceKeys: Object.keys(r.prices).length,
  })),
  crashedSeeds: rows.filter((r) => r.status !== 'ok').map((r) => r.seed),
  socialBlocked: {
    requested: 300,
    clamped: social300.resolvedInitial,
    clampMax: SCALE_CLAMPS.initialVillagersMax,
    status: social300.status,
    evidence: social300.evidenceResult,
  },
})
printAdaptedReport(harness)
fs.appendFileSync(
  RUN_LOG,
  '\n=== HARNESS JSON ===\n' +
    JSON.stringify(
      { mechanism: harness.mechanism, emergence: harness.emergence, globalClaim: harness.globalClaim },
      null,
      2,
    ) +
    '\n',
  'utf8',
)

console.log(`\nTee log: ${RUN_LOG}`)
process.exit(rows.some((r) => r.status !== 'ok') && okRows.length === 0 ? 1 : 0)
