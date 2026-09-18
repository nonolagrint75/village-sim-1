/**
 * FOOD SHORTAGE interconnect probe - seed 7, 30 days.
 * Natural path first; if no famine by d20, induce local pantry crisis and re-check professions.
 *
 *   npx tsx scripts/_probe_food_shortage.ts [seed=7] [days=30]
 */
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { computeCareerDemand } from '../src/lib/sim/careers'
import { feelFamine, villageInFamine } from '../src/lib/sim/ecology'
import { edibleValue } from '../src/lib/sim/inventory'
import type { Profession, SimState } from '../src/lib/sim/types'

const seed = Number(process.argv[2] ?? 7)
const days = Number(process.argv[3] ?? 30)
const ticks = days * TICKS_PER_DAY

const FOOD_PROFS: Profession[] = ['farmer', 'forager', 'fisher', 'herder', 'miller']

function foodish(c: Record<string, number>) {
  return FOOD_PROFS.reduce((n, p) => n + (c[p] ?? 0), 0)
}

function counts(state: SimState): Record<string, number> {
  const c: Record<string, number> = {}
  for (const v of state.villagers) {
    if (!v.alive) continue
    c[v.profession] = (c[v.profession] ?? 0) + 1
  }
  return c
}

function snap(state: SimState, label: string) {
  const c = counts(state)
  const villages = state.villages.map((vg) => {
    const demand = computeCareerDemand(state, vg)
    return {
      id: vg.id,
      pop: vg.memberIds.length,
      localFamine: villageInFamine(state, vg),
      feel: feelFamine(state, vg),
      foodNeed: +demand.foodNeed.toFixed(2),
      cultureNeed: +demand.cultureNeed.toFixed(2),
      tradeNeed: +demand.tradeNeed.toFixed(2),
      tradeRuns: vg.tradeRuns ?? 0,
    }
  })
  let giveFood = 0
  let tradeRun = 0
  let steal = 0
  let confront = 0
  for (const v of state.villagers) {
    if (!v.alive || !v.task) continue
    if (v.task.kind === 'giveFood') giveFood++
    if (v.task.kind === 'tradeRun') tradeRun++
    if (v.task.kind === 'steal') steal++
    if (v.task.kind === 'confront') confront++
  }
  const row = {
    label,
    day: +(state.tick / TICKS_PER_DAY).toFixed(1),
    globalFamine: state.famine,
    pop: state.villagers.filter((v) => v.alive).length,
    foodProfs: foodish(c),
    professions: c,
    villages,
    tasks: { giveFood, tradeRun, steal, confront },
    prices: {
      food: state.prices.food,
      wheat: state.prices.wheat,
      flour: state.prices.flour,
      bread: state.prices.bread,
    },
  }
  console.log(JSON.stringify(row))
  return row
}

function induceLocalFamine(state: SimState) {
  for (const vg of state.villages) {
    vg.surplus.food = Math.min(vg.surplus.food ?? 0, -2)
    vg.surplus.bread = Math.min(vg.surplus.bread ?? 0, -1)
    vg.surplus.wheat = Math.min(vg.surplus.wheat ?? 0, 0)
    vg.surplus.flour = Math.min(vg.surplus.flour ?? 0, 0)
  }
  for (const v of state.villagers) {
    if (!v.alive) continue
    v.hunger = Math.min(v.hunger, 1.4)
    if (edibleValue(v.inventory) > 3) {
      for (const it of v.inventory) {
        if (/berry|meat|fish|bread|wheat|flour|food|meal|fruit|veg|milk|cheese|stew/i.test(it.kind)) {
          it.qty = Math.min(it.qty, 1)
        }
      }
    }
    if (v.chestInventory) {
      for (const it of v.chestInventory) {
        if (/berry|meat|fish|bread|wheat|flour|food|meal|fruit|veg|milk|cheese|stew/i.test(it.kind)) {
          it.qty = Math.max(0, Math.floor(it.qty * 0.15))
        }
      }
    }
  }
  state.famine = true
}

const state = createSimulation(seed)
console.log('seed=' + seed + ' days=' + days)

let earlyFood = 0
let midFood = 0
let sawNaturalFamine = false
let induced = false
let inducedFoodNeedHigh = false
const earlyDay = 8
const midDay = 20

for (let t = 1; t <= ticks; t++) {
  stepSimulation(state)
  const day = state.tick / TICKS_PER_DAY
  if (!induced && (state.famine || state.villages.some((vg) => villageInFamine(state, vg)))) {
    sawNaturalFamine = true
  }

  if (Math.floor(day) === earlyDay && earlyFood === 0) {
    const r = snap(state, 'day' + earlyDay)
    earlyFood = r.foodProfs
  }
  if (Math.floor(day) === midDay && midFood === 0) {
    snap(state, 'day' + midDay + '-pre')
    midFood = foodish(counts(state))
    if (!sawNaturalFamine) {
      induceLocalFamine(state)
      induced = true
      const ind = snap(state, 'day' + midDay + '-induced')
      inducedFoodNeedHigh = ind.villages.some((vg) => vg.foodNeed >= 0.7)
    }
  }
}
const late = snap(state, 'day' + days)

const demandAfter = state.villages.map((vg) => computeCareerDemand(state, vg).foodNeed)
const foodNeedHigh = demandAfter.some((n) => n >= 0.7)

console.log(
  JSON.stringify({
    sawNaturalFamine,
    induced,
    earlyFood,
    midFood,
    lateFood: late.foodProfs,
    foodNeedHigh,
    inducedFoodNeedHigh,
    foodShift: late.foodProfs >= earlyFood || (induced && foodNeedHigh),
    path: induced ? 'induced' : sawNaturalFamine ? 'natural' : 'none',
  }),
)

const pass = foodNeedHigh || inducedFoodNeedHigh || late.foodProfs >= earlyFood
console.log(pass ? 'PASS - famine/food careers wired' : 'WARN - no clear foodNeed/profession signal')
process.exit(0)