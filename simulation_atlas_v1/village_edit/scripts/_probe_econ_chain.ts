/**
 * Economy chain probe: resources → mill/flour/bread → craftGear → trade → prices.
 *   npx tsx scripts/_probe_econ_chain.ts [seed=7] [days=40]
 */
import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { countOf, edibleValue } from '../src/lib/sim/inventory'
import { priceOf } from '../src/lib/sim/commerce'
import { pickGearCraftTarget } from '../src/lib/sim/equipment'
import { canPracticeCraft } from '../src/lib/sim/livelihood'
import { sampleTempC } from '../src/lib/sim/climate'
import { coldStress01 } from '../src/lib/sim/climate'

const seed = Number(process.argv[2] ?? 7)
const days = Number(process.argv[3] ?? 40)
const state = createSimulation(seed)

const starts: Record<string, number> = {}
const noteStart = (k: string) => {
  starts[k] = (starts[k] ?? 0) + 1
}
const prevTask = new Map<number, string | null>()

for (let d = 1; d <= days; d++) {
  const end = d * TICKS_PER_DAY
  while (state.tick < end) {
    stepSimulation(state)
    for (const v of state.villagers) {
      if (!v.alive) continue
      const k = v.task?.kind ?? null
      const prev = prevTask.get(v.id) ?? null
      if (k && k !== prev) noteStart(k)
      prevTask.set(v.id, k)
    }
  }
  if (d % 10 === 0 || d === days) {
    const s = computeStats(state)
    let wheatBag = 0, wheatChest = 0, flour = 0, bread = 0, wool = 0, leather = 0, iron = 0, cloth = 0, coins = 0
    let mills = 0, workbenches = 0, gearEligible = 0, grindGate = 0, bakeGate = 0, traders = 0
    for (const vg of state.villages) if (vg.hasMill) mills++
    for (const v of state.villagers) {
      if (!v.alive) continue
      if (v.profession === 'trader') traders++
      if (v.hasWorkbench) workbenches++
      wheatBag += countOf(v.inventory, 'wheat')
      if (v.chestInventory) wheatChest += countOf(v.chestInventory, 'wheat')
      flour += countOf(v.inventory, 'flour') + (v.chestInventory ? countOf(v.chestInventory, 'flour') : 0)
      bread += countOf(v.inventory, 'bread') + (v.chestInventory ? countOf(v.chestInventory, 'bread') : 0)
      wool += countOf(v.inventory, 'wool')
      leather += countOf(v.inventory, 'leather')
      iron += countOf(v.inventory, 'iron')
      cloth += countOf(v.inventory, 'cloth')
      coins += countOf(v.inventory, 'coin') + (v.chestInventory ? countOf(v.chestInventory, 'coin') : 0)
      const vg = state.villages.find((g) => g.id === v.villageId)
      if (vg?.hasMill && (countOf(v.inventory, 'wheat') >= 2 || ['rye', 'barley', 'oats'].some((g) => countOf(v.inventory, g as any) >= 2)))
        grindGate++
      if (v.hasWorkbench && countOf(v.inventory, 'flour') > 0) bakeGate++
      const cold = coldStress01(sampleTempC(state.climate, v.x, v.y))
      if (v.hasWorkbench && pickGearCraftTarget(v, { season: state.season, cold01: cold, canCraft: (c) => canPracticeCraft(v, c) }))
        gearEligible++
    }
    const keyStarts = ['harvestWheat','buildMill','grindFlour','bakeBread','craftGear','craftIronTool','tradeRun','buyMaterial','gatherIron','weaveCloth','sewClothing']
    const startSnap: Record<string, number> = {}
    for (const k of keyStarts) startSnap[k] = starts[k] ?? 0
    console.log(JSON.stringify({
      day: d, pop: s.villagers, mills, workbenches, wheatBag, wheatChest, flour, bread, wool, leather, iron, cloth, coins,
      grindGate, bakeGate, gearEligible, traders, tradeRunsTotal: s.tradeRunsTotal, routes: state.tradeRoutes.size,
      markets: state.villages.filter((v) => v.hasMarket).length,
      prices: { bread: priceOf('bread', state), wheat: priceOf('wheat', state), flour: priceOf('flour', state), iron: priceOf('iron', state), wood: priceOf('wood', state), cloth: priceOf('cloth', state) },
      surplus0: state.villages[0] ? { food: +(state.villages[0].surplus.food ?? 0).toFixed(1), wheat: +(state.villages[0].surplus.wheat ?? 0).toFixed(1), wood: +(state.villages[0].surplus.wood ?? 0).toFixed(1), bread: +(state.villages[0].surplus.bread ?? 0).toFixed(1) } : null,
      starts: startSnap,
    }))
  }
}
