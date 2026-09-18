/**
 * Phase 5 DP4 smoke — teach → skillΔ → true later use chain on natural short run.
 * Natural path only. No CREATE_*, no teach spam, no become-skilled scripting.
 *
 *   npx tsx scripts/_probe_phase5_teach_cf.ts [days=6] [seed=1]
 */
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { createSimulation, stepSimulation } from "../src/lib/sim/engine"
import { TICKS_PER_DAY } from "../src/lib/sim/calendar"
import { snapshotCausalityMetrics } from "../src/lib/sim/causalityMetrics"
import { snapshotDecisionExact } from "../src/lib/sim/decisionLedger"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const days = Math.min(8, Math.max(1, Number(process.argv[2] ?? 6)))
const seed = Number(process.argv[3] ?? 1)

const CONFIG = {
  initialVillagers: 100,
  maxPopulation: 250,
  preset: "standard" as const,
  worldSize: 1000 as const,
  seed,
}

console.log("=== PHASE 5 DP4 TEACH TRUE-CHAIN SMOKE ===")
console.log(`days=${days} seed=${seed} (natural; measure-first; no induce)`)

const t0 = Date.now()
let state = createSimulation(seed, CONFIG)
const ticks = days * TICKS_PER_DAY
for (let i = 0; i < ticks; i++) {
  state = stepSimulation(state)
}

const snap = snapshotCausalityMetrics(state)
const exact = snapshotDecisionExact(state)
const elapsedMs = Date.now() - t0
const c = snap.counters
const samples = (c.teachTrueLaterSamples ?? []).slice(0, 8)

const dump = {
  phase: 5,
  dp: "DP4",
  induced: false,
  seed,
  days,
  ticks,
  elapsedMs,
  decisionExactTotal: exact.decisionExactTotal,
  teachEvents: c.teachEvents,
  teachSkillChanges: c.teachSkillChanges,
  teachLaterUsesProxyDebug: c.teachLaterUses,
  teachTrueLaterUses: c.teachTrueLaterUses ?? 0,
  teachNpcCount: c.teachNpcCount,
  teachChain: snap.chains.teach,
  sec22Status: snap.sec22Status,
  samples,
  acceptance: "PENDING",
  note: "CODE wired smoke — true chain instrumented; acceptance PENDING; never PASS from this smoke",
}

const outPath = path.join(ROOT, `_phase5_teach_cf_smoke_s${seed}.json`)
fs.writeFileSync(outPath, JSON.stringify(dump, null, 2), "utf8")

console.log(
  JSON.stringify(
    {
      decisionExactTotal: dump.decisionExactTotal,
      teachEvents: dump.teachEvents,
      teachSkillChanges: dump.teachSkillChanges,
      teachLaterUsesProxyDebug: dump.teachLaterUsesProxyDebug,
      teachTrueLaterUses: dump.teachTrueLaterUses,
      teachNpcCount: dump.teachNpcCount,
      teachChain: dump.teachChain,
      sampleCount: samples.length,
      samples: samples.slice(0, 3),
      acceptance: dump.acceptance,
    },
    null,
    2,
  ),
)
console.log(`\nSMOKE (instrumentation) -> ${outPath}`)
