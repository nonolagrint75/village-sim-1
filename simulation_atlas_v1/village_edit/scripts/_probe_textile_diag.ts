import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'

const seed = Number(process.argv[2] ?? 7)
const days = Number(process.argv[3] ?? 35)
const state = createSimulation(seed)
let firstH = -1
let firstW = -1
for (let t = 1; t <= days * TICKS_PER_DAY; t++) {
  stepSimulation(state)
  const h = state.villagers.filter((v) => v.alive && v.profession === 'herder').length
  const w = state.villagers.filter((v) => v.alive && v.profession === 'weaver').length
  if (firstH < 0 && h > 0) firstH = Math.floor(t / TICKS_PER_DAY)
  if (firstW < 0 && w > 0) firstW = Math.floor(t / TICKS_PER_DAY)
}
const h = state.villagers.filter((v) => v.alive && v.profession === 'herder').length
const w = state.villagers.filter((v) => v.alive && v.profession === 'weaver').length
const sheep = state.sheep.filter((s) => s.alive).length
const soft = state as any
console.log(JSON.stringify({
  seed, days, firstH, firstW, h, w, sheep,
  lends: soft.informalLendCount ?? 0,
  books: soft.creditBooks?.length ?? 0,
  kin: soft.kinGraph?.nodes?.size ?? 0,
  famine: !!state.famine,
}, null, 2))