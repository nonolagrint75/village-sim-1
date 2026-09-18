/**
 * Survival verification — run from village_edit: npx tsx scripts/verify-survival.ts
 */
import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { edibleValue } from '../src/lib/sim/inventory'
import { sampleBiome } from '../src/lib/sim/climate'
import { biomeLabelFr } from '../src/lib/sim/biomes'

const seeds = [1, 2, 3, 7, 42]
const days = 60

for (const seed of seeds) {
  const state = createSimulation(seed)
  const causes = { starve: 0, disease: 0, wolf: 0, other: 0 }
  const seen = new Set<string>()
  const biomes: Record<string, number> = {}
  for (const v of state.villagers) {
    if (!v.alive) continue
    const b = biomeLabelFr(sampleBiome(state.climate, v.x, v.y))
    biomes[b] = (biomes[b] ?? 0) + 1
  }
  let day5 = 0
  let day30 = 0
  let minPop = 999

  for (let t = 1; t <= days * TICKS_PER_DAY; t++) {
    stepSimulation(state)
    for (const line of state.log) {
      if (seen.has(line)) continue
      seen.add(line)
      const l = line.toLowerCase()
      if (l.includes('mort de faim')) causes.starve++
      else if (l.includes('maladie')) causes.disease++
      else if (l.includes('loup') || l.includes('dévor')) causes.wolf++
      else if (/\best mort\b|est tué|succombe/.test(l)) causes.other++
    }
    if (t % TICKS_PER_DAY === 0) {
      const s = computeStats(state)
      minPop = Math.min(minPop, s.villagers)
      if (t === 5 * TICKS_PER_DAY) day5 = s.villagers
      if (t === 30 * TICKS_PER_DAY) day30 = s.villagers
    }
  }
  const s = computeStats(state)
  let fields = 0
  let houses = 0
  let food = 0
  let chest = 0
  let hungryWithFood = 0
  for (const v of state.villagers) {
    if (!v.alive) continue
    if (v.hasField) fields++
    if (v.hasHome) houses++
    const ev = edibleValue(v.inventory)
    food += ev
    if (v.chestInventory) chest += edibleValue(v.chestInventory)
    if (v.hunger < 1.5 && ev > 0) hungryWithFood++
  }
  console.log(
    JSON.stringify({
      seed,
      biomes,
      day5,
      day30,
      final: s.villagers,
      min: minPop,
      deaths: s.deaths,
      births: s.births,
      fields,
      houses,
      food: Math.round(food),
      chest: Math.round(chest),
      hungryWithFood,
      causes,
      famine: s.famine,
      wipe: s.villagers === 0,
    }),
  )
}
