import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { edibleValue } from '../src/lib/sim/inventory'

const days = 90
for (const seed of [1, 7, 42]) {
  const state = createSimulation(seed)
  const series: string[] = []
  for (let t = 1; t <= days * TICKS_PER_DAY; t++) {
    stepSimulation(state)
    if (t % (TICKS_PER_DAY * 10) === 0) {
      const s = computeStats(state)
      let fields = 0
      let food = 0
      for (const v of state.villagers) {
        if (!v.alive) continue
        if (v.hasField) fields++
        food += edibleValue(v.inventory) + (v.chestInventory ? edibleValue(v.chestInventory) : 0)
      }
      series.push(`${s.villagers}(f${fields},fd${Math.round(food)})`)
    }
  }
  const s = computeStats(state)
  console.log(`seed ${seed} every10d: ${series.join(' → ')} | final ${s.villagers} deaths ${s.deaths} wipe=${s.villagers === 0}`)
}
