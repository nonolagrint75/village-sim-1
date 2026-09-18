import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { BANDIT_START_DAY } from '../src/lib/sim/bandits'
import { distance } from '../src/lib/sim/world'

const seed = Number(process.argv[2] ?? 7)
const days = Number(process.argv[3] ?? 65)
console.log('verify ghosts seed', seed, 'days', days, 'banditStart', BANDIT_START_DAY)
const state = createSimulation(seed)
let spouseGhost = 0, homeGhost = 0, campTp = 0, samples = 0
const camp = new Map<number, {x:number;y:number}>()
const examples: string[] = []
for (let t = 1; t <= days * TICKS_PER_DAY; t++) {
  stepSimulation(state)
  if (t % 2 !== 0) continue
  samples++
  for (const band of state.bands) {
    const prev = camp.get(band.id)
    if (!prev) camp.set(band.id, {x:band.campX,y:band.campY})
    else if (prev.x !== band.campX || prev.y !== band.campY) {
      if (distance(prev.x,prev.y,band.campX,band.campY) > 8) campTp++
      camp.set(band.id, {x:band.campX,y:band.campY})
    }
  }
  for (const v of state.villagers) {
    if (!v.alive) continue
    if (v.spouseId != null) {
      const s = state.villagers.find(o => o.id === v.spouseId)
      if (!s || !s.alive) {
        spouseGhost++
        if (examples.length < 8) examples.push(`spouse ${v.name}(${v.id})->${v.spouseId} d${Math.floor(state.tick/TICKS_PER_DAY)}`)
      }
    }
    if (v.homeOwnerId != null && v.homeOwnerId !== v.id) {
      const o = state.villagers.find(x => x.id === v.homeOwnerId)
      if (!o || !o.alive) {
        homeGhost++
        if (examples.length < 8) examples.push(`homeOwner ${v.name}->${v.homeOwnerId}`)
      }
    }
  }
}
const s = computeStats(state)
const dead = state.villagers.filter(v => !v.alive).length
const deserterOrigins = new Set(state.bandits.map(b => b.originVillagerId).filter(x => x != null))
console.log(JSON.stringify({
  alive: s.villagers, deaths: s.deaths, deadInArray: dead,
  bands: s.bands, bandits: s.bandits, deserterOrigins: deserterOrigins.size,
  spouseGhost, homeGhost, campTp, samples, examples
}, null, 2))
