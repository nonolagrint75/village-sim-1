/**
 * WP1 minimal harness runner — honesty smoke (no sim step as PASS proof).
 * WP12: prints sec20 scale capacity presets (READY / BLOCKED capacite / UNPROVEN_GROW).
 *
 * Run:
 *   npx tsx scripts/harness/run.ts
 *   npx tsx scripts/harness/run.ts --demo-undersized
 *   npx tsx scripts/harness/run.ts --scale
 */

import { SEC20_FLOORS } from './types.ts'
import { checkSec20Scale, finalizeLabel, refuseUndersizedPass } from './gates.ts'
import { createTelemetryCollector } from './collectors.ts'
import { makeEvidenceBlock, formatEvidenceBlock } from './evidence.ts'
import { emptyHarnessReport, pushBlock, summarizeChannels } from './channels.ts'
import { DOCUMENTED_PROBE_ADAPTERS } from './adapters.ts'
import {
  assessAllScalePresets,
  assessSocialStart300Blocked,
  formatScaleCapacityReport,
  SCALE_CLAMPS,
  SEC20_INDIVIDUAL_START,
} from './scalePolicy.ts'
import type { ScaleSnapshot } from './types.ts'

function demoUndersizedGate(): void {
  console.log('=== WP1 harness smoke — sec20 gate refuses undersized PASS ===\n')

  const undersized: ScaleSnapshot = {
    population: 26,
    days: 40,
    seedCount: 2,
    decisionsSampled: 100,
  }
  const gate = checkSec20Scale('individual', undersized)
  console.log('Individual floors:', SEC20_FLOORS.individual)
  console.log('Undersized scale:', undersized)
  console.log('Gate:', gate)

  const refused = refuseUndersizedPass('EMERGENCE', 'PASS', undersized, 'individual', false)
  console.log('Proposed EMERGENCE PASS →', refused, '(must not be PASS)')

  if (refused === 'PASS') {
    console.error('FAIL: gate allowed undersized EMERGENCE PASS')
    process.exit(1)
  }

  const withSetup = finalizeLabel({
    channel: 'EMERGENCE',
    proposed: 'PASS',
    scale: { population: 120, days: 60, seedCount: 3, decisionsSampled: 12_000 },
    testSetupPresent: true,
  })
  console.log('At-floor but TEST SETUP →', withSetup.result, withSetup.note)

  if (withSetup.result === 'PASS') {
    console.error('FAIL: TEST SETUP labeled emergent PASS')
    process.exit(1)
  }

  // Social floors documented
  console.log('\nSocial floors (documented):', SEC20_FLOORS.social)
  console.log('Rare floors (documented):', SEC20_FLOORS.rare)
  console.log('Gens floors (documented):', SEC20_FLOORS.gens)
}

function demoChannelsAndEvidence(): void {
  console.log('\n=== MECHANISM vs EMERGENCE channels + sec43 template ===\n')
  const collectors = createTelemetryCollector()
  // no-op compile smoke
  collectors.decisions.record({ tick: 1, taskKind: 'sowField' })
  collectors.taskEntropy.observe('sowField')
  collectors.whyFactors.retain({ tick: 1, factors: null })

  const report = emptyHarnessReport(true)
  const scale: ScaleSnapshot = {
    population: 26,
    days: 40,
    seedCount: 1,
    decisionsSampled: collectors.decisions.count,
  }

  const mech = makeEvidenceBlock({
    test: 'smoke.mill_wire',
    channel: 'MECHANISM',
    scale,
    seeds: [7],
    expected: 'Mechanism channel may PASS without sec20 soak',
    result: 'PASS',
    evidence: ['harness smoke — not a mission emergence claim'],
    testSetup: undefined,
    actual: {
      taskEntropy: collectors.taskEntropy.entropy() ?? 'null',
      whyFactorsKept: collectors.whyFactors.size,
    },
  })
  pushBlock(report, mech)

  const em = finalizeLabel({
    channel: 'EMERGENCE',
    proposed: 'PASS',
    scale,
    testSetupPresent: true,
  })
  pushBlock(
    report,
    makeEvidenceBlock({
      test: 'smoke.emergence_refused',
      channel: 'EMERGENCE',
      scale,
      seeds: [7],
      expected: 'Must be NOT_TESTED under floors / TEST SETUP',
      result: em.result,
      evidence: [em.note ?? ''],
      testSetup: 'TEST SETUP: smoke induced flag',
    }),
  )

  console.log(formatEvidenceBlock(report.mechanism[0]!))
  console.log()
  console.log(formatEvidenceBlock(report.emergence[0]!))
  console.log()
  console.log(summarizeChannels(report))

  console.log('\nProbe adapter registry:')
  for (const a of DOCUMENTED_PROBE_ADAPTERS) {
    console.log(`  ${a.id.padEnd(28)} ${a.path}  — ${a.note}`)
  }
}

function demoScalePolicyWp12(): void {
  console.log('\n=== WP12 sec20 scale capacity (≠ EMERGENCE PASS) ===\n')
  console.log('Clamps:', SCALE_CLAMPS)
  console.log('Individual start preset config:', SEC20_INDIVIDUAL_START.config)
  console.log('  raisesFounders=', SEC20_INDIVIDUAL_START.raisesFounders, '— label TEST SETUP for EMERGENCE claims')
  console.log()

  for (const { preset, capacity } of assessAllScalePresets()) {
    console.log(`-- ${preset.id} (${preset.path})`)
    console.log(formatScaleCapacityReport(capacity))
    console.log()
  }

  const socialStart = assessSocialStart300Blocked()
  console.log('-- social START@300 (explicit clamp probe)')
  console.log(formatScaleCapacityReport(socialStart))
  if (socialStart.evidenceResult !== 'BLOCKED' && !socialStart.canStartAtFloor) {
    console.log('  (start path blocked by clamp; grow may still be UNPROVEN_GROW)')
  }
  console.log('\nWP12: no EMERGENCE PASS claimed; BLOCKED capacite ≠ FAIL emergence.')
}

function main(): void {
  const scaleOnly = process.argv.includes('--scale')
  console.log('WP1 harness runner — instrumentation only; globalClaim=NON_DECLARED\n')
  if (!scaleOnly) {
    demoUndersizedGate()
    demoChannelsAndEvidence()
  }
  demoScalePolicyWp12()
  console.log('\nHarness smoke OK.')
}

main()
