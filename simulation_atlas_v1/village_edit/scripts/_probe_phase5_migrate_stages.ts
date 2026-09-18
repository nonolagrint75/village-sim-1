/**
 * Phase 5 DP7 smoke - leave->camp causal stages (measure-first).
 * Natural path only. No if-leave-createCamp; no leave-rate buff.
 *
 *   npx tsx scripts/_probe_phase5_migrate_stages.ts [days=12] [seed=3]
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { snapshotCausalityMetrics } from '../src/lib/sim/causalityMetrics'
import { snapshotMigrationMetrics } from '../src/lib/sim/migrationMetrics'
import { snapshotDecisionExact } from '../src/lib/sim/decisionLedger'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const days = Math.min(25, Math.max(1, Number(process.argv[2] ?? 12)))
const seed = Number(process.argv[3] ?? 3)

const CONFIG = {
  initialVillagers: 100,
  maxPopulation: 250,
  preset: 'standard' as const,
  worldSize: 1000 as const,
  seed,
}

console.log('=== PHASE 5 DP7 LEAVE->CAMP STAGES SMOKE ===')
console.log('days=' + days + ' seed=' + seed + ' (natural; measure-first; no auto createCamp)')

const t0 = Date.now()
let state = createSimulation(seed, CONFIG)
const ticks = days * TICKS_PER_DAY
for (let i = 0; i < ticks; i++) {
  state = stepSimulation(state)
}

const caus = snapshotCausalityMetrics(state)
const mig = snapshotMigrationMetrics(state)
const exact = snapshotDecisionExact(state)
const elapsedMs = Date.now() - t0
const c = caus.counters
const m = mig.counters

const stages = {
  urgeCrosses: c.migrateUrgeCrosses,
  leaveAttempts: c.migrateLeaveAttempts,
  leaves: c.migrateLeaves,
  migrateHomelessLeave: c.migrateHomelessLeave,
  migrateHousedLeave: c.migrateHousedLeave,
  migrateTravelStarts: c.migrateTravelStarts,
  migrateDestEvals: c.migrateDestEvals,
  migrateSettlementAttempts: c.migrateSettlementAttempts,
  migrateFoundCamps: c.migrateFoundCamps,
  migrateRejoins: c.migrateRejoins,
  migrateFails: c.migrateFails,
  blockedBy: m.blockedBy,
  destReasons: m.destReasons,
  settleBlockReasons: m.settleBlockReasons,
  leaveCauses: m.leavesByCause,
}

const dump = {
  phase: 5,
  dp: 'DP7',
  induced: false,
  seed,
  days,
  ticks,
  elapsedMs,
  decisionExactTotal: exact.decisionExactTotal,
  stages,
  migrateChain: caus.chains.migrate,
  designNote:
    'Camp = hearth secession (hasHome). Homeless leave -> travel -> destEval -> rejoin|fail. No if-leave-createCamp.',
  acceptance: 'PENDING',
  note: 'DONE CODE wired smoke — never PASS from this smoke; acceptance PENDING',
}

const outPath = path.join(ROOT, '_phase5_migrate_stages_smoke_s' + seed + '.json')
fs.writeFileSync(outPath, JSON.stringify(dump, null, 2), 'utf8')

console.log(
  JSON.stringify(
    {
      decisionExactTotal: dump.decisionExactTotal,
      stages,
      migrateChain: dump.migrateChain,
      acceptance: dump.acceptance,
    },
    null,
    2,
  ),
)
console.log('\nSMOKE (instrumentation) -> ' + outPath)