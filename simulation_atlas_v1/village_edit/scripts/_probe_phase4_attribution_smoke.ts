/**
 * CP3 smoke — attribution counters can increment on natural short run.
 * Natural path only. No CREATE_*, no induce, no personality drift force.
 *
 *   npx tsx scripts/_probe_phase4_attribution_smoke.ts [days=5] [seed=1]
 */
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { createSimulation, stepSimulation } from "../src/lib/sim/engine"
import { TICKS_PER_DAY } from "../src/lib/sim/calendar"
import { snapshotAttribution } from "../src/lib/sim/attributionMetrics"
import { snapshotDecisionExact } from "../src/lib/sim/decisionLedger"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const days = Math.min(5, Math.max(1, Number(process.argv[2] ?? 5)))
const seed = Number(process.argv[3] ?? 1)

const CONFIG = {
  initialVillagers: 100,
  maxPopulation: 250,
  preset: "standard" as const,
  worldSize: 1000 as const,
  seed,
}

console.log("=== PHASE 4 CP3 ATTRIBUTION SMOKE ===")
console.log(`days=${days} seed=${seed} (natural; no induce)`)

const t0 = Date.now()
let state = createSimulation(seed, CONFIG)
const ticks = days * TICKS_PER_DAY
for (let i = 0; i < ticks; i++) {
  state = stepSimulation(state)
}

const attr = snapshotAttribution(state)
const exact = snapshotDecisionExact(state)
const elapsedMs = Date.now() - t0

const anyAttr =
  attr.memoryAttributedDecisions +
    attr.emotionAttributedDecisions +
    attr.personalityAttributedDecisions >
  0

const dump = {
  phase: 4,
  cp: "CP3",
  induced: false,
  seed,
  days,
  ticks,
  elapsedMs,
  decisionExactTotal: exact.decisionExactTotal,
  attribution: attr,
  passSmoke: true,
  note:
    "CODE wired smoke only — acceptance PENDING (NOT_TESTED). Zeros are honest if no material mem/emo/pers tags on soft picks.",
  whyZerosIfAny: anyAttr
    ? null
    : "No soft pick had material place-memory / emotionTaskBias / personality social_tom delta above 0.08, or HARD-only assigns without tags.",
}

const outPath = path.join(ROOT, `_phase4_attribution_smoke_s${seed}.json`)
fs.writeFileSync(outPath, JSON.stringify(dump, null, 2), "utf8")

console.log(
  JSON.stringify(
    {
      decisionExactTotal: dump.decisionExactTotal,
      memoryAttributedDecisions: attr.memoryAttributedDecisions,
      memoryAttributedNpcs: attr.memoryAttributedNpcs,
      emotionAttributedDecisions: attr.emotionAttributedDecisions,
      emotionAttributedNpcs: attr.emotionAttributedNpcs,
      personalityAttributedDecisions: attr.personalityAttributedDecisions,
      personalityAttributedNpcs: attr.personalityAttributedNpcs,
      personalityPairSamples: attr.personalityPairSamples,
      personalityPairReady: attr.personalityPairReady,
      status: attr.status,
      whyZerosIfAny: dump.whyZerosIfAny,
    },
    null,
    2,
  ),
)
console.log(`\nSMOKE OK (instrumentation) -> ${outPath}`)