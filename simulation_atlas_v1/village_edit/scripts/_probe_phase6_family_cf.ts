/**
 * Phase6 M6.1 smoke: family ablation CF under natural soft policy.
 *   npx tsx scripts/_probe_phase6_family_cf.ts [days=25] [seed=1]
 */
import { writeFileSync } from 'fs'
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { snapshotAttribution } from '../src/lib/sim/attributionMetrics'
import { snapshotCausalityMetrics } from '../src/lib/sim/causalityMetrics'
import { snapshotSec22Evidence } from '../src/lib/sim/sec22Evidence'

const days = Math.max(1, Number(process.argv[2] ?? 25))
const seed = Number(process.argv[3] ?? 1)
const state = createSimulation(seed, { initialVillagers: 100 })
for (let t = 0; t < days * TICKS_PER_DAY; t++) stepSimulation(state)
const attr = snapshotAttribution(state)
const caus = snapshotCausalityMetrics(state)
const sec = snapshotSec22Evidence(state, { seedCount: 1, attribution: attr })
const fam = sec.priorities.find((p) => p.id === 'family_decision')
let kinPairs = 0
for (const v of state.villagers) {
  for (const r of v.relations.values()) if ((r.kinship ?? 0) >= 0.4) kinPairs++
}
const out = {
  days,
  seed,
  familyDecisionUses: caus.counters.familyDecisionUses,
  familyUses: attr.familyUses,
  familyCausalFlips: attr.familyCausalFlips,
  familyMaterialNoFlip: attr.familyMaterialNoFlip,
  familyAttributedNpcs: attr.familyAttributedNpcs,
  kinPairs,
  famLabel: fam?.label,
  famFloors: fam?.floors.label,
  stages: fam?.stages,
  flipSamples: attr.familyCausalSamples.filter((s) => s.flipped).slice(0, 8),
}
writeFileSync('_p6_family_cf_check.json', JSON.stringify(out, null, 2))
console.log(JSON.stringify(out, null, 2))