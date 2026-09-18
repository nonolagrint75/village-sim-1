/**
 * WP11 natural migration soak — no induced famine / profession / CREATE_MIGRATE.
 * Prefer short multi-seed smoke; sec33/20/38 often NOT_TESTED at this scale (honest).
 *
 *   npx tsx scripts/_probe_migration_natural.ts [days=25] [seeds=1,3,7]
 */
import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { politicsOf } from '../src/lib/sim/politics'
import { snapshotMigrationMetrics } from '../src/lib/sim/migrationMetrics'
import { adaptMigrationProbe, printAdaptedReport } from './harness/adapters.ts'

const days = Number(process.argv[2] ?? 25)
const seeds = (process.argv[3] ?? '1,3,7')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n))

type SeedRow = {
  seed: number
  days: number
  startPop: number
  aliveEnd: number
  villagesEnd: number
  urgeMax: number
  leaves: number
  rejoins: number
  foundCamps: number
  leaveAttempts: number
  urgeSamples: number
  urgeCross070: number
  urgeCross094: number
  topBlocks: string[]
  topLeaveCauses: string[]
  distinctDestinations: number
  induced: false
}

function runSeed(seed: number): SeedRow {
  const state = createSimulation(seed)
  const startPop = state.villagers.filter((v) => v.alive).length
  const ticks = days * TICKS_PER_DAY
  for (let t = 1; t <= ticks; t++) stepSimulation(state)
  const snap = snapshotMigrationMetrics(state)
  const c = snap.counters
  let urgeMaxLive = c.urgeMax
  for (const v of state.villagers) {
    if (!v.alive) continue
    urgeMaxLive = Math.max(urgeMaxLive, politicsOf(v).migrationUrge)
  }
  const stats = computeStats(state)
  return {
    seed,
    days,
    startPop,
    aliveEnd: stats.villagers,
    villagesEnd: state.villages.filter((vg) => vg.memberIds.length > 0).length,
    urgeMax: +Math.max(c.urgeMax, urgeMaxLive).toFixed(3),
    leaves: c.leaves,
    rejoins: c.rejoins,
    foundCamps: c.foundCamps,
    leaveAttempts: c.leaveAttempts,
    urgeSamples: c.urgeSamples,
    urgeCross070: c.urgeCross070,
    urgeCross094: c.urgeCross094,
    topBlocks: snap.topBlocks,
    topLeaveCauses: snap.topLeaveCauses,
    distinctDestinations: c.distinctDestinations,
    induced: false,
  }
}

console.log(`WP11 natural migration soak — seeds=${seeds.join(',')} days=${days} (no TEST SETUP induction)\n`)
const rows = seeds.map(runSeed)
for (const r of rows) {
  console.log(JSON.stringify(r))
}

const totals = rows.reduce(
  (a, r) => {
    a.leaves += r.leaves
    a.rejoins += r.rejoins
    a.foundCamps += r.foundCamps
    a.leaveAttempts += r.leaveAttempts
    a.urgeMax = Math.max(a.urgeMax, r.urgeMax)
    return a
  },
  { leaves: 0, rejoins: 0, foundCamps: 0, leaveAttempts: 0, urgeMax: 0 },
)

console.log('\n=== TOTALS ===')
console.log(JSON.stringify(totals))

const report = adaptMigrationProbe({
  seeds,
  days,
  rows,
  totals,
  induced: false,
})
printAdaptedReport(report)
