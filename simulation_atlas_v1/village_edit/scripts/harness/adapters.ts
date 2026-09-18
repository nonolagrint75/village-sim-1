/**
 * Probe adapters — honesty wrap for existing scripts (no gameplay edits).
 *
 * Adapter contract:
 *   1. Map probe verdicts into MECHANISM vs EMERGENCE channels.
 *   2. Mark induced paths as TEST SETUP (sec42).
 *   3. Run sec20 gate before any EMERGENCE PASS label.
 *
 * Wired:
 *   - second_audit_emergence → adaptSecondAuditEmergence()
 * Documented (call later):
 *   - scripts/_probe_emergence_seeds.ts
 *   - scripts/_probe_careers.ts / food_chain / society / task_hist
 *   - see PROBE_ADAPTERS in scripts/_harness_agent8_scaffold.ts
 */

import { finalizeLabel } from './gates.ts'
import { makeEvidenceBlock } from './evidence.ts'
import { emptyHarnessReport, pushBlock, summarizeChannels } from './channels.ts'
import type { EvidenceBlock, EvidenceResult, HarnessReport, ScaleSnapshot } from './types.ts'

export type SecondAuditProbeLike = {
  seed: number
  days: number
  startPop: number
  aliveEnd: number
  harvest?: { verdict: string }
  famine?: { verdict: string; path?: string }
  professionSwitch?: { verdict: string; induced?: boolean }
  millChain?: { verdict: string }
  banditOutcast?: { verdict: string }
  teachCraft?: { verdict: string; induceDelta?: number | null }
  /** Optional decision samples if collector wired later */
  decisionsSampled?: number
}

function mapVerdict(v: string | undefined): EvidenceResult {
  if (v === 'PASS') return 'PASS'
  if (v === 'PARTIAL') return 'PARTIAL'
  if (v === 'FAIL') return 'FAIL'
  return 'NOT_TESTED'
}

function scaleFromProbe(p: SecondAuditProbeLike, seedCount = 1): ScaleSnapshot {
  return {
    population: Math.max(p.startPop ?? 0, p.aliveEnd ?? 0),
    days: p.days ?? 0,
    seedCount,
    decisionsSampled: p.decisionsSampled ?? 0,
  }
}

/**
 * Convert second-audit emergence probe JSON into separated channels.
 * Induced famine / profession / teach → TEST SETUP; EMERGENCE never PASS under floors.
 */
export function adaptSecondAuditEmergence(
  probe: SecondAuditProbeLike,
  opts?: { seedCount?: number },
): HarnessReport {
  const scale = scaleFromProbe(probe, opts?.seedCount ?? 1)
  const inducedFamine = probe.famine?.path === 'induced'
  const inducedSwitch = !!probe.professionSwitch?.induced
  const inducedTeach = (probe.teachCraft?.induceDelta ?? 0) > 0 || probe.teachCraft?.induceDelta != null
  const hasTestSetup = inducedFamine || inducedSwitch || inducedTeach
  const report = emptyHarnessReport(hasTestSetup)
  const seeds = [probe.seed]

  const mechRows: Array<{ test: string; verdict?: string; testSetup?: string; expected: string }> = [
    {
      test: 'second_audit.harvest',
      verdict: probe.harvest?.verdict,
      expected: 'Harvest chain LIVE (mechanism)',
    },
    {
      test: 'second_audit.millChain',
      verdict: probe.millChain?.verdict,
      expected: 'Mill grind/bake LIVE (mechanism)',
    },
    {
      test: 'second_audit.banditOutcast',
      verdict: probe.banditOutcast?.verdict,
      expected: 'Ghost spouse hygiene / bandit window (mechanism)',
    },
    {
      test: 'second_audit.famine',
      verdict: probe.famine?.verdict,
      expected: 'Famine feel + foodNeed path',
      testSetup: inducedFamine ? 'TEST SETUP: induced local famine (probe)' : undefined,
    },
    {
      test: 'second_audit.professionSwitch',
      verdict: probe.professionSwitch?.verdict,
      expected: 'applyProfessionChange + livelihood sync',
      testSetup: inducedSwitch ? 'TEST SETUP: induced profession switch (probe)' : undefined,
    },
    {
      test: 'second_audit.teachCraft',
      verdict: probe.teachCraft?.verdict,
      expected: 'teachCraft wiring / skill delta',
      testSetup: inducedTeach ? 'TEST SETUP: induced teachCraft skill delta (probe)' : undefined,
    },
  ]

  for (const row of mechRows) {
    const proposed = mapVerdict(row.verdict)
    const fin = finalizeLabel({
      channel: 'MECHANISM',
      proposed,
      scale,
      testSetupPresent: !!row.testSetup,
    })
    pushBlock(
      report,
      makeEvidenceBlock({
        test: row.test,
        channel: 'MECHANISM',
        scale,
        seeds,
        expected: row.expected,
        result: fin.result,
        evidence: [fin.note ?? 'mechanism row', `probeVerdict=${row.verdict ?? 'n/a'}`],
        testSetup: row.testSetup,
        observed: { verdict: row.verdict ?? 'n/a' },
      }),
    )
  }

  // EMERGENCE aggregate — always gated; typical short audit → NOT_TESTED
  const anyMechFail = report.mechanism.some((b) => b.result === 'FAIL')
  const proposedEmergence: EvidenceResult = anyMechFail ? 'FAIL' : 'PASS'
  const finE = finalizeLabel({
    channel: 'EMERGENCE',
    proposed: proposedEmergence,
    scale,
    suite: 'individual',
    testSetupPresent: hasTestSetup,
  })
  pushBlock(
    report,
    makeEvidenceBlock({
      test: 'second_audit.emergence_aggregate',
      channel: 'EMERGENCE',
      scale,
      seeds,
      expected: 'sec20 individual soak without induced PASS inflation',
      result: finE.result,
      evidence: [
        finE.note ?? 'emergence gate',
        ...(finE.gate.violations.length ? [`violations: ${finE.gate.violations.join('; ')}`] : []),
        'WP1: do not treat MECHANISM PASS as EMERGENCE PASS',
      ],
      testSetup: hasTestSetup
        ? 'TEST SETUP: probe induces famine and/or profession/teach — not organic emergence'
        : undefined,
    }),
  )

  return report
}

export function printAdaptedReport(report: HarnessReport): void {
  const sum = summarizeChannels(report)
  console.log('\n=== HARNESS CHANNELS (WP1 honesty) ===')
  console.log(sum.mechanismSummary)
  console.log(sum.emergenceSummary)
  console.log('globalClaim:', sum.globalClaim)
  for (const b of [...report.mechanism, ...report.emergence]) {
    console.log(`- [${b.channel}] ${b.test} → ${b.result}${b.testSetup ? ' | ' + b.testSetup : ''}`)
  }
}

/** WP10 society probe shape (end-of-run JSON). */
export type SocietyProbeLike = {
  seed: number
  days: number
  pop: number
  societyMetrics?: {
    livingCircles?: number
    livingInstitutions?: number
    institutionsAgeGe30d?: number
    circlePeakAgeDays?: number
    institutionPeakAgeDays?: number
    distinctConflictCauses?: number
    counters?: {
      creedChanges?: number
      creedBehaviorFollowups?: number
      conflictsTotal?: number
      banditUnlockCalendar?: number
      banditUnlockPressure?: number
    }
  }
  /** DP11 optional causality creed-culture counters (from snapshotCausalityMetrics). */
  causality?: {
    counters?: {
      creedNpcCount?: number
      creedParentChildTransmissions?: number
      creedChildBehaviorInfluenced?: number
      creedGenDepthMax?: number
      creedGen2Events?: number
      creedGen3Events?: number
    }
    chains?: Record<string, string>
  }
  banditStartDay?: number
  banditCalendarFloorDay?: number
  noCreateX?: boolean
  decisionsSampled?: number
}

/**
 * Honesty wrap for society probe — MECHANISM wire OK; §§34–37 EMERGENCE always gated.
 * Never awards EMERGENCE PASS from a single undersized run.
 */
export function adaptSocietyProbe(probe: SocietyProbeLike, opts?: { seedCount?: number }): HarnessReport {
  const scale: ScaleSnapshot = {
    population: probe.pop ?? 0,
    days: probe.days ?? 0,
    seedCount: opts?.seedCount ?? 1,
    decisionsSampled: probe.decisionsSampled ?? 0,
  }
  const report = emptyHarnessReport(false)
  const seeds = [probe.seed]
  const m = probe.societyMetrics
  const c = m?.counters
  const causC = probe.causality?.counters

  const mechFin = finalizeLabel({
    channel: 'MECHANISM',
    proposed: probe.noCreateX === false ? 'FAIL' : 'PASS',
    scale,
  })
  pushBlock(
    report,
    makeEvidenceBlock({
      test: 'society.instrumentation_wire',
      channel: 'MECHANISM',
      scale,
      seeds,
      expected: 'societyCounters + longevity/conflict/creed hooks LIVE (no CREATE_X)',
      result: mechFin.result,
      evidence: [
        `circles=${m?.livingCircles ?? 'n/a'}`,
        `institutions=${m?.livingInstitutions ?? 'n/a'}`,
        `instAgeGe30d=${m?.institutionsAgeGe30d ?? 'n/a'}`,
        `creedChanges=${c?.creedChanges ?? 'n/a'}`,
        `creedFollowups=${c?.creedBehaviorFollowups ?? 'n/a'}`,
        `creedParentChild=${causC?.creedParentChildTransmissions ?? 'n/a'}`,
        `conflicts=${c?.conflictsTotal ?? 'n/a'}`,
        `causes=${m?.distinctConflictCauses ?? 'n/a'}`,
        `banditUnlock=cal${c?.banditUnlockCalendar ?? 0}/pressure${c?.banditUnlockPressure ?? 0}`,
        `floorDay=${probe.banditCalendarFloorDay ?? 'n/a'} softStart=${probe.banditStartDay ?? 'n/a'}`,
      ],
      observed: {
        livingCircles: m?.livingCircles ?? 0,
        livingInstitutions: m?.livingInstitutions ?? 0,
        institutionsAgeGe30d: m?.institutionsAgeGe30d ?? 0,
        creedChanges: c?.creedChanges ?? 0,
        conflictsTotal: c?.conflictsTotal ?? 0,
      },
    }),
  )

  // §§34–37 EMERGENCE — document thresholds; refuse PASS under sec20.
  const emergenceRows: Array<{ test: string; expected: string; observed: Record<string, number | string> }> = [
    {
      test: 'society.sec34_groups',
      expected: 'group longevity / size churn instrumented; soak thresholds PENDING',
      observed: {
        livingCircles: m?.livingCircles ?? 0,
        circlePeakAgeDays: m?.circlePeakAgeDays ?? 0,
      },
    },
    {
      test: 'society.sec35_institutions',
      expected: '>=10 institutions; >=5 survive >=30d; >=3 types — ACCEPTANCE PENDING',
      observed: {
        livingInstitutions: m?.livingInstitutions ?? 0,
        institutionsAgeGe30d: m?.institutionsAgeGe30d ?? 0,
        institutionPeakAgeDays: m?.institutionPeakAgeDays ?? 0,
      },
    },
    {
      test: 'society.sec36_creed_behavior',
      expected:
        'creed change + followup + DP11 parent→child culture instrument — ACCEPTANCE PENDING (gen often NOT_TESTED on short runs)',
      observed: {
        creedChanges: c?.creedChanges ?? 0,
        creedBehaviorFollowups: c?.creedBehaviorFollowups ?? 0,
        creedParentChildTransmissions: causC?.creedParentChildTransmissions ?? 0,
        creedChildBehaviorInfluenced: causC?.creedChildBehaviorInfluenced ?? 0,
        creedGenDepthMax: causC?.creedGenDepthMax ?? 0,
        creedGen2Events: causC?.creedGen2Events ?? 0,
        creedGen3Events: causC?.creedGen3Events ?? 0,
        creedNpcCount: causC?.creedNpcCount ?? 0,
      },
    },
    {
      test: 'society.sec37_conflicts',
      expected: '>=20 conflicts; >=5 causes; identifiable taxonomy — ACCEPTANCE PENDING',
      observed: {
        conflictsTotal: c?.conflictsTotal ?? 0,
        distinctConflictCauses: m?.distinctConflictCauses ?? 0,
      },
    },
  ]

  for (const row of emergenceRows) {
    const fin = finalizeLabel({
      channel: 'EMERGENCE',
      proposed: 'PASS',
      scale,
      suite: 'individual',
      testSetupPresent: false,
    })
    pushBlock(
      report,
      makeEvidenceBlock({
        test: row.test,
        channel: 'EMERGENCE',
        scale,
        seeds,
        expected: row.expected,
        result: fin.result,
        evidence: [fin.note ?? 'sec34-37 gate', ...(fin.gate.violations.length ? [`violations: ${fin.gate.violations.join('; ')}`] : [])],
        observed: row.observed,
      }),
    )
  }

  return report
}

/** WP11 natural migration probe shape. */
export type MigrationProbeLike = {
  seeds: number[]
  days: number
  rows: Array<{
    seed: number
    startPop: number
    aliveEnd: number
    leaves: number
    rejoins: number
    foundCamps: number
    leaveAttempts: number
    urgeMax: number
    urgeCross094?: number
    distinctDestinations?: number
  }>
  totals: {
    leaves: number
    rejoins: number
    foundCamps: number
    leaveAttempts: number
    urgeMax: number
  }
  /** True only if probe used induced famine / CREATE_MIGRATE (forbidden for EMERGENCE PASS). */
  induced: boolean
}

/**
 * Honesty wrap for WP11 migration — MECHANISM wire OK; sec33 EMERGENCE gated.
 * Short natural soaks typically NOT_TESTED vs >=20 leaves / sec20 floors.
 */
export function adaptMigrationProbe(probe: MigrationProbeLike): HarnessReport {
  const maxPop = Math.max(0, ...probe.rows.map((r) => Math.max(r.startPop, r.aliveEnd)))
  const scale: ScaleSnapshot = {
    population: maxPop,
    days: probe.days,
    seedCount: probe.seeds.length,
    decisionsSampled: 0,
  }
  const report = emptyHarnessReport(probe.induced)
  const leaves = probe.totals.leaves
  const acts = probe.totals.leaves + probe.totals.rejoins + probe.totals.foundCamps
  const wireOk = probe.totals.leaveAttempts >= 0 && probe.totals.urgeMax >= 0

  const mechFin = finalizeLabel({
    channel: 'MECHANISM',
    proposed: wireOk ? 'PASS' : 'FAIL',
    scale,
    testSetupPresent: probe.induced,
  })
  pushBlock(
    report,
    makeEvidenceBlock({
      test: 'migration.instrumentation_wire',
      channel: 'MECHANISM',
      scale,
      seeds: probe.seeds,
      expected: 'migrationCounters LIVE: urge samples/blocks/leave/rejoin/found (no CREATE_MIGRATE)',
      result: mechFin.result,
      evidence: [
        `urgeMax=${probe.totals.urgeMax}`,
        `leaveAttempts=${probe.totals.leaveAttempts}`,
        `leaves=${leaves}`,
        `rejoins=${probe.totals.rejoins}`,
        `foundCamps=${probe.totals.foundCamps}`,
        probe.induced ? 'TEST SETUP present' : 'natural path (no induction)',
      ],
      observed: {
        urgeMax: probe.totals.urgeMax,
        leaveAttempts: probe.totals.leaveAttempts,
        leaves,
        rejoins: probe.totals.rejoins,
        foundCamps: probe.totals.foundCamps,
      },
      testSetup: probe.induced ? 'TEST SETUP: induced migration pressure — not organic emergence' : undefined,
    }),
  )

  const proposedSec33: EvidenceResult = leaves >= 20 ? 'PASS' : 'NOT_TESTED'
  const fin33 = finalizeLabel({
    channel: 'EMERGENCE',
    proposed: proposedSec33 === 'PASS' ? 'PASS' : 'NOT_TESTED',
    scale,
    suite: 'individual',
    testSetupPresent: probe.induced,
  })
  pushBlock(
    report,
    makeEvidenceBlock({
      test: 'migration.sec33_leaves',
      channel: 'EMERGENCE',
      scale,
      seeds: probe.seeds,
      expected: '>=20 caused leave acts across seeds (natural); destinations tagged',
      result: fin33.result === 'PASS' && leaves >= 20 && !probe.induced ? 'PASS' : 'NOT_TESTED',
      evidence: [
        fin33.note ?? 'sec33 gate',
        `leaves=${leaves} acts=${acts} (need >=20 leaves)`,
        ...(fin33.gate.violations.length ? [`violations: ${fin33.gate.violations.join('; ')}`] : []),
        'Never invent PASS under short soak / induced path',
      ],
      observed: {
        leaves,
        rejoins: probe.totals.rejoins,
        foundCamps: probe.totals.foundCamps,
        urgeMax: probe.totals.urgeMax,
      },
      testSetup: probe.induced ? 'TEST SETUP: induced — cannot award EMERGENCE PASS' : undefined,
    }),
  )

  const fin38 = finalizeLabel({
    channel: 'EMERGENCE',
    proposed: 'PASS',
    scale,
    suite: 'rare',
    testSetupPresent: probe.induced,
  })
  pushBlock(
    report,
    makeEvidenceBlock({
      test: 'migration.sec38_multiseed',
      channel: 'EMERGENCE',
      scale,
      seeds: probe.seeds,
      expected: '>=10 seeds divergence matrix (WP11 plans; short smoke != PASS)',
      result: 'NOT_TESTED',
      evidence: [
        fin38.note ?? 'sec38 gate',
        `seedCount=${probe.seeds.length} (need >=10 for rare tier)`,
        ...(fin38.gate.violations.length ? [`violations: ${fin38.gate.violations.join('; ')}`] : []),
      ],
      observed: { seedCount: probe.seeds.length, days: probe.days },
    }),
  )

  return report
}

/** PHASE 3 natural multi-seed soak shape (raised founders to sec20 individual floors). */
export type Phase3SoakProbeLike = {
  days: number
  seeds: number[]
  induced: boolean
  maxPop: number
  decisionsProxyTotal: number
  /** True when decision counts are PROXY task.kind deltas (must not satisfy minDecisions). */
  decisionsAreProxy: boolean
  /** CP1 exact ledger total (noteChosenAction + orphan setTask). Prefer over PROXY for PASS. */
  decisionsExactTotal?: number
  decisionsExactBySource?: {
    chooseTask?: number
    HARD?: number
    setTask?: number
    other?: number
  }
  /** CP2/CP5 optional causality aggregate (sec22). Never auto-PASS. */
  causality?: {
    sec22Status?: 'NOT_TESTED' | 'CONNECTION_NOT_PROVEN' | 'PARTIAL' | 'WIRED'
    chains?: Record<string, string>
    /** DP12 per-priority labels + floors. */
    priorityLabels?: Record<string, string>
    chainBlocks?: string[]
    underFloors?: string[]
    allLocalFloorsMet?: boolean
    missionFloorsMet?: boolean
  }
  /** CP3/CP5 optional attribution totals. */
  attribution?: {
    memoryAttributedDecisions?: number
    emotionAttributedDecisions?: number
    personalityAttributedDecisions?: number
    personalityPairSamples?: number
    personalityPairReady?: number
    personalityPairDivergent?: number
    memoryCausalFlips?: number
    memoryMemorableEvents?: number
    memoryRetrievals?: number
    memoryUses?: number
    emotionCausalFlips?: number
    emotionChanges?: number
    emotionUses?: number
    personalityCausalFlips?: number
    personalityUses?: number
  }
  rows: Array<{
    seed: number
    startPop: number
    aliveEnd: number
    peakAlive: number
    deaths: number
    births: number
    decisionsProxy: number
    decisionsExact?: number
    uniqueTaskKinds: number
    professionChanges: number
    professionChangeNpcs: number
    professionsInvolved: number
    harvestStarts: number
    grindStarts: number
    bakeStarts: number
    helpTotal: number
    helpCategoryCount: number
    familyCount: number
    houses: number
    mills: number
    leaves: number
    rejoins: number
    foundCamps: number
    distinctDestinations: number
    circlesFormed: number
    livingCircles: number
    institutionsFormed: number
    institutionsAgeGe30d: number
    creedChanges: number
    creedFollowups: number
    creedParentChildTransmissions?: number
    creedChildBehaviorInfluenced?: number
    creedGenDepthMax?: number
    creedGen2Events?: number
    creedGen3Events?: number
    creedNpcCount?: number
    conflictsTotal: number
    distinctConflictCauses: number
    teachCraftStarts: number
    priceKeys: number
  }>
  crashedSeeds: number[]
  socialBlocked: {
    requested: number
    clamped: number
    clampMax: number
    status: string
    evidence: string
  }
}

/**
 * Honesty wrap for PHASE 3 natural soak.
 * Never awards EMERGENCE PASS without sec20 floors + system thresholds with evidence.
 * Decision counts labeled PROXY are not treated as exact chooseTask ledger.
 * CP1: only decisionsExactTotal satisfies minDecisions for PASS.
 */
export function adaptPhase3EmergenceSoak(probe: Phase3SoakProbeLike): HarnessReport {
  const exactTotal = Math.max(0, probe.decisionsExactTotal ?? 0)
  // PROXY alone never satisfies the floor — exact ledger only.
  const decisionsForGate = exactTotal
  const scale: ScaleSnapshot = {
    population: probe.maxPop,
    days: probe.days,
    seedCount: probe.seeds.length,
    decisionsSampled: decisionsForGate,
  }
  const report = emptyHarnessReport(probe.induced)
  const nOk = probe.rows.length
  const sum = <K extends keyof Phase3SoakProbeLike['rows'][0]>(k: K): number =>
    probe.rows.reduce((a, r) => a + (Number(r[k]) || 0), 0)

  const wireOk = nOk > 0 && probe.crashedSeeds.length < probe.seeds.length
  const mechFin = finalizeLabel({
    channel: 'MECHANISM',
    proposed: wireOk ? 'PASS' : 'FAIL',
    scale,
    testSetupPresent: probe.induced,
  })
  pushBlock(
    report,
    makeEvidenceBlock({
      test: 'phase3.soak_wire',
      channel: 'MECHANISM',
      scale,
      seeds: probe.seeds,
      expected: 'Natural soak completes for >=1 seed; dumps written; no induce',
      result: mechFin.result,
      evidence: [
        `seedsOk=${nOk}/${probe.seeds.length}`,
        `crashed=[${probe.crashedSeeds.join(',')}]`,
        `decisionsPROXY=${probe.decisionsProxyTotal} (ignored for PASS gate)`,
        `decisionExactTotal=${exactTotal}`,
        probe.induced ? 'TEST SETUP present' : 'natural path',
      ],
      observed: {
        seedsOk: nOk,
        decisionsProxy: probe.decisionsProxyTotal,
        decisionExactTotal: exactTotal,
        maxPop: probe.maxPop,
      },
    }),
  )

  const pushEmergence = (
    test: string,
    proposed: EvidenceResult,
    expected: string,
    observed: Record<string, number | string>,
    thresholdExtra?: Record<string, number>,
    evidenceExtra: string[] = [],
  ) => {
    const fin = finalizeLabel({
      channel: 'EMERGENCE',
      proposed,
      scale,
      suite: 'individual',
      testSetupPresent: probe.induced,
    })
    // Refuse PASS if proposed PASS but metrics miss thresholds — caller must set proposed honestly.
    let result = fin.result
    if (proposed === 'PASS' && result === 'PASS') {
      // keep only if exact ledger floor met (belt-and-suspenders with finalizeLabel)
      if (exactTotal < 10000) {
        result = 'NOT_TESTED'
      }
    } else if (proposed === 'PASS' && result !== 'PASS') {
      result = result
    } else if (proposed !== 'PASS') {
      result = proposed === 'FAIL' ? 'FAIL' : proposed
      // Still apply undersize force for PASS/PARTIAL only; NOT_TESTED stays
      if (fin.result === 'NOT_TESTED' && (proposed === 'PARTIAL' || proposed === 'PASS')) {
        result = 'NOT_TESTED'
      }
    }
    if (result === 'PASS' && (exactTotal < 10000 || !fin.gate.okForPass)) {
      result = 'NOT_TESTED'
    }
    pushBlock(
      report,
      makeEvidenceBlock({
        test,
        channel: 'EMERGENCE',
        scale,
        seeds: probe.seeds,
        expected,
        threshold: thresholdExtra,
        result,
        evidence: [
          fin.note ?? 'sec20 gate',
          ...(fin.gate.violations.length ? [`violations: ${fin.gate.violations.join('; ')}`] : []),
          ...evidenceExtra,
          'Never invent PASS without thresholds + evidence',
        ],
        observed,
      }),
    )
  }

  // Scale gate itself
  pushEmergence(
    'phase3.sec20_individual_scale',
    exactTotal >= 10000 && probe.maxPop >= 100 && probe.days >= 60 && probe.seeds.length >= 3
      ? 'PARTIAL'
      : 'NOT_TESTED',
    'pop>=100 days>=60 seeds>=3 decisions>=10000 exact',
    {
      maxPop: probe.maxPop,
      days: probe.days,
      seeds: probe.seeds.length,
      decisionsProxy: probe.decisionsProxyTotal,
      decisionExactTotal: exactTotal,
      decisionsExact: exactTotal,
    },
    { minDecisions: 10000 },
    [
      'PROXY task-kind changes do NOT count as exact decisions for PASS',
      `decisionExactTotal=${exactTotal} (gate uses exact only; PROXY=${probe.decisionsProxyTotal})`,
      probe.decisionsExactBySource
        ? `bySource chooseTask=${probe.decisionsExactBySource.chooseTask ?? 0} HARD=${probe.decisionsExactBySource.HARD ?? 0} setTask=${probe.decisionsExactBySource.setTask ?? 0} other=${probe.decisionsExactBySource.other ?? 0}`
        : 'bySource not provided',
      `social START@${probe.socialBlocked.requested} -> clamped ${probe.socialBlocked.clamped} (max ${probe.socialBlocked.clampMax}) status=${probe.socialBlocked.status}`,
    ],
  )

  const aliveOk = nOk > 0 && probe.rows.every((r) => r.aliveEnd > 0)
  pushEmergence(
    'phase3.survival',
    aliveOk ? 'PARTIAL' : nOk === 0 ? 'FAIL' : 'NOT_TESTED',
    'aliveEnd>0 all seeds; deaths tracked (sec20 soak)',
    {
      minAliveEnd: nOk ? Math.min(...probe.rows.map((r) => r.aliveEnd)) : 0,
      deaths: sum('deaths'),
      births: sum('births'),
    },
  )

  const uniqKinds = nOk ? Math.max(...probe.rows.map((r) => r.uniqueTaskKinds)) : 0
  pushEmergence(
    'phase3.sec23_decision_diversity',
    uniqKinds >= 5 ? 'PARTIAL' : 'NOT_TESTED',
    '>=5 TaskKinds; trajectories/entropy/exact decisions instrumented via CP1 ledger',
    {
      uniqueTaskKindsMax: uniqKinds,
      decisionsProxy: probe.decisionsProxyTotal,
      decisionExactTotal: exactTotal,
    },
    undefined,
    [
      exactTotal > 0
        ? `CP1 exact ledger live (total=${exactTotal}); PROXY still ignored for PASS floor`
        : 'Exact ledger empty — PROXY only cannot award full PASS',
    ],
  )

  const sec22Status = probe.causality?.sec22Status ?? 'NOT_TESTED'
  // Instrumentation may be PARTIAL; acceptance PASS requires mission thresholds (>=20/15/5/3NPC/3seeds) — never auto-PASS.
  const sec22Proposed: EvidenceResult =
    sec22Status === 'PARTIAL'
      ? 'PARTIAL'
      : sec22Status === 'CONNECTION_NOT_PROVEN'
        ? 'CONNECTION_NOT_PROVEN'
        : 'NOT_TESTED'
  pushEmergence(
    'phase3.sec22_ab_connections',
    sec22Proposed,
    'A->B chains with thresholds >=20/15/5 events, >=3 NPC, >=3 seeds — PASS only if earned (never from counters alone)',
    {
      sec22Status,
      decisionExactTotal: exactTotal,
      priorityLabels: probe.causality?.priorityLabels,
      allLocalFloorsMet: probe.causality?.allLocalFloorsMet ?? false,
      missionFloorsMet: probe.causality?.missionFloorsMet ?? false,
    },
    undefined,
    [
      `causality.sec22Status=${sec22Status}`,
      probe.causality?.chains ? `chains=${JSON.stringify(probe.causality.chains)}` : 'chains not provided',
      probe.causality?.priorityLabels
        ? `priorityLabels=${JSON.stringify(probe.causality.priorityLabels)}`
        : 'priorityLabels not provided',
      probe.causality?.underFloors?.length
        ? `underFloors=${probe.causality.underFloors.join(';')}`
        : 'underFloors none/unknown',
      probe.causality?.chainBlocks?.length
        ? `chainBlocks=${probe.causality.chainBlocks.length}`
        : 'chainBlocks not provided',
      'CONNECTION_NOT_PROVEN / PARTIAL / NOT_TESTED only — no auto PASS; DP12 floors honest',
    ],
  )

  const persPairs = probe.attribution?.personalityPairSamples ?? 0
  const persReady = probe.attribution?.personalityPairReady ?? 0
  const persDiv = probe.attribution?.personalityPairDivergent ?? 0
  const persFlips = probe.attribution?.personalityCausalFlips ?? 0
  const persAttr = probe.attribution?.personalityAttributedDecisions ?? 0
  const memFlips = probe.attribution?.memoryCausalFlips ?? 0
  const memAttr = probe.attribution?.memoryAttributedDecisions ?? 0
  const emoFlips = probe.attribution?.emotionCausalFlips ?? 0
  const emoAttr = probe.attribution?.emotionAttributedDecisions ?? 0
  pushEmergence(
    'phase3.sec24_personality',
    persFlips > 0 || persDiv > 0
      ? 'PARTIAL'
      : persReady > 0 || persPairs > 0 || persAttr > 0
        ? 'PARTIAL'
        : 'NOT_TESTED',
    'PASS gated on personalityCausalFlips + natural pairDivergent/ready (>=50% target); personalityAttributed* DEBUG only; no trait rewrite',
    {
      personalityCausalFlips: persFlips,
      personalityPairReady: persReady,
      personalityPairDivergent: persDiv,
      personalityPairSamples: persPairs,
      personalityAttributedDebug: persAttr,
      personalityUses: probe.attribution?.personalityUses ?? 0,
    },
  )
  pushEmergence(
    'phase3.sec25_memory',
    memFlips >= 20 ? 'PARTIAL' : memFlips > 0 ? 'PARTIAL' : memAttr > 0 ? 'PARTIAL' : 'NOT_TESTED',
    'PASS gated on memoryCausalFlips (>=20 soak / >=10 smoke floor); memoryAttributed* DEBUG only',
    {
      memoryCausalFlips: memFlips,
      memoryAttributedDebug: memAttr,
      memoryMemorableEvents: probe.attribution?.memoryMemorableEvents ?? 0,
      memoryRetrievals: probe.attribution?.memoryRetrievals ?? 0,
      memoryUses: probe.attribution?.memoryUses ?? 0,
    },
  )
  pushEmergence(
    'phase3.sec26_emotions',
    emoFlips >= 15 ? 'PARTIAL' : emoFlips > 0 ? 'PARTIAL' : emoAttr > 0 ? 'PARTIAL' : 'NOT_TESTED',
    'PASS gated on emotionCausalFlips (>=15 soak); emotionAttributed* DEBUG only',
    {
      emotionCausalFlips: emoFlips,
      emotionAttributedDebug: emoAttr,
      emotionChanges: probe.attribution?.emotionChanges ?? 0,
      emotionUses: probe.attribution?.emotionUses ?? 0,
    },
  )

  const teach = sum('teachCraftStarts')
  const teachTrue = probe.rows.reduce(
    (acc, r) => acc + ((r as { teachTrueLaterUses?: number }).teachTrueLaterUses ?? 0),
    0,
  )
  const teachLaterProxy = probe.rows.reduce(
    (acc, r) => acc + ((r as { teachLaterUses?: number }).teachLaterUses ?? 0),
    0,
  )
  pushEmergence(
    'phase3.sec27_learning',
    teach >= 30 ? 'PARTIAL' : 'NOT_TESTED',
    'teach>=30 + progress%/true later use (teachTrueLaterUses); laterUses=DEBUG proxy',
    {
      teachCraftStarts: teach,
      teachTrueLaterUses: teachTrue,
      teachLaterUsesProxyDebug: teachLaterProxy,
    },
    undefined,
    ['Volume + true-chain counters wired — acceptance PENDING; never auto-PASS'],
  )

  const profCh = sum('professionChanges')
  const profNpc = sum('professionChangeNpcs')
  const profKinds = nOk ? Math.max(...probe.rows.map((r) => r.professionsInvolved)) : 0
  const profProposed: EvidenceResult =
    profCh >= 20 && profNpc >= 10 && profKinds >= 4 && nOk >= 3 ? 'PASS' : profCh > 0 ? 'PARTIAL' : 'NOT_TESTED'
  pushEmergence(
    'phase3.sec28_professions',
    profProposed,
    'changes>=20 npcs>=10 distinct>=4 seeds>=3',
    { professionChanges: profCh, npcs: profNpc, distinctProfs: profKinds, seedsOk: nOk },
  )

  const families = nOk ? Math.max(...probe.rows.map((r) => r.familyCount)) : 0
  const births = sum('births')
  pushEmergence(
    'phase3.sec29_families',
    families >= 30 && births >= 20 ? 'PARTIAL' : families > 0 || births > 0 ? 'PARTIAL' : 'NOT_TESTED',
    'families>=30 births>=20 + eco/collective (unmeasured)',
    { familyCountMax: families, births },
    undefined,
    ['eco shifts / collective decisions NOT TESTED'],
  )

  const help = sum('helpTotal')
  const helpCats = nOk ? Math.max(...probe.rows.map((r) => r.helpCategoryCount)) : 0
  pushEmergence(
    'phase3.sec30_mutual_aid',
    help >= 50 && helpCats >= 3 ? 'PARTIAL' : help > 0 ? 'PARTIAL' : 'NOT_TESTED',
    'help>=50 categories>=3 helpers/helped unmeasured',
    { helpTotal: help, helpCategoriesMax: helpCats },
  )

  const houses = sum('houses')
  const mills = sum('mills')
  pushEmergence(
    'phase3.sec31_construction',
    houses + mills >= 30 ? 'PARTIAL' : houses + mills > 0 ? 'PARTIAL' : 'NOT_TESTED',
    'builds>=30 (houses+mills proxy)',
    { houses, mills },
  )

  const harvest = sum('harvestStarts')
  const grind = sum('grindStarts')
  const bake = sum('bakeStarts')
  pushEmergence(
    'phase3.sec32_natural_price',
    harvest > 0 && grind > 0 && bake > 0 ? 'PARTIAL' : harvest > 0 ? 'PARTIAL' : 'NOT_TESTED',
    'organic price/food-chain proxy only (EMERGENCE candidate; no induced shock)',
    { harvestStarts: harvest, grindStarts: grind, bakeStarts: bake, priceKeys: sum('priceKeys') },
    undefined,
    [
      'NATURAL channel: organic priceDelta+task/prof correlational PARTIAL',
      'Controlled shock chains live in MECHANISM probe P9-eco-shock-controlled — never aggregate into EMERGENCE PASS',
    ],
  )

  // Controlled shock is MECHANISM / TEST SETUP — documented so soak never claims it.
  pushBlock(
    report,
    makeEvidenceBlock({
      test: 'phase3.sec32_controlled_shock',
      channel: 'MECHANISM',
      scale,
      result: 'NOT_TESTED',
      expected: 'shock->decision->supply/demand->price (controlled probe only)',
      observed: { note: 'see scripts/_probe_phase5_eco_shock.ts' },
      evidence: [
        'TEST SETUP / MECHANISM only — refuse EMERGENCE PASS',
        'Natural soak must not inject wheat/stock shocks',
      ],
      testSetup: 'TEST SETUP: controlled eco shock lives outside EMERGENCE soak',
    }),
  )

  const leaves = sum('leaves')
  pushEmergence(
    'phase3.sec33_migration',
    leaves >= 20 ? 'PASS' : leaves > 0 ? 'PARTIAL' : 'NOT_TESTED',
    'leaves>=20',
    {
      leaves,
      rejoins: sum('rejoins'),
      foundCamps: sum('foundCamps'),
      destinations: sum('distinctDestinations'),
    },
  )

  const circles = sum('circlesFormed')
  pushEmergence(
    'phase3.sec34_groups',
    circles >= 20 ? 'PARTIAL' : circles > 0 ? 'PARTIAL' : 'NOT_TESTED',
    'groups formed>=20 surviving>=20d unproven fully',
    { circlesFormed: circles, livingCircles: sum('livingCircles') },
  )

  const inst = sum('institutionsFormed')
  const inst30 = sum('institutionsAgeGe30d')
  pushEmergence(
    'phase3.sec35_institutions',
    inst >= 10 && inst30 >= 5 ? 'PARTIAL' : inst > 0 || inst30 > 0 ? 'PARTIAL' : 'NOT_TESTED',
    'institutions>=10 lived30d>=5',
    { institutionsFormed: inst, institutionsAgeGe30d: inst30 },
  )

  const creed = sum('creedChanges')
  const creedGen2 = sum('creedGen2Events')
  pushEmergence(
    'phase3.sec36_creed',
    creed >= 10 ? 'PARTIAL' : creed > 0 ? 'PARTIAL' : 'NOT_TESTED',
    creedGen2 > 0
      ? 'belief changes>=10 + DP11 gen2 instrument LIVE (culture acceptance PENDING)'
      : 'belief changes>=10 + DP11 gen counters (culture often NOT_TESTED until long soak)',
    {
      creedChanges: creed,
      creedFollowups: sum('creedFollowups'),
      creedParentChildTransmissions: sum('creedParentChildTransmissions'),
      creedChildBehaviorInfluenced: sum('creedChildBehaviorInfluenced'),
      creedGenDepthMax: nOk ? Math.max(...probe.rows.map((r) => r.creedGenDepthMax ?? 0)) : 0,
      creedGen2Events: creedGen2,
      creedGen3Events: sum('creedGen3Events'),
      creedNpcCount: sum('creedNpcCount'),
    },
  )

  const conflicts = sum('conflictsTotal')
  const causes = nOk ? Math.max(...probe.rows.map((r) => r.distinctConflictCauses)) : 0
  pushEmergence(
    'phase3.sec37_conflicts',
    conflicts >= 20 && causes >= 5 ? 'PARTIAL' : conflicts > 0 ? 'PARTIAL' : 'NOT_TESTED',
    'conflicts>=20 causes>=5',
    { conflictsTotal: conflicts, distinctCausesMax: causes },
  )

  pushEmergence(
    'phase3.sec38_multiseed',
    'NOT_TESTED',
    '>=10 seeds divergence matrix',
    { seedCount: probe.seeds.length },
  )

  pushEmergence(
    'phase3.social_tier_300',
    'BLOCKED',
    'START@300 within clamp — capacity blocked',
    {
      requested: probe.socialBlocked.requested,
      clamped: probe.socialBlocked.clamped,
      clampMax: probe.socialBlocked.clampMax,
    },
    undefined,
    [
      `BLOCKED capacite: initialVillagers clamp max=${probe.socialBlocked.clampMax} (300->${probe.socialBlocked.clamped})`,
      'Do not raise clamp; != FAIL emergence',
    ],
  )

  report.globalClaim = 'NON_DECLARED'
  return report
}

/** Document-only registry for remaining probes (no auto-exec). */
export const DOCUMENTED_PROBE_ADAPTERS: { id: string; path: string; note: string }[] = [
  {
    id: 'phase3_emergence_soak',
    path: 'scripts/_probe_phase3_emergence_soak.ts',
    note: 'PHASE 3+CP1 WIRED — adaptPhase3EmergenceSoak; natural START@100; PROXY ignored for PASS; gate uses decisionExactTotal',
  },
  {
    id: 'phase4_causality_soak',
    path: 'scripts/_probe_phase4_causality_soak.ts',
    note: 'CP5 WIRED — natural 100x60x3; exact+causality+attribution+INC01-04; finalizeLabel refuses PASS if exact<10000 or floors fail; GLOBAL NON DECLARED',
  },
  {
    id: 'phase4_decision_smoke',
    path: 'scripts/_probe_phase4_decision_smoke.ts',
    note: 'CP1 WIRED — short smoke (>=1 seed, <=5d) proves decisionExactTotal > 0',
  },
  {
    id: 'scale_policy_wp12',
    path: 'scripts/harness/scalePolicy.ts',
    note: 'WP12 WIRED — sec20 presets; START@100 READY; START@300 BLOCKED capacite (clamp 120); run.ts --scale',
  },
  {
    id: 'migration_natural',
    path: 'scripts/_probe_migration_natural.ts',
    note: 'WP11 WIRED — adaptMigrationProbe; sec33/38 ACCEPTANCE typically NOT_TESTED on short natural soak',
  },
  {
    id: 'second_audit_emergence',
    path: 'scripts/_probe_second_audit_emergence.ts',
    note: 'WIRED — imports adaptSecondAuditEmergence at end of probe',
  },
  {
    id: 'emergence_seeds',
    path: 'scripts/_probe_emergence_seeds.ts',
    note: 'ADAPTER DOC — wrap multi-seed rows via makeEvidenceBlock + finalizeLabel',
  },
  {
    id: 'careers',
    path: 'scripts/_probe_careers.ts',
    note: 'ADAPTER DOC — MECHANISM profession histograms; EMERGENCE needs sec20',
  },
  {
    id: 'food_chain',
    path: 'scripts/_probe_food_chain.ts',
    note: 'ADAPTER DOC — MECHANISM farm/mill; never EMERGENCE PASS alone',
  },
  {
    id: 'society',
    path: 'scripts/_probe_society.ts',
    note: 'WP10 WIRED — adaptSocietyProbe; secs 34-37 ACCEPTANCE PENDING (no multi-seed soak)',
  },
]
