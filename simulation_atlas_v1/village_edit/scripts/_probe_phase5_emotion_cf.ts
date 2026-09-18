/**
 * Phase 5 DP2 smoke — emotion counterfactual flips on natural short run.
 * Natural path only. No THREATEN, no induct, no steal-avoid scripting.
 *
 *   npx tsx scripts/_probe_phase5_emotion_cf.ts [days=6] [seed=1]
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import {
  EMOTION_FLOOR_CAUSAL_FLIPS,
  EMOTION_FLOOR_CHANGES,
  EMOTION_FLOOR_USES,
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

console.log('=== PHASE5 DP2 EMOTION CAUSAL SMOKE ===')
console.log(`days=${days} seed=${seed} (natural; measure-first ablation; no induct)`)

const t0 = Date.now()
let state = createSimulation(seed, CONFIG)
const ticks = days * TICKS_PER_DAY
for (let i = 0; i < ticks; i++) {
  state = stepSimulation(state)
}

const attr = snapshotAttribution(state)
const exact = snapshotDecisionExact(state)
const elapsedMs = Date.now() - t0

const flipSamples = attr.emotionCausalSamples.filter((s) => s.flipped).slice(0, 8)
const floorsLabel = {
  changes: `${attr.floors.emotionChanges.value}/${EMOTION_FLOOR_CHANGES} ${attr.floors.emotionChanges.ok ? 'OK' : 'UNDER'}`,
  uses: `${attr.floors.emotionUses.value}/${EMOTION_FLOOR_USES} ${attr.floors.emotionUses.ok ? 'OK' : 'UNDER'}`,
  causalFlips: `${attr.floors.emotionCausalFlips.value}/${EMOTION_FLOOR_CAUSAL_FLIPS} ${attr.floors.emotionCausalFlips.ok ? 'OK' : 'UNDER'}`,
}

const whyZeroIfAny =
  attr.emotionCausalFlips > 0
    ? null
    : attr.emotionUses > 0
      ? 'emotionUses>0 but argmax stable without emotionTaskBias (materialNoFlip only)'
      : attr.emotionChanges > 0
        ? 'emotion events encoded but soft path never saw material emotion factor delta'
        : 'no emotionChanges yet in short window'

const dump = {
  phase: 5,
  dp: 'DP2',
  induced: false,
  seed,
  days,
  ticks,
  elapsedMs,
  decisionExactTotal: exact.decisionExactTotal,
  emotionCausalFlips: attr.emotionCausalFlips,
  emotionMaterialNoFlip: attr.emotionMaterialNoFlip,
  emotionChanges: attr.emotionChanges,
  emotionUses: attr.emotionUses,
  emotionAttributedDebug: attr.emotionAttributedDecisions,
  memoryCausalFlips: attr.memoryCausalFlips,
  memoryUses: attr.memoryUses,
  floors: floorsLabel,
  status: attr.status,
  acceptance: 'PENDING',
  flipSamples,
  whyZeroIfAny,
  note: 'CODE wired smoke — acceptance PENDING. No PASS claim.',
}

const outPath = path.join(ROOT, `_phase5_emotion_cf_smoke_s${seed}.json`)
fs.writeFileSync(outPath, JSON.stringify(dump, null, 2), 'utf8')

console.log(
  JSON.stringify(
    {
      decisionExactTotal: dump.decisionExactTotal,
      emotionCausalFlips: dump.emotionCausalFlips,
      emotionMaterialNoFlip: dump.emotionMaterialNoFlip,
      emotionChanges: dump.emotionChanges,
      emotionUses: dump.emotionUses,
      emotionAttributedDebug: dump.emotionAttributedDebug,
      memoryCausalFlips: dump.memoryCausalFlips,
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