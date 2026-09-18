/**
 * Phase 5 DP5 smoke - profession multi-factor explainability on natural short run.
 * Natural path only. No hungry->farmer scripting; no score rewrite.
 *
 *   npx tsx scripts/_probe_phase5_profession_cf.ts [days=6] [seed=1]
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { snapshotAttribution } from '../src/lib/sim/attributionMetrics'
import { snapshotDecisionExact } from '../src/lib/sim/decisionLedger'
import { PROFESSION_FACTOR_MATERIAL, PROFESSION_MULTIFACTOR_TARGET } from '../src/lib/sim/professionFactors'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const days = Math.min(8, Math.max(1, Number(process.argv[2] ?? 6)))
const seed = Number(process.argv[3] ?? 1)

const CONFIG = {
  initialVillagers: 100,
  maxPopulation: 250,
  preset: 'standard' as const,
  worldSize: 1000 as const,
  seed,
}

console.log('=== PHASE 5 DP5 PROFESSION MULTI-FACTOR SMOKE ===')
console.log('days=' + days + ' seed=' + seed + ' (natural; measure-first; no induce)')

const t0 = Date.now()
let state = createSimulation(seed, CONFIG)
const ticks = days * TICKS_PER_DAY
for (let i = 0; i < ticks; i++) {
  state = stepSimulation(state)
}

const attr = snapshotAttribution(state)
const exact = snapshotDecisionExact(state)
const elapsedMs = Date.now() - t0
const samples = (attr.professionFactorSamples ?? []).slice(0, 8)
const share = attr.professionExplainableShare ?? 0

const dump = {
  phase: 5,
  dp: 'DP5',
  induced: false,
  seed,
  days,
  ticks,
  elapsedMs,
  decisionExactTotal: exact.decisionExactTotal,
  professionChanges: attr.professionChanges,
  professionChangesMultiFactor: attr.professionChangesMultiFactor,
  professionExplainableShare: share,
  materialThreshold: PROFESSION_FACTOR_MATERIAL,
  targetShare: PROFESSION_MULTIFACTOR_TARGET,
  samples,
  acceptance: 'PENDING',
  note: 'CODE wired smoke - multi-factor explainability instrumented; acceptance PENDING; never PASS from this smoke',
}

const outPath = path.join(ROOT, '_phase5_profession_cf_smoke_s' + seed + '.json')
fs.writeFileSync(outPath, JSON.stringify(dump, null, 2), 'utf8')

console.log(
  JSON.stringify(
    {
      decisionExactTotal: dump.decisionExactTotal,
      professionChanges: dump.professionChanges,
      professionChangesMultiFactor: dump.professionChangesMultiFactor,
      professionExplainableShare: Math.round(share * 1000) / 1000,
      materialThreshold: dump.materialThreshold,
      targetShare: dump.targetShare,
      sampleCount: samples.length,
      samples: samples.slice(0, 3),
      acceptance: dump.acceptance,
    },
    null,
    2,
  ),
)
console.log('\nSMOKE (instrumentation) -> ' + outPath)
