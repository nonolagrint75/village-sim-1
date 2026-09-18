/**
 * Phase 5 DP12 smoke — Sec.22 A→B per-priority evidence + mission floors.
 * Natural path only. No CREATE_*, no induce, no PASS claim.
 *
 *   npx tsx scripts/_probe_phase5_sec22_formats.ts [days=8] [seed=7]
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { snapshotCausalityMetrics } from '../src/lib/sim/causalityMetrics'
import { snapshotAttribution } from '../src/lib/sim/attributionMetrics'
import {
  SEC22_FLOOR_EVENTS_HIGH,
  SEC22_FLOOR_EVENTS_LOW,
  SEC22_FLOOR_EVENTS_MID,
  SEC22_FLOOR_NPCS,
  SEC22_FLOOR_SEEDS,
  snapshotSec22Evidence,
  sec22PriorityLabels,
  sec22UnderFloors,
} from '../src/lib/sim/sec22Evidence'
import { snapshotDecisionExact } from '../src/lib/sim/decisionLedger'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const days = Math.min(20, Math.max(1, Number(process.argv[2] ?? 8)))
const seed = Number(process.argv[3] ?? 7)

const CONFIG = {
  initialVillagers: 100,
  maxPopulation: 250,
  preset: 'standard' as const,
  worldSize: 1000 as const,
  seed,
}

console.log('=== PHASE 5 DP12 SEC22 A→B EVIDENCE SMOKE ===')
console.log(
  'days=' +
    days +
    ' seed=' +
    seed +
    ' floors=' +
    SEC22_FLOOR_EVENTS_HIGH +
    '/' +
    SEC22_FLOOR_EVENTS_MID +
    '/' +
    SEC22_FLOOR_EVENTS_LOW +
    '/' +
    SEC22_FLOOR_NPCS +
    'npc/' +
    SEC22_FLOOR_SEEDS +
    'seeds (natural; never PASS)',
)

const t0 = Date.now()
let state = createSimulation(seed, CONFIG)
const ticks = days * TICKS_PER_DAY
for (let i = 0; i < ticks; i++) {
  state = stepSimulation(state)
}

const causality = snapshotCausalityMetrics(state)
const attribution = snapshotAttribution(state)
const exact = snapshotDecisionExact(state)
const sec22 = snapshotSec22Evidence(state, { seedCount: 1, causality, attribution })
const elapsedMs = Date.now() - t0

const priorityLabels = sec22PriorityLabels(sec22)
const underFloors = sec22UnderFloors(sec22)
const sampleRing = sec22.priorities.map((p) => ({
  id: p.id,
  label: p.label,
  floors: p.floors.label,
  localOk: p.floors.localOk,
  chainBlock: p.chainBlock,
  samples: p.sampleLines.slice(0, 3),
}))

const dump = {
  phase: 5,
  dp: 'DP12',
  induced: false,
  seed,
  days,
  ticks,
  elapsedMs,
  decisionExactTotal: exact.decisionExactTotal,
  missionFloors: {
    eventsHigh: SEC22_FLOOR_EVENTS_HIGH,
    eventsMid: SEC22_FLOOR_EVENTS_MID,
    eventsLow: SEC22_FLOOR_EVENTS_LOW,
    npcs: SEC22_FLOOR_NPCS,
    seeds: SEC22_FLOOR_SEEDS,
  },
  chainsLegacy: causality.chains,
  sec22Status: sec22.sec22Status,
  priorityLabels,
  chainBlocks: sec22.chainBlocks,
  sampleRing,
  underFloors,
  allLocalFloorsMet: sec22.allLocalFloorsMet,
  missionFloorsMet: sec22.missionFloorsMet,
  family: {
    uses: causality.counters.familyDecisionUses ?? 0,
    npcs: causality.counters.familyDecisionNpcCount ?? 0,
  },
  helpNpcCount: causality.counters.helpNpcCount ?? 0,
  migrateNpcCount: causality.counters.migrateNpcCount ?? 0,
  acceptance: 'PENDING',
  note: 'DONE CODE wired smoke — never PASS; acceptance PENDING (STEP6 multi-seed soak next)',
}

const outPath = path.join(ROOT, '_phase5_sec22_formats_smoke_s' + seed + '.json')
fs.writeFileSync(outPath, JSON.stringify(dump, null, 2), 'utf8')

console.log(
  JSON.stringify(
    {
      decisionExactTotal: dump.decisionExactTotal,
      sec22Status: dump.sec22Status,
      priorityLabels: dump.priorityLabels,
      underFloors: dump.underFloors,
      allLocalFloorsMet: dump.allLocalFloorsMet,
      missionFloorsMet: dump.missionFloorsMet,
      family: dump.family,
      helpNpcCount: dump.helpNpcCount,
      migrateNpcCount: dump.migrateNpcCount,
      chainBlocks: dump.chainBlocks,
      acceptance: dump.acceptance,
    },
    null,
    2,
  ),
)
console.log('\nSMOKE (instrumentation) -> ' + outPath)