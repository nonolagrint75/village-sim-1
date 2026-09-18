/**
 * Quick early-food survival probe (first 14 days).
 *   npx tsx scripts/_probe_early_food.ts
 */
import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { countOf, edibleValue } from '../src/lib/sim/inventory'

function snapshot(state: ReturnType<typeof createSimulation>, label: string) {
  const s = computeStats(state)
  let invFood = 0
  let chestFood = 0
  let wheat = 0
  let fields = 0
  let claims = 0
  let homes = 0
  let hungry = 0
  let emptyLarder = 0
  let starveLogs = 0
  for (const v of state.villagers) {
    if (!v.alive) continue
    const e = edibleValue(v.inventory)
    invFood += e
    if (v.chestInventory) chestFood += edibleValue(v.chestInventory)
    wheat += countOf(v.inventory, 'wheat') + (v.chestInventory ? countOf(v.chestInventory, 'wheat') : 0)
    if (v.hasField) fields++
    if (v.fieldX >= 0) claims++
    if (v.hasHome) homes++
    if (v.hunger < 2) hungry++
    if (e < 0.5) emptyLarder++
  }
  for (const line of state.log) {
    if (/mort de faim/i.test(line)) starveLogs++
  }
  console.log(
    JSON.stringify({
      label,
      alive: s.villagers,
      deaths: s.deaths,
      famine: s.famine,
      hungry,
      emptyLarder,
      invFood: Math.round(invFood),
      chestFood: Math.round(chestFood),
      wheat,
      fields,
      claims,
      homes,
      starveLogs,
    }),
  )
}

const seeds = [1, 42, 7, 3, 99]
for (const seed of seeds) {
  const state = createSimulation(seed)
  snapshot(state, `seed${seed}:t0`)
  for (const day of [3, 7, 14]) {
    const target = day * TICKS_PER_DAY
    while (state.tick < target) stepSimulation(state)
    snapshot(state, `seed${seed}:d${day}`)
  }
}
