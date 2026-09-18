import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { canClaimNewField, villageFieldCap, countVillageFields, FIELD_RADIUS } from '../src/lib/sim/fields'
import { cropTempFactor, sampleTempC } from '../src/lib/sim/climate'
import { findBuildSite } from '../src/lib/sim/world'

for (const seed of [1, 3, 7]) {
  const state = createSimulation(seed)
  for (let d = 0; d < 20; d++) for (let t = 0; t < TICKS_PER_DAY; t++) stepSimulation(state)
  let farmers = 0, owners = 0, wheatTiles = 0
  for (const v of state.villagers) {
    if (!v.alive) continue
    if (v.profession === 'farmer') farmers++
    if (v.fieldX >= 0) owners++
  }
  const vg = state.villages[0]
  let mills = 0, flour = 0, bread = 0
  for (const g of state.villages) if (g.hasMill) mills++
  for (const v of state.villagers) {
    if (!v.alive) continue
    for (const inv of [v.inventory, v.chestInventory]) {
      if (!inv) continue
      for (const s of inv) {
        if (s.type === 'flour') flour += s.count
        if (s.type === 'bread') bread += s.count
      }
    }
  }
  console.log(JSON.stringify({
    seed, d: 20, farmers, owners,
    fields: countVillageFields(state, vg?.id ?? null),
    cap: villageFieldCap(state, vg?.id ?? null),
    mills, flour, bread,
    deaths: state.deaths,
    alive: state.villagers.filter((v) => v.alive).length,
    fieldR: FIELD_RADIUS,
  }))
}