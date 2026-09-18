/**
 * Phase 5 DP8 smoke - help defend/labor chain (measure-first).
 * Natural path only. No CREATE_RAID / fake help.
 *
 *   npx tsx scripts/_probe_phase5_help_defend_labor.ts [days=12] [seed=7]
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { snapshotCausalityMetrics } from '../src/lib/sim/causalityMetrics'
import { snapshotDecisionExact } from '../src/lib/sim/decisionLedger'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const days = Math.min(25, Math.max(1, Number(process.argv[2] ?? 12)))
const seed = Number(process.argv[3] ?? 7)

const CONFIG = {
  initialVillagers: 100,
  maxPopulation: 250,
  preset: 'standard' as const,
  worldSize: 1000 as const,
  seed,
}

console.log('=== PHASE 5 DP8 HELP DEFEND/LABOR SMOKE ===')
console.log('days=' + days + ' seed=' + seed + ' (natural; measure-first; no CREATE_RAID)')

const t0 = Date.now()
let state = createSimulation(seed, CONFIG)
const ticks = days * TICKS_PER_DAY
for (let i = 0; i < ticks; i++) {
  state = stepSimulation(state)
}

const caus = snapshotCausalityMetrics(state)
const exact = snapshotDecisionExact(state)
const elapsedMs = Date.now() - t0
const c = caus.counters
const help = c.helpEventsByKind
const outcomes = c.helpOutcomesByKind

const chain = {
  situation_perception: c.defendHelpOpportunities,
  help_decision_action: c.defendHelpTaken,
  helpEventsDefend: help.defend ?? 0,
  helpEventsLabor: help.labor ?? 0,
  helpEventsBuild: help.build ?? 0,
  helpEventsHaul: help.haul ?? 0,
  helpEventsFood: help.food ?? 0,
  helpEventsTeach: help.teach ?? 0,
  helpTotal: c.helpEvents,
  helpOutcomes: c.helpOutcomes,
  helpOutcomesByKind: { ...outcomes },
  farmHarvest: c.foodHarvestProduces,
  farmGrind: c.foodGrindConsumes,
  farmBake: c.foodBakeConsumes,
}

const dump = {
  phase: 5,
  dp: 'DP8',
  induced: false,
  seed,
  days,
  ticks,
  elapsedMs,
  decisionExactTotal: exact.decisionExactTotal,
  chain,
  helpChain: caus.chains.help,
  designNote:
    'Labor=clear/sow assist for others; build=buildProject wall phase for others. Defend=threat+ward+willingness->protect engage (fight/flee still dominate without ward). Opportunities vs taken measured. No CREATE_RAID.',
  acceptance: 'PENDING',
  note: 'DONE CODE wired smoke — never PASS from this smoke; acceptance PENDING',
}

const outPath = path.join(ROOT, '_phase5_help_defend_labor_smoke_s' + seed + '.json')
fs.writeFileSync(outPath, JSON.stringify(dump, null, 2), 'utf8')

console.log(
  JSON.stringify(
    {
      decisionExactTotal: dump.decisionExactTotal,
      chain,
      helpChain: dump.helpChain,
      acceptance: dump.acceptance,
    },
    null,
    2,
  ),
)
console.log('\nSMOKE (instrumentation) -> ' + outPath)