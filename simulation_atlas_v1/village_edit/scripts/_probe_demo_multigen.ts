import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { reconstructPedigree, findGenealogy, fullNameOf } from '../src/lib/sim/family'
import { MARRY_MIN_AGE } from '../src/lib/sim/marriage'

const seed = Number(process.argv[2] ?? 7)
const days = Number(process.argv[3] ?? 150)
const state = createSimulation(seed)
for (let t = 1; t <= days * TICKS_PER_DAY; t++) stepSimulation(state)

function depthOf(id: number, memo = new Map<number, number>(), seen = new Set<number>()): number {
  if (memo.has(id)) return memo.get(id)!
  if (seen.has(id)) return 0
  seen.add(id)
  const v = state.villagers.find((o) => o.id === id)
  const g = findGenealogy(state, id)
  const parents = v?.parentIds?.length ? v.parentIds : g?.parentIds ?? []
  if (!parents.length) {
    memo.set(id, 0)
    return 0
  }
  let d = 0
  for (const pid of parents) d = Math.max(d, 1 + depthOf(pid, memo, seen))
  memo.set(id, d)
  return d
}

const kids = state.villagers.filter((v) => v.parentIds.length > 0)
let maxGen = 0
let multi = 0
let housedKids = 0
let grownHoused = 0
let grownWed = 0
for (const v of kids) {
  const d = depthOf(v.id)
  maxGen = Math.max(maxGen, d)
  if (d >= 2) multi++
  if (v.alive && v.hasHome) housedKids++
  if (v.alive && v.age >= MARRY_MIN_AGE) {
    if (v.hasHome) grownHoused++
    if (v.spouseId !== null) grownWed++
  }
}
const deep = kids.map((v) => ({ v, d: depthOf(v.id) })).sort((a, b) => b.d - a.d)[0]
console.log(JSON.stringify({
  seed, days, births: state.births, deaths: state.deaths,
  pop: state.villagers.filter((v) => v.alive).length,
  kids: kids.length, maxGen, multiGenPeople: multi,
  housedKids, grownHoused, grownWed,
}, null, 2))
if (deep) {
  console.log('deepest', fullNameOf(deep.v), 'gen', deep.d, 'alive', deep.v.alive, 'home', deep.v.hasHome)
  console.log(reconstructPedigree(state, deep.v.id, 6).map((n) => 'd' + n.depth + ':' + n.givenName + '#' + n.id + ' p=' + JSON.stringify(n.parentIds)).join(' | '))
}