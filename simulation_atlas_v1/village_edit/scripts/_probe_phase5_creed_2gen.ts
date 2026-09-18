/**
 * Phase 5 DP11 smoke - creed/culture 2-gen instrument (measure-first).
 * Natural path only. No CREATE_CREED / birth creed force / fake generations.
 *
 *   npx tsx scripts/_probe_phase5_creed_2gen.ts [days=12] [seed=7]
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { snapshotCausalityMetrics } from '../src/lib/sim/causalityMetrics'
import { snapshotSocietyMetrics } from '../src/lib/sim/societyMetrics'
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

console.log('=== PHASE 5 DP11 CREED 2-GEN INSTRUMENT SMOKE ===')
console.log('days=' + days + ' seed=' + seed + ' (natural; no birth creed force)')

const t0 = Date.now()
let state = createSimulation(seed, CONFIG)
const ticks = days * TICKS_PER_DAY
for (let i = 0; i < ticks; i++) {
  state = stepSimulation(state)
}

const caus = snapshotCausalityMetrics(state)
const society = snapshotSocietyMetrics(state)
const exact = snapshotDecisionExact(state)
const elapsedMs = Date.now() - t0
const c = caus.counters

const dump = {
  phase: 5,
  dp: 'DP11',
  induced: false,
  seed,
  days,
  ticks,
  elapsedMs,
  births: state.births,
  decisionExactTotal: exact.decisionExactTotal,
  creedPeer: {
    changes: c.creedChanges,
    followups: c.creedFollowups,
    npcCount: c.creedNpcCount,
    chain: caus.chains.creed,
  },
  creedCulture: {
    parentChildTransmissions: c.creedParentChildTransmissions,
    childBehaviorInfluenced: c.creedChildBehaviorInfluenced,
    genDepthMax: c.creedGenDepthMax,
    gen2Events: c.creedGen2Events,
    gen3Events: c.creedGen3Events,
    chain: caus.chains.creedCulture,
  },
  societyCreed: {
    changes: society.counters.creedChanges,
    followups: society.counters.creedBehaviorFollowups,
    followupRate: society.creedFollowupRate,
  },
  chains: caus.chains,
  sec22Status: caus.sec22Status,
  designNote:
    'Instrument only: parent belief -> spread/crystallize/shrine -> child creed match -> child task followup. No CREATE_CREED; no birth creed assign; short smoke may show gen=0 (honest NOT_TESTED).',
  acceptance: 'PENDING',
  note: 'DONE CODE wired smoke - never PASS from this smoke; acceptance PENDING (long soak for 2-gen)',
}

const outPath = path.join(ROOT, '_phase5_creed_2gen_smoke_s' + seed + '.json')
fs.writeFileSync(outPath, JSON.stringify(dump, null, 2), 'utf8')

console.log(
  JSON.stringify(
    {
      decisionExactTotal: dump.decisionExactTotal,
      births: dump.births,
      creedPeer: dump.creedPeer,
      creedCulture: dump.creedCulture,
      sec22Status: dump.sec22Status,
      acceptance: dump.acceptance,
    },
    null,
    2,
  ),
)
console.log('\nSMOKE (instrumentation) -> ' + outPath)
