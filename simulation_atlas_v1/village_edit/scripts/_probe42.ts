import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { edibleValue } from '../src/lib/sim/inventory'

const state = createSimulation(42)
const start = state.villagers.filter((v) => v.alive).length
const snap = (d: number) => {
  const s = computeStats(state)
  let food = 0
  let fields = 0
  let houses = 0
  let hungry = 0
  let starving = 0
  let avgHunger = 0
  let n = 0
  for (const v of state.villagers) {
    if (!v.alive) continue
    n++
    food += edibleValue(v.inventory) + (v.chestInventory ? edibleValue(v.chestInventory) : 0)
    if (v.hasField) fields++
    if (v.hasHome) houses++
    if (v.hunger < 1.5) hungry++
    if (v.hunger <= 0) starving++
    avgHunger += v.hunger
  }
  console.log(
    JSON.stringify({
      day: d,
      alive: s.villagers,
      deaths: s.deaths,
      food: Math.round(food),
      fields,
      houses,
      hungry,
      starving,
      avgH: n ? Math.round((avgHunger / n) * 100) / 100 : 0,
      famine: s.famine,
    }),
  )
}
console.log(JSON.stringify({ day: 0, alive: start }))
for (let t = 1; t <= 30 * TICKS_PER_DAY; t++) {
  stepSimulation(state)
  if (t % TICKS_PER_DAY === 0) {
    const d = t / TICKS_PER_DAY
    if ([1, 3, 5, 7, 10, 15, 20, 25, 30].includes(d)) snap(d)
  }
}
