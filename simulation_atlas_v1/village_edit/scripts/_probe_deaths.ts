/** Death cause breakdown */
import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
const seeds = [1,3,7,11,42]
const days = 90
for (const seed of seeds) {
  const state = createSimulation(seed)
  const causes = { famine: 0, disease: 0, cold: 0, other: 0 }
  let maxPop = 0
  for (let t = 1; t <= days * TICKS_PER_DAY; t++) {
    const before = state.deaths
    stepSimulation(state)
    if (state.deaths > before) {
      const last = state.log[state.log.length - 1] ?? ''
      if (last.includes('faim')) causes.famine++
      else if (last.includes('maladie')) causes.disease++
      else if (last.includes('froid')) causes.cold++
      else causes.other++
    }
    const alive = state.villagers.filter(v => v.alive).length
    if (alive > maxPop) maxPop = alive
  }
  const s = computeStats(state)
  console.log(JSON.stringify({ seed, pop: s.villagers, maxPop, births: s.births, deaths: s.deaths, wolf: s.deathsByWolf, bandit: s.deathsByBandit ?? 0, causes, famineFlag: s.famine }))
}
