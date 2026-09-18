import { createSimulation, stepSimulation, computeStats } from './src/lib/sim/engine'
import { TICKS_PER_DAY } from './src/lib/sim/calendar'
import { politicsOf } from './src/lib/sim/politics'
import { mindOf } from './src/lib/sim/cognition'

const days = Number(process.argv[2] ?? 60)
const seed = Number(process.argv[3] ?? 1)
const state = createSimulation(seed)
for (let t = 1; t <= days * TICKS_PER_DAY; t++) stepSimulation(state)

let maxP = 0,
  maxW = 0,
  maxS = 0,
  creeds = 0
const creedIds: Record<string, number> = {}
for (const v of state.villagers) {
  if (!v.alive) continue
  const p = politicsOf(v)
  const m = mindOf(v)
  maxP = Math.max(maxP, p.beliefs.piety)
  maxW = Math.max(maxW, p.creedWeight)
  maxS = Math.max(maxS, m.sacredConf)
  if (p.creed) {
    creeds++
    creedIds[p.creed] = (creedIds[p.creed] ?? 0) + 1
  }
}
const s = computeStats(state)
const relLog = state.log.filter((l) => /creed|foi|rite|autel|sanctuaire|hors-la-loi|brigand|bande|chefferie|royaume|territoire|succède/i.test(l))
console.log(
  JSON.stringify(
    {
      days,
      seed,
      pop: s.villagers,
      maxPiety: +maxP.toFixed(3),
      maxCreedWeight: +maxW.toFixed(3),
      maxSacred: +maxS.toFixed(3),
      creeds,
      creedIds,
      polities: (state.polities ?? []).map((p) => ({
        name: p.name,
        tier: p.tier,
        villages: p.villageIds.length,
        legit: +p.legitimacy.toFixed(2),
      })),
      bandits: state.bandits?.filter((b) => b.alive).length ?? 0,
      bands: (state.bands ?? []).map((b) => ({ name: b.name, n: b.memberIds.length, raids: b.raids })),
      institutions: state.circles.filter((c) => c.isInstitution).length,
      faith: state.circles.filter((c) => c.kind === 'faith').length,
      walls: state.villages.map((v) => v.wallTier),
      shrines: state.villages.filter((v) => v.hasShrine).map((v) => v.shrineLabel),
      milestones: state.milestones,
      civLog: relLog.slice(-25),
      deaths: s.deaths,
      deathsByBandit: s.deathsByBandit,
    },
    null,
    2,
  ),
)
