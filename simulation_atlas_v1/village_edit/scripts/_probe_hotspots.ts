import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { tickClimate } from '../src/lib/sim/climate'
import { tickPolitics } from '../src/lib/sim/politics'
import { tickBandits } from '../src/lib/sim/bandits'
import { tickBuildProjects } from '../src/lib/sim/construction'
import { tickTechnology } from '../src/lib/sim/technology'
import { tickRoadWear } from '../src/lib/sim/roads'
import { tickFields, tickTrade, tickVillageEconomy, tickVillager, tickFamine, tickReproduction, tickWolf, tickSheep, tickCombat, tickRegrowth } from '../src/lib/sim/behaviors'
import { tickMarriage, tickAdoption } from '../src/lib/sim/marriage'
import { tickLineages, tickAncestorMemory } from '../src/lib/sim/family'
import { tickEthnosWorld } from '../src/lib/sim/ethnos'
import { tickMarketPrices, tickUrbanNetwork } from '../src/lib/sim/commerce'
import { tickWorkOrders } from '../src/lib/sim/build/workOrders'
import { makeRng } from '../src/lib/sim/world'

const state = createSimulation(7)
const rng = makeRng(7)
const N = 120
const sections: Record<string, number> = {}
function time(name: string, fn: () => void) {
  const t0 = performance.now()
  for (let i = 0; i < N; i++) fn()
  sections[name] = performance.now() - t0
}
// Warm
for (let i = 0; i < 20; i++) stepSimulation(state)
time('fullStep', () => { stepSimulation(state) })
const s2 = createSimulation(7)
for (let i = 0; i < 20; i++) stepSimulation(s2)
time('villagers', () => {
  for (const v of s2.villagers) if (v.alive) tickVillager(s2, v, rng)
  s2.tick++
})
console.log(JSON.stringify({ msPer120: sections, msPerTickFull: +(sections.fullStep/N).toFixed(3), villagerShare: +((sections.villagers/sections.fullStep)*100).toFixed(1) }, null, 2))