/**
 * Why buildBoat fails — npx tsx _boat_fail_probe.ts [seed] [days]
 */
import { createSimulation, stepSimulation } from './src/lib/sim/engine'
import { TICKS_PER_DAY } from './src/lib/sim/calendar'
import { countOf } from './src/lib/sim/inventory'
import { distance } from './src/lib/sim/world'

const seed = Number(process.argv[2] ?? 42)
const days = Number(process.argv[3] ?? 40)
const state = createSimulation(seed)

let onTask = 0
let nearDock = 0
let woodOk = 0
let woodFail = 0
let workMax = 0
const samples: string[] = []

for (let t = 1; t <= days * TICKS_PER_DAY; t++) {
  stepSimulation(state)
  for (const v of state.villagers) {
    if (!v.alive || v.task?.kind !== 'buildBoat') continue
    onTask++
    const d = distance(v.x, v.y, v.task.targetX, v.task.targetY)
    const wood = countOf(v.inventory, 'wood') + (v.chestInventory ? countOf(v.chestInventory, 'wood') : 0)
    if (d <= 1.5) nearDock++
    if (wood >= 2) woodOk++
    else woodFail++
    if (v.task.work > workMax) workMax = v.task.work
    if (samples.length < 12 && t % 40 === 0) {
      samples.push(
        `t=${t} ${v.name} d=${d.toFixed(1)} wood=${wood} work=${v.task.work.toFixed(2)} age=${v.task.ageTicks} at=${v.x},${v.y} dock=${v.task.targetX},${v.task.targetY}`,
      )
    }
  }
}

console.log({
  seed,
  days,
  boats: state.boats.length,
  onTask,
  nearDock,
  woodOk,
  woodFail,
  workMax,
  logBoat: state.log.filter((l) => /mis à l'eau|barque|chaland/.test(l)).length,
  samples,
})
