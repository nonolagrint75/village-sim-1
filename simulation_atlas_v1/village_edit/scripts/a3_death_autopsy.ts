/**
 * Autopsy: per-death hunger/bag/task around mass-starve window.
 * Usage: npx tsx scripts/a3_death_autopsy.ts 1 60
 */
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY, hourOfDay } from '../src/lib/sim/calendar'
import { countOf, edibleValue, bestEdibleIn } from '../src/lib/sim/inventory'

const seed = Number(process.argv[2] ?? 1)
const days = Number(process.argv[3] ?? 60)
const state = createSimulation(seed)
const seen = new Set(state.log)

type Snap = { hunger: number; bag: number; chest: number; task: string; starve: number; food: number; wheat: number; best: string }
const before = new Map<number, Snap>()

function snap(v: typeof state.villagers[0]): Snap {
  return {
    hunger: +v.hunger.toFixed(2),
    bag: +edibleValue(v.inventory).toFixed(2),
    chest: v.chestInventory ? +edibleValue(v.chestInventory).toFixed(2) : 0,
    task: v.task?.kind ?? 'none',
    starve: v.starveTimer,
    food: countOf(v.inventory, 'food'),
    wheat: countOf(v.inventory, 'wheat'),
    best: bestEdibleIn(v.inventory) ?? 'none',
  }
}

let deaths = 0
for (let t = 1; t <= days * TICKS_PER_DAY; t++) {
  before.clear()
  for (const v of state.villagers) if (v.alive) before.set(v.id, snap(v))
  stepSimulation(state)
  const day = Math.ceil(t / TICKS_PER_DAY)
  const hour = hourOfDay(state.tick)
  for (const line of state.log) {
    if (seen.has(line)) continue
    seen.add(line)
  }
  for (const v of state.villagers) {
    const prev = before.get(v.id)
    if (!prev || v.alive) continue
    deaths++
    let cause = 'unknown'
    for (const line of state.log.slice(-8)) {
      if (!line.includes(v.name)) continue
      const l = line.toLowerCase()
      if (l.includes('faim')) cause = 'starve'
      else if (l.includes('froid')) cause = 'cold'
      else if (l.includes('maladie')) cause = 'disease'
      else if (l.includes('loup')) cause = 'wolf'
      else if (l.includes('tue')) cause = 'kill'
    }
    console.log(JSON.stringify({
      day, hour, name: v.name, cause, season: state.season, famine: state.famine,
      ...prev,
      homes: state.villagers.filter(x => x.alive && x.hasHome && x.homeOwnerId === x.id).length,
      alive: state.villagers.filter(x => x.alive).length,
      bandits: (state.bandits ?? []).filter(b => b.alive).length,
    }))
  }
  if (t % TICKS_PER_DAY === 0 && (day >= 40 || day % 15 === 0)) {
    let hungry = 0, empty = 0, withFood = 0, resting = 0, eating = 0, gathering = 0, totalBag = 0, chestFood = 0
    for (const v of state.villagers) {
      if (!v.alive) continue
      const bag = edibleValue(v.inventory)
      totalBag += bag
      if (v.chestInventory) chestFood += edibleValue(v.chestInventory)
      if (v.hunger < 2) hungry++
      if (bag < 0.5) empty++
      if (bag >= 1) withFood++
      if (v.task?.kind === 'rest') resting++
      if (v.task?.kind === 'eat') eating++
      if (v.task?.kind === 'gatherFood' || v.task?.kind === 'harvestWheat' || v.task?.kind === 'takeFromChest') gathering++
    }
    const alive = state.villagers.filter(v => v.alive).length
    console.log('DAY', JSON.stringify({
      day, season: state.season, famine: state.famine, alive, deaths: state.deaths, births: state.births,
      hungry, empty, withFood, resting, eating, gathering,
      totalBag: +totalBag.toFixed(1), chestFood: +chestFood.toFixed(1),
    }))
  }
}
console.log('TOTAL_DEATHS', deaths, 'state.deaths', state.deaths)