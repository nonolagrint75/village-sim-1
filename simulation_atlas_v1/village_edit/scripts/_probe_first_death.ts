import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY, hourOfDay } from '../src/lib/sim/calendar'
import { edibleValue } from '../src/lib/sim/inventory'

const seeds = [1, 2, 7, 42, 777, 1024]
for (const seed of seeds) {
  const s = createSimulation(seed)
  let firstHunger0: { day: number; hour: number; name: string } | null = null
  let firstDeath: { day: number; hour: number; deaths: number } | null = null
  let bag0 = 0
  let bagSum = 0
  let n = 0
  for (const v of s.villagers) {
    if (!v.alive) continue
    const e = edibleValue(v.inventory)
    bagSum += e
    n++
    if (e <= 0) bag0++
  }
  for (let t = 1; t <= 15 * TICKS_PER_DAY; t++) {
    stepSimulation(s)
    for (const v of s.villagers) {
      if (!v.alive) continue
      if (v.hunger <= 0 && firstHunger0 === null) {
        firstHunger0 = { day: Math.ceil(t / TICKS_PER_DAY), hour: hourOfDay(s.tick), name: v.name }
      }
    }
    if (firstDeath === null && s.deaths > 0) {
      firstDeath = { day: Math.ceil(t / TICKS_PER_DAY), hour: hourOfDay(s.tick), deaths: s.deaths }
      break
    }
  }
  console.log(
    JSON.stringify({
      seed,
      startBag: Number((bagSum / n).toFixed(2)),
      emptyBags: `${bag0}/${n}`,
      firstHunger0,
      firstDeath,
      finalDeaths: s.deaths,
      alive: s.villagers.filter((v) => v.alive).length,
    }),
  )
}
