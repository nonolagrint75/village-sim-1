import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { firmsSummary } from '../src/lib/sim/economy/business'
import { countOf } from '../src/lib/sim/inventory'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'

const state = createSimulation(7)
const keys = ['bread','flour','cloth','rope','cheese','ale','medicine','bronze','mortar','brick','wood','stone','iron','clothing','linen']
for (let t = 0; t < TICKS_PER_DAY * 25; t++) {
  stepSimulation(state)
  if (t % (TICKS_PER_DAY * 5) === TICKS_PER_DAY * 5 - 1) {
    const f = firmsSummary(state)
    let bag: Record<string, number> = {}
    for (const v of state.villagers) {
      if (!v.alive) continue
      for (const k of keys) bag[k] = (bag[k] ?? 0) + countOf(v.inventory, k as any)
    }
    const sur: Record<string, number> = {}
    for (const vg of state.villages) {
      for (const k of keys) {
        const s = vg.surplus?.[k as any] ?? 0
        if (s > 0.1) sur[k] = (sur[k] ?? 0) + s
      }
    }
    console.log(JSON.stringify({ day: Math.floor((t+1)/TICKS_PER_DAY), ...f, bag, sur, firmsAlive: state.economyBusinesses?.filter(b=>!b.failed).length, owners: state.economyBusinesses?.filter(b=>!b.failed).map(b => {
      const o = state.villagers.find(v=>v.id===b.ownerId)
      return { kind:b.kind, vid:o?.villageId ?? null, alive:!!o?.alive }
    })}))
  }
}
