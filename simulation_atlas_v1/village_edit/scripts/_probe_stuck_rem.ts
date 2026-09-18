import { createSimulation, stepSimulation } from '../src/lib/sim/engine.ts'
import { buildQueueRemaining } from '../src/lib/sim/build/homeContracts.ts'
import { nextBuildBlock } from '../src/lib/sim/build/tasks.ts'
import { materialCost } from '../src/lib/sim/build/chunks.ts'
import { countOf } from '../src/lib/sim/inventory.ts'
import { getTerrain } from '../src/lib/sim/world.ts'

const seed = Number(process.argv[2] ?? 7)
const until = Number(process.argv[3] ?? 5500)
const state = createSimulation(seed, {
  initialVillagers: 36,
  maxPopulation: 80,
  worldSize: 600 as const,
  preset: 'standard' as const,
  wolfCount: 3,
})
while (state.tick < until) stepSimulation(state)
const sites = state.villagers.filter((v) => v.alive && v.buildQueue && v.buildQueue.length > 0)
const rems = sites.map((v) => buildQueueRemaining(v.buildQueue!))
const rem0alive = state.villagers.filter((v) => v.alive && v.buildQueue && buildQueueRemaining(v.buildQueue) === 0).length
console.log(JSON.stringify({
  seed, t: state.tick,
  alive: state.villagers.filter(v=>v.alive).length,
  sites: sites.length,
  rem0: rems.filter(r=>r===0).length,
  rem0alive,
  remMin: rems.length ? Math.min(...rems) : null,
  remMed: rems.length ? [...rems].sort((a,b)=>a-b)[Math.floor(rems.length/2)] : null,
  blocks: state.emergence?.blocksBuilt ?? 0,
  homeC: state.emergence?.homesCompleted ?? 0,
  haul: state.emergence?.materialsMoved ?? 0,
}))
for (const v of sites.slice(0, 4)) {
  const rem = buildQueueRemaining(v.buildQueue!)
  const next = nextBuildBlock(v.buildQueue!, state.grid)
  const cost = next ? materialCost(next) : null
  const w = countOf(v.inventory, 'wood') + (v.chestInventory ? countOf(v.chestInventory, 'wood') : 0)
  const kinds: Record<string, number> = {}
  for (const b of v.buildQueue!) {
    if (b.done) continue
    const k = `${b.kind}:${b.material}`
    kinds[k] = (kinds[k] ?? 0) + 1
  }
  console.log(JSON.stringify({ id: v.id, rem, wood: w, next: next && { kind: next.kind, x: next.x, y: next.y }, cost, kinds, task: v.task?.kind, hunger: +v.hunger.toFixed(2) }))
}