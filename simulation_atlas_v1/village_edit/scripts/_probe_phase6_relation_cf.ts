import { writeFileSync } from 'fs'
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { snapshotAttribution } from '../src/lib/sim/attributionMetrics'
import { snapshotCausalityMetrics } from '../src/lib/sim/causalityMetrics'

const days = Math.max(1, Number(process.argv[2] ?? 18))
const seed = Number(process.argv[3] ?? 1)
const state = createSimulation(seed, { initialVillagers: 100 })
for (let t = 0; t < days * TICKS_PER_DAY; t++) stepSimulation(state)
const attr = snapshotAttribution(state)
const caus = snapshotCausalityMetrics(state)
const out = {
  days, seed,
  familyCausalFlips: attr.familyCausalFlips,
  relationCausalFlips: attr.relationCausalFlips,
  relationUses: attr.relationUses,
  relationMaterialNoFlip: attr.relationMaterialNoFlip,
  teachProgressPct: caus.teachProgressPct,
  teachTrueConversion: caus.teachTrueConversion,
  teachEvents: caus.counters.teachEvents,
  teachSkillChanges: caus.counters.teachSkillChanges,
  teachTrueLaterUses: caus.counters.teachTrueLaterUses,
  migrateNpcCount: caus.counters.migrateNpcCount,
  migrateLeaves: caus.counters.migrateLeaves,
  foundCamps: caus.counters.migrateFoundCamps,
  relSamples: attr.relationCausalSamples.filter(s => s.flipped).slice(0, 4),
}
writeFileSync('_p6_rel_cf_check.json', JSON.stringify(out, null, 2))
console.log(JSON.stringify(out, null, 2))