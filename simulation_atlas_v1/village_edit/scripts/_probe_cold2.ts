import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY, isNightTick } from '../src/lib/sim/calendar'
import { sampleBiome, sampleTempC, coldStress01 } from '../src/lib/sim/climate'
import { biomeColdBias, biomeLabelFr, biomeIsFoundable } from '../src/lib/sim/biomes'

function outdoorCold(state, v) {
  const temp = sampleTempC(state.climate, v.x, v.y)
  const biomeCold = biomeColdBias(sampleBiome(state.climate, v.x, v.y))
  const airCold = coldStress01(temp)
  const atHome = v.hasHome && Math.hypot(v.x - v.homeX, v.y - v.homeY) < 3.2
  return Math.min(1, airCold + (atHome || airCold < 0.08 ? 0 : biomeCold * 0.55))
}

const seeds = [1, 99, 256, 404, 1337, 5000, 8888, 42, 77, 9001]
for (const seed of seeds) {
  const state = createSimulation(seed)
  let nonFoundable = 0
  const biomeCounts = new Map()
  for (const v of state.villagers) {
    const b = sampleBiome(state.climate, v.x, v.y)
    biomeCounts.set(b, (biomeCounts.get(b)||0)+1)
    if (!biomeIsFoundable(b)) nonFoundable++
  }
  let minNightT = Infinity
  let maxOutdoorCold = 0
  let coldD = 0
  let lastLog = 0
  for (let t = 0; t < 60 * TICKS_PER_DAY; t++) {
    stepSimulation(state)
    if (isNightTick(state.tick) && t < 5 * TICKS_PER_DAY) {
      for (const v of state.villagers) {
        if (!v.alive) continue
        minNightT = Math.min(minNightT, sampleTempC(state.climate, v.x, v.y))
        maxOutdoorCold = Math.max(maxOutdoorCold, outdoorCold(state, v))
      }
    }
    if (state.log.length > lastLog) {
      for (let i = lastLog; i < state.log.length; i++) {
        if (/meurt de froid/i.test(state.log[i])) coldD++
      }
      lastLog = state.log.length
    }
  }
  const alive = state.villagers.filter(v=>v.alive).length
  const bstr = [...biomeCounts.entries()].map(([k,v]) => biomeLabelFr(k)+':'+v).join(',')
  console.log(`seed ${seed} nonFound ${nonFoundable} minNightT5d ${minNightT.toFixed(1)} maxCold5d ${maxOutdoorCold.toFixed(3)} coldD60 ${coldD} alive ${alive} start ${bstr}`)
}
