/**
 * Day-by-day food economy probe.
 *   npx tsx scripts/_probe_food_economy.ts [seed=1] [days=30]
 */
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { edibleValue, countOf } from '../src/lib/sim/inventory'
import { WHEAT, BUSH } from '../src/lib/sim/types'
import { getTerrain } from '../src/lib/sim/world'
import { WHEAT_RIPE } from '../src/lib/sim/behaviors'

const seed = Number(process.argv[2] ?? 1)
const days = Number(process.argv[3] ?? 30)
const state = createSimulation(seed)

for (let d = 1; d <= days; d++) {
  for (let t = 0; t < TICKS_PER_DAY; t++) stepSimulation(state)
  let alive = 0
  let bag = 0
  let chest = 0
  let wheat = 0
  let ripe = 0
  let wheatTiles = 0
  let bushNear = 0
  let hunger = 0
  let empty = 0
  let gather = 0
  let harvest = 0
  let idle = 0
  let rest = 0
  let sow = 0
  for (const v of state.villagers) {
    if (!v.alive) continue
    alive++
    bag += edibleValue(v.inventory)
    if (v.chestInventory) chest += edibleValue(v.chestInventory)
    wheat += countOf(v.inventory, 'wheat')
    hunger += v.hunger
    if (edibleValue(v.inventory) < 0.5) empty++
    const k = v.task?.kind
    if (k === 'gatherFood') gather++
    else if (k === 'harvestWheat') harvest++
    else if (k === 'idle') idle++
    else if (k === 'rest') rest++
    else if (k === 'sowField') sow++
    if (v.fieldX >= 0) {
      for (let y = v.fieldY - 2; y <= v.fieldY + 2; y++) {
        for (let x = v.fieldX - 2; x <= v.fieldX + 2; x++) {
          if (getTerrain(state.grid, x, y) !== WHEAT) continue
          wheatTiles++
          if (state.grid.amount[y * state.grid.width + x] >= WHEAT_RIPE) ripe++
        }
      }
    }
  }
  const home = state.villagers.find((v) => v.alive && v.hasHome)
  if (home) {
    for (let y = home.homeY - 20; y <= home.homeY + 20; y++) {
      for (let x = home.homeX - 20; x <= home.homeX + 20; x++) {
        if (getTerrain(state.grid, x, y) === BUSH) bushNear++
      }
    }
  }
  console.log(
    JSON.stringify({
      d,
      alive,
      bag: +bag.toFixed(1),
      chest: +chest.toFixed(1),
      wheat,
      wheatTiles,
      ripe,
      bushNear,
      avgH: +(hunger / Math.max(1, alive)).toFixed(2),
      empty,
      gather,
      harvest,
      sow,
      idle,
      rest,
      deaths: state.deaths,
    }),
  )
}
