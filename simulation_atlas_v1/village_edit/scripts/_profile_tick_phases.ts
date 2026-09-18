/**
 * Coarse tick-cost probe — identifies Max-path bottlenecks without gutting depth.
 * Usage: npx tsx scripts/_profile_tick_phases.ts [seed] [warm] [sample]
 */
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { noteSimTps, getSimPerfBudget, TARGET_SIM_TPS } from '../src/lib/sim/perfBudget'

const seed = Number(process.argv[2] ?? 7) || 7
const warm = Number(process.argv[3] ?? 400) || 400
const sample = Number(process.argv[4] ?? 200) || 200

const state = createSimulation(seed)
for (let i = 0; i < warm; i++) stepSimulation(state)

{
  const t0 = performance.now()
  let n = 0
  const deadline = t0 + 1500
  while (performance.now() < deadline) {
    stepSimulation(state)
    n++
  }
  noteSimTps(n / ((performance.now() - t0) / 1000))
}

const t0 = performance.now()
for (let i = 0; i < sample; i++) stepSimulation(state)
const elapsed = performance.now() - t0
const msPerTick = elapsed / sample
const tps = 1000 / msPerTick
noteSimTps(tps)

const alive = state.villagers.filter((v) => v.alive).length
const report = {
  seed,
  warm,
  sample,
  msPerTick: +msPerTick.toFixed(2),
  measuredTps: +tps.toFixed(1),
  targetTps: TARGET_SIM_TPS,
  tpsPass: tps >= 80,
  pop: alive,
  tick: state.tick,
  villages: state.villages.length,
  polities: state.polities?.length ?? 0,
  projects: state.projects?.length ?? 0,
  budget: getSimPerfBudget(),
}
console.log(JSON.stringify(report, null, 2))
if (!report.tpsPass) process.exitCode = 2