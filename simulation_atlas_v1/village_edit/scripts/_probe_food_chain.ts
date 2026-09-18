/**
 * Food-chain probe: fields, mill, flour, bread, deaths.
 * Usage: npx tsx scripts/_probe_food_chain.ts [seed=7] [days=60]
 */
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { edibleValue, countOf } from '../src/lib/sim/inventory'
import { WHEAT, MILL } from '../src/lib/sim/types'
import { FIELD_RADIUS } from '../src/lib/sim/fields'
import { getTerrain } from '../src/lib/sim/world'
import { WHEAT_RIPE } from '../src/lib/sim/behaviors'

const seed = Number(process.argv[2] ?? 7)
const days = Number(process.argv[3] ?? 60)
const state = createSimulation(seed)

const cum = { sow: 0, harvest: 0, buildMill: 0, grind: 0, bake: 0, clearLand: 0, gatherFood: 0 }
/** DP6 / INC-02: grindFlour is an open task — track starters by métier. */
const grindByProfession: Record<string, number> = {}
let millerAlivePeak = 0
const grindLabel = 'GRIND_OPEN_TASK' as const

for (let d = 1; d <= days; d++) {
  for (let t = 0; t < TICKS_PER_DAY; t++) {
    stepSimulation(state)
    let millersTick = 0
    for (const v of state.villagers) {
      if (!v.alive) continue
      if (v.profession === 'miller') millersTick++
      if (!v.task) continue
      const k = v.task.kind
      if (k === 'sowField') cum.sow++
      else if (k === 'harvestWheat') cum.harvest++
      else if (k === 'buildMill') cum.buildMill++
      else if (k === 'grindFlour') {
        cum.grind++
        const pk = v.profession || 'none'
        grindByProfession[pk] = (grindByProfession[pk] || 0) + 1
      } else if (k === 'bakeBread') cum.bake++
      else if (k === 'clearLand') cum.clearLand++
      else if (k === 'gatherFood') cum.gatherFood++
    }
    if (millersTick > millerAlivePeak) millerAlivePeak = millersTick
  }
  if (d % 5 !== 0 && d < 40 && d !== 1) continue
  let alive = 0, bag = 0, wheat = 0, flour = 0, bread = 0, food = 0
  let farmers = 0, millers = 0, fieldOwners = 0, nonFarmFields = 0, ripe = 0, wheatTiles = 0
  const profField: Record<string, number> = {}
  for (const v of state.villagers) {
    if (!v.alive) continue
    alive++
    bag += edibleValue(v.inventory)
    if (v.chestInventory) bag += edibleValue(v.chestInventory) * 0.5
    wheat += countOf(v.inventory, 'wheat') + (v.chestInventory ? countOf(v.chestInventory, 'wheat') : 0)
    flour += countOf(v.inventory, 'flour') + (v.chestInventory ? countOf(v.chestInventory, 'flour') : 0)
    bread += countOf(v.inventory, 'bread') + (v.chestInventory ? countOf(v.chestInventory, 'bread') : 0)
    food += countOf(v.inventory, 'food') + (v.chestInventory ? countOf(v.chestInventory, 'food') : 0)
    if (v.profession === 'farmer') farmers++
    if (v.profession === 'miller') millers++
    if (v.fieldX >= 0) {
      fieldOwners++
      const p = v.profession || 'none'
      profField[p] = (profField[p] || 0) + 1
      if (p !== 'farmer' && p !== 'miller') nonFarmFields++
      for (let y = v.fieldY - 3; y <= v.fieldY + 3; y++) {
        for (let x = v.fieldX - 3; x <= v.fieldX + 3; x++) {
          if (getTerrain(state.grid, x, y) !== WHEAT) continue
          wheatTiles++
          if (state.grid.amount[y * state.grid.width + x] >= WHEAT_RIPE) ripe++
        }
      }
    }
  }
  let mills = 0, millSites = 0, millTerrain = 0
  for (const vg of state.villages) {
    if (vg.hasMill) mills++
    if (vg.millX >= 0) millSites++
    if (vg.millX >= 0 && getTerrain(state.grid, vg.millX, vg.millY) === MILL) millTerrain++
  }
  console.log(JSON.stringify({
    d, alive, deaths: state.deaths, bag: Math.round(bag), food, wheat, flour, bread,
    farmers, millers, fieldOwners, nonFarmFields, profField, wheatTiles, ripe,
    mills, millSites, millTerrain, cum: { ...cum },
    grindByProfession: { ...grindByProfession },
    millerAlivePeak,
    grindLabel,
  }))
}