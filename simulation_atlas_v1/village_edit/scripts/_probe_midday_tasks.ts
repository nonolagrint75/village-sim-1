/**
 * Midday task / larder probe around the pantry cliff.
 *   npx tsx scripts/_probe_midday_tasks.ts [seed=1]
 */
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY, hourOfDay } from '../src/lib/sim/calendar'
import { edibleValue, countOf, bestEdibleIn } from '../src/lib/sim/inventory'
import { WHEAT } from '../src/lib/sim/types'
import { getTerrain } from '../src/lib/sim/world'
import { WHEAT_RIPE } from '../src/lib/sim/behaviors'

const seed = Number(process.argv[2] ?? 1)
const state = createSimulation(seed)

function snap(label: string) {
  const tasks: Record<string, number> = {}
  let alive = 0
  let bag = 0
  let chest = 0
  let empty = 0
  let hungry = 0
  let crisis = 0
  let withChestFood = 0
  let ownersRipe = 0
  for (const v of state.villagers) {
    if (!v.alive) continue
    alive++
    const e = edibleValue(v.inventory)
    bag += e
    if (v.chestInventory) {
      const c = edibleValue(v.chestInventory)
      chest += c
      if (c > 0) withChestFood++
    }
    if (e < 0.5) empty++
    if (v.hunger < 2.5) hungry++
    if (!bestEdibleIn(v.inventory) && (v.hunger < 2.5 || v.starveTimer > 0)) crisis++
    const k = v.task?.kind ?? 'null'
    tasks[k] = (tasks[k] ?? 0) + 1
    if (v.fieldX >= 0) {
      for (let y = v.fieldY - 2; y <= v.fieldY + 2; y++) {
        for (let x = v.fieldX - 2; x <= v.fieldX + 2; x++) {
          if (getTerrain(state.grid, x, y) === WHEAT && state.grid.amount[y * state.grid.width + x] >= WHEAT_RIPE) {
            ownersRipe++
          }
        }
      }
    }
  }
  console.log(
    JSON.stringify({
      label,
      tick: state.tick,
      hour: hourOfDay(state.tick),
      alive,
      bag: +bag.toFixed(1),
      chest: +chest.toFixed(1),
      empty,
      hungry,
      crisis,
      withChestFood,
      ownersRipe,
      tasks,
      deaths: state.deaths,
    }),
  )
}

for (let d = 1; d <= 25; d++) {
  // Advance to midday of day d
  const target = (d - 1) * TICKS_PER_DAY + Math.floor(TICKS_PER_DAY * 0.5)
  while (state.tick < target) stepSimulation(state)
  snap(`d${d}-mid`)
  // Finish the day
  while (state.tick < d * TICKS_PER_DAY) stepSimulation(state)
}
