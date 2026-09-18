/**
 * Trade / ports / development probe.
 *   npx tsx scripts/_probe_trade.ts [seed=1] [days=60]
 */
import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { countOf } from '../src/lib/sim/inventory'

const seed = Number(process.argv[2] ?? 1)
const days = Number(process.argv[3] ?? 60)
const state = createSimulation(seed)

let peakTradeTasks = 0
let tradeTaskSamples = 0
let traders = 0

for (let d = 1; d <= days; d++) {
  const end = d * TICKS_PER_DAY
  while (state.tick < end) {
    stepSimulation(state)
    let n = 0
    traders = 0
    for (const v of state.villagers) {
      if (!v.alive) continue
      if (v.profession === 'trader') traders++
      if (v.task?.kind === 'tradeRun') {
        n++
        tradeTaskSamples++
      }
    }
    if (n > peakTradeTasks) peakTradeTasks = n
  }
  if (d % 10 === 0 || d === days) {
    const s = computeStats(state)
    const vg = state.villages.map((v) => ({
      id: v.id,
      pop: v.memberIds.length,
      runs: v.tradeRuns,
      port: v.hasPort,
      market: !!v.hasMarket,
      prosper: +(v.prosperity ?? 0).toFixed(1),
      dev: +(v.development ?? 0).toFixed(1),
      ineq: +(v.inequalityStress ?? 0).toFixed(2),
      hub: v.isRegionalHub,
      links: [...state.tradeRoutes].filter((k) => k.startsWith(`${v.id}-`) || k.endsWith(`-${v.id}`)).length,
    }))
    let coins = 0
    for (const v of state.villagers) {
      if (!v.alive) continue
      coins += countOf(v.inventory, 'coin')
      if (v.chestInventory) coins += countOf(v.chestInventory, 'coin')
    }
    const markets = state.villages.filter((v) => v.hasMarket).length
    console.log(
      JSON.stringify({
        day: d,
        pop: s.villagers,
        villages: s.villages,
        tradeRunsTotal: s.tradeRunsTotal,
        ports: s.ports,
        markets,
        boats: s.boats,
        roads: s.roadTiles,
        traders,
        peakTradeTasks,
        tradeTaskSamples,
        routes: state.tradeRoutes.size,
        coins,
        vg,
      }),
    )
  }
}
