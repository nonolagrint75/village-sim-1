/**
 * Early cold-death probe across seeds.
 *   npx tsx scripts/_probe_cold.ts
 */
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { sampleBiome, sampleTempC, coldStress01 } from '../src/lib/sim/climate'
import { biomeColdBias, biomeLabelFr } from '../src/lib/sim/biomes'
import { equipmentEffectsOf } from '../src/lib/sim/equipment'
import { clothingClo } from '../src/lib/sim/physicsScale'
import { countOf } from '../src/lib/sim/inventory'

const seeds = [1, 7, 42, 99, 123, 256, 777, 999, 2024, 404]
const days = 10

for (const seed of seeds) {
  const state = createSimulation(seed)
  const founders = state.villagers.filter((v) => v.alive)
  const biomes = new Map()
  let minT = Infinity
  let maxT = -Infinity
  let coldHits = 0
  let cloSum = 0
  for (const v of founders) {
    const b = sampleBiome(state.climate, v.x, v.y)
    biomes.set(b, (biomes.get(b) || 0) + 1)
    const t = sampleTempC(state.climate, v.x, v.y)
    minT = Math.min(minT, t)
    maxT = Math.max(maxT, t)
    const cold = Math.min(1, coldStress01(t) + biomeColdBias(b) * 0.55)
    if (cold > 0.05) coldHits++
    const gear = equipmentEffectsOf(v)
    cloSum += clothingClo(
      countOf(v.inventory, 'leather') > 0,
      countOf(v.inventory, 'clothing') > 0,
      gear.clo,
    )
  }
  let coldDeaths = 0
  let hungerDeaths = 0
  let other = 0
  let lastLog = 0
  for (let t = 0; t < days * TICKS_PER_DAY; t++) {
    stepSimulation(state)
    if (state.log.length > lastLog) {
      for (let i = lastLog; i < state.log.length; i++) {
        const line = state.log[i]
        if (/meurt de froid/i.test(line)) coldDeaths++
        else if (/mort de faim/i.test(line)) hungerDeaths++
        else if (/meurt|est mort|succombe|tué/i.test(line)) other++
      }
      lastLog = state.log.length
    }
  }
  const alive = state.villagers.filter((v) => v.alive).length
  const biomeStr = [...biomes.entries()].map(([k, v]) => biomeLabelFr(k) + ':' + v).join(',')
  console.log(
    'seed ' + seed +
    ' alive ' + alive + '/' + founders.length +
    ' coldD ' + coldDeaths +
    ' hungerD ' + hungerDeaths +
    ' otherD ' + other +
    ' T [' + minT.toFixed(1) + ',' + maxT.toFixed(1) + ']' +
    ' coldHits ' + coldHits +
    ' meanClo ' + (cloSum / founders.length).toFixed(2) +
    ' biomes ' + biomeStr,
  )
}
