import { createSimulation, stepSimulation } from '../src/lib/sim/engine.ts'
import { buildQueueRemaining } from '../src/lib/sim/build/homeContracts.ts'
import { countOf } from '../src/lib/sim/inventory.ts'

const seed = Number(process.argv[2] ?? 42)
const state = createSimulation(seed, {
  initialVillagers: 36,
  maxPopulation: 80,
  worldSize: 600 as const,
  preset: 'standard' as const,
  wolfCount: 3,
})
const marks = process.argv[3] ? process.argv[3].split(',').map(Number) : [1000, 5000, 10000]
let hi = 0
while (state.tick < marks[marks.length - 1]!) {
  stepSimulation(state)
  if (hi < marks.length && state.tick >= marks[hi]!) {
    const m = marks[hi]!
    const sites = state.villagers.filter((v) => v.alive && v.buildQueue && v.buildQueue.length > 0)
    const rems = sites.map((v) => buildQueueRemaining(v.buildQueue!))
    let woodGaps = 0
    for (const v of sites) {
      const nextB = v.buildQueue!.find((b) => !b.done)
      if (!nextB) continue
      const w = countOf(v.inventory, 'wood') + (v.chestInventory ? countOf(v.chestInventory, 'wood') : 0)
      const s = countOf(v.inventory, 'stone') + (v.chestInventory ? countOf(v.chestInventory, 'stone') : 0)
      const needW = nextB.material === 'stone' ? 0 : nextB.kind === 'floor' && nextB.material !== 'plank' ? 0 : 1
      const needS = nextB.material === 'stone' ? 1 : 0
      if (w < needW || s < needS) woodGaps++
    }
    let edible = 0
    const byTask: Record<string, number> = {}
    let aliveN = 0
    let restN = 0
    for (const v of state.villagers) {
      if (!v.alive) continue
      aliveN++
      edible += countOf(v.inventory, 'bread') + countOf(v.inventory, 'berries') + countOf(v.inventory, 'meat') + countOf(v.inventory, 'fish') + countOf(v.inventory, 'food')
      const ty = v.task?.type ?? 'none'
      byTask[ty] = (byTask[ty] ?? 0) + 1
      if (ty === 'rest') restN++
    }
    console.log(JSON.stringify({
      seed, t: m, alive: aliveN, deaths: state.deaths ?? 0,
      blocks: state.emergenceMetrics?.blocksBuilt ?? 0,
      homeC: state.emergenceMetrics?.homesCompleted ?? 0,
      homeS: state.emergenceMetrics?.homesStarted ?? 0,
      woOk: state.emergenceMetrics?.workOrdersCompleted ?? 0,
      haul: state.emergenceMetrics?.haulDeliveries ?? 0,
      wages: state.emergenceMetrics?.wagesPaid ?? 0,
      sites: sites.length,
      rem0: rems.filter((r) => r === 0).length,
      remMin: rems.length ? Math.min(...rems) : null,
      remMed: rems.length ? [...rems].sort((a,b)=>a-b)[Math.floor(rems.length/2)] : null,
      qLenMed: sites.length ? [...sites.map(v=>v.buildQueue!.length)].sort((a,b)=>a-b)[Math.floor(sites.length/2)] : null,
      woodGaps, edible, restN,
      topTasks: Object.entries(byTask).sort((a,b)=>b[1]-a[1]).slice(0, 8),
    }))
    hi++
  }
}