/**
 * Phase 5 DP1 smoke — memory counterfactual flips on natural short run.
 * Natural path only. No CREATE_*, no induce, no steal->avoid scripting.
 *
 *   npx tsx scripts/_probe_phase5_memory_cf.ts [days=6] [seed=1]
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import {
  MEMORY_FLOOR_CAUSAL_FLIPS,
  MEMORY_FLOOR_MEMORABLE,
  MEMORY_FLOOR_RETRIEVALS,
  MEMORY_FLOOR_USES,
  snapshotAttribution,
} from '../src/lib/sim/attributionMetrics'
import { snapshotDecisionExact } from '../src/lib/sim/decisionLedger'

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

console.log('=== PHASE 5 DP1 MEMORY CAUSAL SMOKE ===')
console.log(`days=${days} seed=${seed} (natural; measure-first ablation; no induce)`)

const t0 = Date.now()
let state = createSimulation(seed, CONFIG)
const ticks = days * TICKS_PER_DAY
for (let i = 0; i < ticks; i++) {
  state = stepSimulation(state)
}

const attr = snapshotAttribution(state)
const exact = snapshotDecisionExact(state)
const elapsedMs = Date.now() - t0

const flipSamples = attr.memoryCausalSamples.filter((s) => s.flipped).slice(0, 8)
const floorsLabel = {
  memorable: `${attr.floors.memorable.value}/${MEMORY_FLOOR_MEMORABLE} ${attr.floors.memorable.ok ? 'OK' : 'UNDER'}`,
  retrievals: `${attr.floors.retrievals.value}/${MEMORY_FLOOR_RETRIEVALS} ${attr.floors.retrievals.ok ? 'OK' : 'UNDER'}`,
  uses: `${attr.floors.uses.value}/${MEMORY_FLOOR_USES} ${attr.floors.uses.ok ? 'OK' : 'UNDER'}`,
  causalFlips: `${attr.floors.causalFlips.value}/${MEMORY_FLOOR_CAUSAL_FLIPS} ${attr.floors.causalFlips.ok ? 'OK' : 'UNDER'}`,
}

const whyZero =
  attr.memoryCausalFlips > 0
    ? null
    : attr.memoryUses > 0
      ? 'memoryUses>0 but argmax stable without place-memory spots (materialNoFlip only)'
      : attr.memoryRetrievals > 0
        ? 'retrievals seen but no material score delta / flip'
        : attr.memoryMemorableEvents > 0
          ? 'memories encoded but soft path never retrieved spots near options'
          : 'no memorable events yet in short window'

const dump = {
  phase: 5,
  dp: 'DP1',
  induced: false,
  seed,
  days,
  ticks,
  elapsedMs,
  decisionExactTotal: exact.decisionExactTotal,
  memoryCausalFlips: attr.memoryCausalFlips,
  memoryMaterialNoFlip: attr.memoryMaterialNoFlip,
  memoryMemorableEvents: attr.memoryMemorableEvents,
  memoryRetrievals: attr.memoryRetrievals,
  memoryUses: attr.memoryUses,
  memoryAttributedDebug: attr.memoryAttributedDecisions,
  floors: floorsLabel,
  status: attr.status,
  acceptance: 'PENDING',
  flipSamples,
  whyZeroIfAny: whyZero,
  note: 'CODE wired smoke — acceptance PENDING. No PASS claim.',
}

const outPath = path.join(ROOT, `_phase5_memory_cf_smoke_s${seed}.json`)
fs.writeFileSync(outPath, JSON.stringify(dump, null, 2), 'utf8')

console.log(
  JSON.stringify(
    {
      decisionExactTotal: dump.decisionExactTotal,
      memoryCausalFlips: dump.memoryCausalFlips,
      memoryMaterialNoFlip: dump.memoryMaterialNoFlip,
      memoryMemorableEvents: dump.memoryMemorableEvents,
      memoryRetrievals: dump.memoryRetrievals,
      memoryUses: dump.memoryUses,
      memoryAttributedDebug: dump.memoryAttributedDebug,
      floors: dump.floors,
      status: dump.status,
      flipSamples: dump.flipSamples,
      whyZeroIfAny: dump.whyZeroIfAny,
    },
    null,
    2,
  ),
)
console.log(`\nSMOKE OK (instrumentation) -> ${outPath}`)
