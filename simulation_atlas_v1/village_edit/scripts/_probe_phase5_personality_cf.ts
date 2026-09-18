/**
 * Phase 5 DP3 smoke — personality counterfactual flips + natural pair divergence.
 * Natural path only. No trait rewrite / mutation to manufacture pairs.
 *
 *   npx tsx scripts/_probe_phase5_personality_cf.ts [days=6] [seed=1]
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import {
  PERSONALITY_FLOOR_CAUSAL_FLIPS,
  PERSONALITY_FLOOR_PAIR_READY,
  PERSONALITY_FLOOR_USES,
  PERSONALITY_TARGET_DIVERGENT_RATIO,
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

console.log('=== PHASE5 DP3 PERSONALITY CAUSAL SMOKE ===')
console.log(`days=${days} seed=${seed} (natural; measure-first ablation; no trait rewrite)`)

const t0 = Date.now()
let state = createSimulation(seed, CONFIG)
const ticks = days * TICKS_PER_DAY
for (let i = 0; i < ticks; i++) {
  state = stepSimulation(state)
}

const attr = snapshotAttribution(state)
const exact = snapshotDecisionExact(state)
const elapsedMs = Date.now() - t0

const flipSamples = attr.personalityCausalSamples.filter((s) => s.flipped).slice(0, 8)
const pairSamples = attr.personalityPairMatchSamples.filter((s) => s.divergent).slice(0, 8)
const floorsLabel = {
  uses: `${attr.floors.personalityUses.value}/${PERSONALITY_FLOOR_USES} ${attr.floors.personalityUses.ok ? 'OK' : 'UNDER'}`,
  causalFlips: `${attr.floors.personalityCausalFlips.value}/${PERSONALITY_FLOOR_CAUSAL_FLIPS} ${attr.floors.personalityCausalFlips.ok ? 'OK' : 'UNDER'}`,
  pairReady: `${attr.floors.personalityPairReady.value}/${PERSONALITY_FLOOR_PAIR_READY} ${attr.floors.personalityPairReady.ok ? 'OK' : 'UNDER'}`,
  divergentRatio: `${attr.floors.personalityDivergentRatio.value}/${PERSONALITY_TARGET_DIVERGENT_RATIO} ${attr.floors.personalityDivergentRatio.ok ? 'OK' : 'UNDER'} (div=${attr.personalityPairDivergent}/ready=${attr.personalityPairReady})`,
}

const whyZeroIfAny =
  attr.personalityCausalFlips > 0
    ? null
    : attr.personalityUses > 0
      ? 'personalityUses>0 but argmax stable without trait priors (materialNoFlip only)'
      : attr.personalityAttributedDecisions > 0
        ? 'pers: tags seen but dual-score never measured material personality factor'
        : 'no material personality factor on soft path yet'

const dump = {
  phase: 5,
  dp: 'DP3',
  induced: false,
  traitRewrite: false,
  seed,
  days,
  ticks,
  elapsedMs,
  decisionExactTotal: exact.decisionExactTotal,
  personalityCausalFlips: attr.personalityCausalFlips,
  personalityMaterialNoFlip: attr.personalityMaterialNoFlip,
  personalityUses: attr.personalityUses,
  personalityAttributedDebug: attr.personalityAttributedDecisions,
  personalityPairSamples: attr.personalityPairSamples,
  personalityPairReady: attr.personalityPairReady,
  personalityPairDivergent: attr.personalityPairDivergent,
  memoryCausalFlips: attr.memoryCausalFlips,
  emotionCausalFlips: attr.emotionCausalFlips,
  floors: floorsLabel,
  status: attr.status,
  acceptance: 'PENDING',
  flipSamples,
  pairSamples,
  whyZeroIfAny,
  note: 'CODE wired smoke — acceptance PENDING. No PASS claim. No artificial personality mutation.',
}

const outPath = path.join(ROOT, `_phase5_personality_cf_smoke_s${seed}.json`)
fs.writeFileSync(outPath, JSON.stringify(dump, null, 2), 'utf8')

console.log(
  JSON.stringify(
    {
      decisionExactTotal: dump.decisionExactTotal,
      personalityCausalFlips: dump.personalityCausalFlips,
      personalityMaterialNoFlip: dump.personalityMaterialNoFlip,
      personalityUses: dump.personalityUses,
      personalityAttributedDebug: dump.personalityAttributedDebug,
      personalityPairSamples: dump.personalityPairSamples,
      personalityPairReady: dump.personalityPairReady,
      personalityPairDivergent: dump.personalityPairDivergent,
      memoryCausalFlips: dump.memoryCausalFlips,
      emotionCausalFlips: dump.emotionCausalFlips,
      floors: dump.floors,
      status: dump.status,
      flipSamples: dump.flipSamples,
      pairSamples: dump.pairSamples,
      whyZeroIfAny: dump.whyZeroIfAny,
    },
    null,
    2,
  ),
)

console.log(`\nSMOKE OK (instrumentation) -> ${outPath}`)
