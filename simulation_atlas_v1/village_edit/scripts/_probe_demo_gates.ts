/** Focused gate dump for grown children / couples. */
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { edibleValue } from '../src/lib/sim/inventory'
import { MARRY_MIN_AGE, bondedPartner } from '../src/lib/sim/marriage'
import { fullNameOf } from '../src/lib/sim/family'
import type { Villager } from '../src/lib/sim/types'

const days = Number(process.argv[2] ?? 120)
const seed = Number(process.argv[3] ?? 42)
const state = createSimulation(seed)
for (let t = 1; t <= days * TICKS_PER_DAY; t++) stepSimulation(state)

function stock(v: Villager) {
  return edibleValue(v.inventory) + (v.chestInventory ? edibleValue(v.chestInventory) : 0)
}

const kids = state.villagers.filter((v) => v.parentIds.length > 0)
const grown = kids.filter((v) => v.alive && v.age >= MARRY_MIN_AGE)
console.log(JSON.stringify({ seed, days, births: state.births, deaths: state.deaths, kids: kids.length, grownAlive: grown.length }, null, 2))
for (const v of grown) {
  const sp = bondedPartner(state, v)
  const dist = sp ? Math.hypot(v.x - sp.x, v.y - sp.y) : null
  console.log(
    fullNameOf(v),
    'age=' + v.age,
    'home=' + v.hasHome,
    'owner=' + v.homeOwnerId,
    'hunger=' + v.hunger.toFixed(2),
    'stock=' + stock(v).toFixed(2),
    'cd=' + v.reproCooldown,
    'spouse=' + (sp ? fullNameOf(sp) + '@d' + dist!.toFixed(1) + '/home=' + sp.hasHome : 'none'),
    'sex=' + v.sex,
  )
}
const couples = state.villagers.filter((v) => v.alive && v.spouseId !== null && v.id < v.spouseId!)
console.log('--- married pairs ---')
for (const a of couples) {
  const b = state.villagers.find((o) => o.id === a.spouseId)!
  const d = Math.hypot(a.x - b.x, a.y - b.y)
  const readyA = a.hasHome && a.age >= MARRY_MIN_AGE && a.reproCooldown <= 0 && a.hunger >= 2 && stock(a) >= 0.5
  const readyB = b.hasHome && b.age >= MARRY_MIN_AGE && b.reproCooldown <= 0 && b.hunger >= 2 && stock(b) >= 0.5
  console.log(
    fullNameOf(a) + ' x ' + fullNameOf(b),
    'dist=' + d.toFixed(1),
    'ready=' + readyA + '/' + readyB,
    'homes=' + a.hasHome + '/' + b.hasHome,
    'parents=' + (a.parentIds.length > 0) + '/' + (b.parentIds.length > 0),
  )
}