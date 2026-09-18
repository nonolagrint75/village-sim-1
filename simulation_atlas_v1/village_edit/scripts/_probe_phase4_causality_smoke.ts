/**
 * CP2 smoke — causality counters increment on natural short run.
 * Natural path only. No CREATE_*, no induce.
 *
 *   npx tsx scripts/_probe_phase4_causality_smoke.ts [days=5] [seed=1]
 */
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"
import { createSimulation, stepSimulation } from "../src/lib/sim/engine"
import { TICKS_PER_DAY } from "../src/lib/sim/calendar"
import { snapshotCausalityMetrics } from "../src/lib/sim/causalityMetrics"
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

console.log("=== PHASE 4 CP2 CAUSALITY SMOKE ===")
console.log(`days=${days} seed=${seed} (natural; no induce)`)

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
const anyFood = c.foodHarvestProduces + c.foodGrindConsumes + c.foodBakeConsumes + c.foodEatConsequences + c.foodStockConsequences > 0
const anyTeach = c.teachEvents + c.teachSkillChanges + c.teachLaterUses + (c.teachTrueLaterUses ?? 0) > 0
const anyOther = c.creedChanges + c.migrateUrgeCrosses + c.priceDeltaEvents + c.helpEvents > 0
const passSmoke = anyFood || anyTeach || anyOther

const dump = {
  phase: 4,
  cp: "CP2",
  induced: false,
  seed,
  days,
  ticks,
  elapsedMs,
  decisionExactTotal: exact.decisionExactTotal,
  causality: snap,
  passSmoke,
  note: "CODE wired smoke only — sec22 acceptance PENDING; never PASS from this smoke",
}

const outPath = path.join(ROOT, `_phase4_causality_smoke_s${seed}.json`)
fs.writeFileSync(outPath, JSON.stringify(dump, null, 2), "utf8")

console.log(JSON.stringify({
  passSmoke,
  decisionExactTotal: dump.decisionExactTotal,
  food: { harvest: c.foodHarvestProduces, grind: c.foodGrindConsumes, bake: c.foodBakeConsumes, eat: c.foodEatConsequences, stock: c.foodStockConsequences, npcs: c.foodNpcCount },
    teach: { events: c.teachEvents, skill: c.teachSkillChanges, laterProxy: c.teachLaterUses, trueLater: c.teachTrueLaterUses ?? 0, npcs: c.teachNpcCount },
  creed: { changes: c.creedChanges, followups: c.creedFollowups },
  migrate: { urge: c.migrateUrgeCrosses, attempts: c.migrateLeaveAttempts, leaves: c.migrateLeaves, found: c.migrateFoundCamps },
  price: { delta: c.priceDeltaEvents, task: c.priceTaskShifts, prof: c.priceProfessionShifts },
  help: { events: c.helpEvents, outcomes: c.helpOutcomes, byKind: c.helpEventsByKind },
  chains: snap.chains,
  sec22Status: snap.sec22Status,
}, null, 2))
console.log(`\nSMOKE ${passSmoke ? "OK" : "FAIL"} -> ${outPath}`)
if (!passSmoke) process.exitCode = 1
