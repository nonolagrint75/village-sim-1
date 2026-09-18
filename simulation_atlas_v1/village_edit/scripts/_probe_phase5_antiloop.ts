/**
 * Phase 5 DP10 smoke - anti-loop / TaskKind day-sequences (measure-first).
 * Natural path only. No fake entropy / random task injection.
 *
 *   npx tsx scripts/_probe_phase5_antiloop.ts [days=12] [seed=7]
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { snapshotBehaviorSeqMetrics } from '../src/lib/sim/behaviorSequenceMetrics'
import { snapshotDecisionExact } from '../src/lib/sim/decisionLedger'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const days = Math.min(30, Math.max(1, Number(process.argv[2] ?? 12)))
const seed = Number(process.argv[3] ?? 7)

const CONFIG = {
  initialVillagers: 100,
  maxPopulation: 250,
  preset: 'standard' as const,
  worldSize: 1000 as const,
  seed,
}

console.log('=== PHASE 5 DP10 ANTI-LOOP / SEQUENCES SMOKE ===')
console.log('days=' + days + ' seed=' + seed + ' (natural; measure-first; farm not stuck)')

const t0 = Date.now()
let state = createSimulation(seed, CONFIG)
const ticks = days * TICKS_PER_DAY
for (let i = 0; i < ticks; i++) {
  state = stepSimulation(state)
}

const seq = snapshotBehaviorSeqMetrics(state)
const exact = snapshotDecisionExact(state)
const elapsedMs = Date.now() - t0
const c = seq.counters

const dump = {
  phase: 5,
  dp: 'DP10',
  induced: false,
  seed,
  days,
  ticks,
  elapsedMs,
  decisionExactTotal: exact.decisionExactTotal,
  counters: c,
  variationPct: seq.variationPct,
  stuckLoop14dPct: seq.stuckLoop14dPct,
  secondaryGoalStablePct: seq.secondaryGoalStablePct,
  acceptanceTargets: seq.acceptanceTargets,
  designNote:
    'Daytime-dominant TaskKind sequences over rolling 30d. Farm/survival multi-day runs excluded from stuck. Night rest excluded from day-dominant. Light teach/social habit damp max ~32% (no softmax rewrite).',
  acceptance: 'PENDING',
  note: 'DONE CODE wired smoke - never PASS from this smoke; acceptance PENDING (needs 30d soak)',
}

const outPath = path.join(ROOT, '_phase5_antiloop_smoke_s' + seed + '.json')
fs.writeFileSync(outPath, JSON.stringify(dump, null, 2), 'utf8')

console.log(
  JSON.stringify(
    {
      decisionExactTotal: dump.decisionExactTotal,
      counters: c,
      variationPct: dump.variationPct,
      stuckLoop14dPct: dump.stuckLoop14dPct,
      secondaryGoalStablePct: dump.secondaryGoalStablePct,
      acceptance: dump.acceptance,
    },
    null,
    2,
  ),
)
console.log('\nSMOKE (instrumentation) -> ' + outPath)