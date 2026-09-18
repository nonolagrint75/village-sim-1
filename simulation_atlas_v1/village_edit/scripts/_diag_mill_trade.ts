import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { countOf } from '../src/lib/sim/inventory'
import { distance } from '../src/lib/sim/world'
import { findTradeOpportunity, priceOf } from '../src/lib/sim/commerce'
import fs from 'fs'

const state = createSimulation(7)
for (let t = 0; t < TICKS_PER_DAY * 12; t++) stepSimulation(state)
const rows = []
for (const vg of state.villages) {
  const homeowners = []
  for (const v of state.villagers) {
    if (!v.alive || v.villageId !== vg.id || !v.hasHome) continue
    const wood = countOf(v.inventory, 'wood')
    const stone = countOf(v.inventory, 'stone')
    const wheat = countOf(v.inventory, 'wheat')
    const dist = vg.millX >= 0 ? distance(v.x, v.y, vg.millX, vg.millY) : null
    const deal = findTradeOpportunity(state, vg, v.x, v.y, v)
    homeowners.push({
      id: v.id,
      wood,
      stone,
      wheat,
      canMill: wood >= 6 && stone >= 4,
      millDist: dist == null ? null : Math.round(dist),
      deal: deal ? { res: deal.resource, gain: +deal.gain.toFixed(2), d: Math.round(deal.distance) } : null,
      hunger: +v.hunger.toFixed(2),
      cd: v.tradeCooldown,
      ambit: v.ambition,
      prof: v.profession,
    })
  }
  rows.push({
    vg: vg.id,
    millX: vg.millX,
    millY: vg.millY,
    center: [vg.centerX, vg.centerY],
    millFromCenter: vg.millX >= 0 ? +distance(vg.centerX, vg.centerY, vg.millX, vg.millY).toFixed(1) : null,
    surplus: {
      food: +(vg.surplus.food ?? 0).toFixed(1),
      wheat: +(vg.surplus.wheat ?? 0).toFixed(1),
      wood: +(vg.surplus.wood ?? 0).toFixed(1),
      bread: +(vg.surplus.bread ?? 0).toFixed(1),
    },
    homeowners,
  })
}
fs.writeFileSync(
  '_econ_diag2.json',
  JSON.stringify(
    {
      prices: { bread: priceOf('bread', state), flour: priceOf('flour', state), iron: priceOf('iron', state) },
      rows,
    },
    null,
    2,
  ),
)
console.log('wrote _econ_diag2.json')
