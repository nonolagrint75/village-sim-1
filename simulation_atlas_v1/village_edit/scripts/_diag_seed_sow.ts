import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { sampleTempC, cropTempFactor, sampleBiome } from '../src/lib/sim/climate'
import { getTerrain, isBuildableGround, needsClearing, fieldCells } from '../src/lib/sim/world'
import { canSowPersonalField, FIELD_RADIUS } from '../src/lib/sim/fields'
import { WHEAT, DIRT, GRASS } from '../src/lib/sim/types'

const seed = Number(process.argv[2] ?? 1)
const days = Number(process.argv[3] ?? 12)
const state = createSimulation(seed)

function sowingSeason(season, tempC = 12) {
  if (cropTempFactor(tempC) < 0.35) return false
  return season === 'spring' || season === 'summer' || (season === 'autumn' && tempC > 14)
}

function snap(label) {
  const rows = []
  let sowTasks = 0, clearTasks = 0
  for (const v of state.villagers) {
    if (!v.alive) continue
    if (v.task?.kind === 'sowField') sowTasks++
    if (v.task?.kind === 'clearLand') clearTasks++
    if (v.fieldX < 0) continue
    const cells = fieldCells(state.grid, v.fieldX, v.fieldY, FIELD_RADIUS)
    let veg = 0, bare = 0, wheat = 0, woodpile = 0
    for (const c of cells) {
      const t = getTerrain(state.grid, c.x, c.y)
      if (needsClearing(state.grid, c.x, c.y)) veg++
      if (isBuildableGround(state.grid, c.x, c.y)) bare++
      if (t === WHEAT) wheat++
      const i = c.y * state.grid.width + c.x
      if ((t === DIRT || t === GRASS) && state.grid.amount[i] > 0) woodpile++
    }
    const tC = sampleTempC(state.climate, v.fieldX, v.fieldY)
    rows.push({
      id: v.id, prof: v.profession, hasField: v.hasField,
      tC: +tC.toFixed(1), tFac: +cropTempFactor(tC).toFixed(2),
      sowOk: sowingSeason(state.season, tC), canSow: canSowPersonalField(v),
      biome: sampleBiome(state.climate, v.fieldX, v.fieldY),
      veg, bare, wheat, woodpile, cells: cells.length,
      task: v.task?.kind ?? null,
    })
  }
  console.log(JSON.stringify({
    label, day: +(state.tick / TICKS_PER_DAY).toFixed(1), season: state.season,
    sowTasks, clearTasks, fields: rows.length, rows
  }))
}

snap('start')
for (let d = 1; d <= days; d++) {
  for (let t = 0; t < TICKS_PER_DAY; t++) stepSimulation(state)
  if ([1,2,3,5,8,10,12].includes(d) || d === days) snap('d' + d)
}