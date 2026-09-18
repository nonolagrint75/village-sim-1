import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { MARRY_MIN_AGE } from '../src/lib/sim/marriage'
import { fullNameOf } from '../src/lib/sim/family'
import { countOf } from '../src/lib/sim/inventory'

const seed = 42
const days = 120
const state = createSimulation(seed)
const hist: string[] = []
for (let t = 1; t <= days * TICKS_PER_DAY; t++) {
  stepSimulation(state)
  if (t % (TICKS_PER_DAY * 15) === 0) {
    const kids = state.villagers.filter((v) => v.parentIds.length > 0 && v.alive)
    const grown = kids.filter((v) => v.age >= MARRY_MIN_AGE)
    const withHome = grown.filter((v) => v.hasHome).length
    const withHx = grown.filter((v) => v.homeX >= 0).length
    const withHouse = grown.filter((v) => v.house).length
    const married = grown.filter((v) => v.spouseId !== null).length
    const woodish = grown.filter((v) => countOf(v.inventory, 'wood') >= 1).length
    hist.push(
      'd' + Math.floor(t / TICKS_PER_DAY) +
      ' grown=' + grown.length +
      ' home=' + withHome +
      ' hx=' + withHx +
      ' plan=' + withHouse +
      ' wed=' + married +
      ' wood=' + woodish +
      ' births=' + state.births,
    )
  }
}
console.log(hist.join('\n'))
const grown = state.villagers.filter((v) => v.alive && v.parentIds.length > 0 && v.age >= MARRY_MIN_AGE)
for (const v of grown.slice(0, 8)) {
  console.log(
    fullNameOf(v),
    'home=' + v.hasHome,
    'hx=' + v.homeX,
    'hy=' + v.homeY,
    'house=' + (v.house ? v.house.shape : 'null'),
    'wood=' + countOf(v.inventory, 'wood'),
    'village=' + v.villageId,
    'task=' + (v.task?.kind ?? 'idle'),
  )
}