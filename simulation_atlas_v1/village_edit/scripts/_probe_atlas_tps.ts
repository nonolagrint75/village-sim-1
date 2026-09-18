import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { packDraw } from '../src/lib/sim/snapshot'
import { TRAIL, PATH, ROAD } from '../src/lib/sim/types'
import { noteSimTps, getSimPerfBudget, TARGET_SIM_TPS } from '../src/lib/sim/perfBudget'
import { firmsSummary } from '../src/lib/sim/economy/business'

const seed = Number(process.argv[2] ?? 7) || 7
const wallSec = Number(process.argv[3] ?? 3) || 3
const adaptWarmSec = Number(process.argv[4] ?? 2) || 2

const state = createSimulation(seed)
// Warm + adapt LOD toward Max target before measuring.
{
  const w0 = performance.now()
  let wt = 0
  let last = w0
  while (performance.now() - w0 < adaptWarmSec * 1000) {
    stepSimulation(state)
    wt++
    const now = performance.now()
    if (now - last >= 500) {
      noteSimTps(wt / ((now - w0) / 1000))
      last = now
    }
  }
  noteSimTps(wt / ((performance.now() - w0) / 1000))
}
const t0 = performance.now()
let ticks = 0
const deadline = t0 + wallSec * 1000
let lastNote = t0
while (performance.now() < deadline) {
  stepSimulation(state)
  ticks++
  const now = performance.now()
  if (now - lastNote >= 1000) {
    const sliceTps = ticks / ((now - t0) / 1000)
    noteSimTps(sliceTps)
    lastNote = now
  }
}
const elapsed = (performance.now() - t0) / 1000
const tps = ticks / elapsed
noteSimTps(tps)

const soakTicks = Math.min(4000, Math.max(800, Math.round(tps * 8)))
const before = { houses: 0, roads: 0, markets: 0, mines: 0, professions: 0, logLen: state.log.length }
for (const v of state.villagers) {
  if (!v.alive) continue
  if (v.hasHome && v.homeOwnerId === v.id) before.houses++
  if (v.profession !== 'none') before.professions++
}
for (let i = 0; i < state.grid.terrain.length; i++) {
  const t = state.grid.terrain[i]
  if (t === TRAIL || t === PATH || t === ROAD) before.roads++
}
for (const vg of state.villages) {
  if (vg.hasMarket) before.markets++
  if (vg.hasMine) before.mines++
}

for (let i = 0; i < soakTicks; i++) stepSimulation(state)

const after = { houses: 0, roads: 0, markets: 0, mines: 0, professions: 0, logLen: state.log.length, pop: 0, villages: state.villages.length }
for (const v of state.villagers) {
  if (!v.alive) continue
  after.pop++
  if (v.hasHome && v.homeOwnerId === v.id) after.houses++
  if (v.profession !== 'none') after.professions++
}
for (let i = 0; i < state.grid.terrain.length; i++) {
  const t = state.grid.terrain[i]
  if (t === TRAIL || t === PATH || t === ROAD) after.roads++
}
for (const vg of state.villages) {
  if (vg.hasMarket) after.markets++
  if (vg.hasMine) after.mines++
}

const draw = packDraw(state, Math.round(tps))
const stats = computeStats(state)
  const deposits = state.economyDeposits?.length ?? 0
  const firms = firmsSummary(state)

  const report = {
    seed,
    wallSec,
    ticks,
    elapsedSec: +elapsed.toFixed(3),
    measuredTps: +tps.toFixed(1),
    targetTps: TARGET_SIM_TPS,
    budget: getSimPerfBudget(),
    adaptWarmSec,
    tpsPass: tps >= 80,
    tpsNearTarget: tps >= 90,
    tpsAtTarget: tps >= 95,
    soakTicks,
    mapDelta: {
      houses: after.houses - before.houses,
      roads: after.roads - before.roads,
      markets: after.markets - before.markets,
      mines: after.mines - before.mines,
      professions: after.professions - before.professions,
      chronicleLines: after.logLen - before.logLen,
    },
    after,
    draw: {
      villagers: draw.villagers.length,
      villages: draw.villages.length,
      marketsDrawn: draw.villages.filter((v) => v.hasMarket).length,
      minesDrawn: draw.villages.filter((v) => v.hasMine).length,
      scaffolds: draw.scaffolds.length,
      ruins: draw.ruins.length,
      homes: draw.homes?.length ?? 0,
      keeps: draw.keeps?.length ?? 0,
      professionTagged: draw.villagers.filter((v) => v.profession !== 'none').length,
    },
    stats: {
      pop: stats.villagers,
      villages: stats.villages,
      markets: stats.markets,
      firms: stats.firms,
      kingdoms: stats.kingdoms,
      roadTiles: stats.roadTiles,
    },
    firms,
    economyDeposits: deposits,
    causalOk:
      after.roads > before.roads ||
      after.houses > before.houses ||
      after.logLen > before.logLen ||
      after.professions !== before.professions ||
      after.markets > before.markets,
  }

console.log(JSON.stringify(report, null, 2))
if (!report.tpsPass) {
  console.error('TPS under bar: ' + report.measuredTps + ' < 80 (target 100)')
  process.exitCode = 2
}
if (!report.causalOk) {
  console.error('No map/chronicle delta during soak')
  process.exitCode = 3
}