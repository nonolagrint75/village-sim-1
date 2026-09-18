/**
 * Civilization emergence audit — religions, polities, bandits, forts, inventions, trade, pop.
 * Run: npx tsx scripts/audit-civ-emerge.ts [seed] [days]
 */
import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { politicsOf, creedLabel } from '../src/lib/sim/politics'
import { isReligionChronicleLine } from '../src/lib/sim/religion'
import { knowledgeCount } from '../src/lib/sim/technology'

const seed = Number(process.argv[2] ?? 1)
const days = Number(process.argv[3] ?? 75)
const ticks = days * TICKS_PER_DAY

type Peak = {
  pop: number
  creeds: number
  faith: number
  institutions: number
  polities: number
  chiefdoms: number
  kingdoms: number
  bandits: number
  bands: number
  fortsDone: number
  fortsOpen: number
  inventions: number
  tradeRuns: number
  shrines: number
  markets: number
  wallsWood: number
  wallsStone: number
}

function emptyPeak(): Peak {
  return {
    pop: 0,
    creeds: 0,
    faith: 0,
    institutions: 0,
    polities: 0,
    chiefdoms: 0,
    kingdoms: 0,
    bandits: 0,
    bands: 0,
    fortsDone: 0,
    fortsOpen: 0,
    inventions: 0,
    tradeRuns: 0,
    shrines: 0,
    markets: 0,
    wallsWood: 0,
    wallsStone: 0,
  }
}

function bumpPeak(p: Peak, key: keyof Peak, n: number) {
  if (n > p[key]) p[key] = n
}

console.log(`Civ emerge audit — seed=${seed} days=${days} ticks=${ticks}\n`)

const state = createSimulation(seed)
const startPop = state.villagers.filter((v) => v.alive).length
const peak = emptyPeak()
const startKnowledge = state.villagers.reduce((a, v) => a + knowledgeCount(v.knowledge), 0)

let religionLog = 0
let inventionLog = 0
let banditLog = 0
let fortLog = 0
let polityLog = 0
let creedHoldersEnd = 0
let lastLog = 0

for (let t = 1; t <= ticks; t++) {
  stepSimulation(state)

  if (t % TICKS_PER_DAY === 0) {
    for (let i = lastLog; i < state.log.length; i++) {
      const line = state.log[i]!
      const low = line.toLowerCase()
      if (isReligionChronicleLine(line)) religionLog++
      if (/découvert|enseigne|invention|savoir/.test(low)) inventionLog++
      if (/bandit|brigand|hors-la-loi|maquis|razzia/.test(low)) banditLog++
      if (/fortif|enceinte|rempart|donjon|château|forteresse/.test(low)) fortLog++
      if (/chefferie|royaume|souverain|prétention|succède|chef /.test(low)) polityLog++
    }
    lastLog = state.log.length

    const s = computeStats(state)
    let creeds = 0
    let invent = 0
    for (const v of state.villagers) {
      if (!v.alive) continue
      if (politicsOf(v).creed) creeds++
      invent += knowledgeCount(v.knowledge)
    }
    const faith = state.circles.filter((c) => c.kind === 'faith').length
    const inst = state.circles.filter((c) => c.isInstitution).length
    const chiefdoms = state.polities.filter((p) => p.tier === 'chiefdom').length
    const kingdoms = state.polities.filter((p) => p.tier === 'kingdom').length
    const fortsDone = state.projects.filter(
      (p) => p.phase === 'done' && p.intent.purposes.includes('fortify'),
    ).length
    const fortsOpen = state.projects.filter(
      (p) => p.phase !== 'done' && p.intent.purposes.includes('fortify'),
    ).length
    const shrines = state.villages.filter((vg) => vg.hasShrine).length
    const markets = state.villages.filter((vg) => vg.hasMarket).length
    const wood = state.villages.filter((vg) => vg.wallTier === 'wood').length
    const stone = state.villages.filter((vg) => vg.wallTier === 'stone').length
    const bandits = state.bandits.filter((b) => b.alive).length

    bumpPeak(peak, 'pop', s.villagers)
    bumpPeak(peak, 'creeds', creeds)
    bumpPeak(peak, 'faith', faith)
    bumpPeak(peak, 'institutions', inst)
    bumpPeak(peak, 'polities', state.polities.length)
    bumpPeak(peak, 'chiefdoms', chiefdoms)
    bumpPeak(peak, 'kingdoms', kingdoms)
    bumpPeak(peak, 'bandits', bandits)
    bumpPeak(peak, 'bands', state.bands.length)
    bumpPeak(peak, 'fortsDone', fortsDone)
    bumpPeak(peak, 'fortsOpen', fortsOpen)
    bumpPeak(peak, 'inventions', invent)
    bumpPeak(peak, 'tradeRuns', s.tradeRunsTotal)
    bumpPeak(peak, 'shrines', shrines)
    bumpPeak(peak, 'markets', markets)
    bumpPeak(peak, 'wallsWood', wood)
    bumpPeak(peak, 'wallsStone', stone)

    const day = t / TICKS_PER_DAY
    if (day % 15 === 0 || day === days) {
      console.log(
        `day ${day} | pop ${s.villagers} (+${s.villagers - startPop}) | ` +
          `creeds ${creeds} faith ${faith} shrines ${shrines} | ` +
          `inst ${inst} polities ${state.polities.length} (chief ${chiefdoms}/king ${kingdoms}) | ` +
          `bands ${state.bands.length} bandits ${bandits} | ` +
          `forts ${fortsDone}/${fortsOpen} walls w${wood}/s${stone} | ` +
          `know ${invent} trades ${s.tradeRunsTotal} markets ${markets}`,
      )
    }
  }
}

const s = computeStats(state)
const creedBy: Record<string, number> = {}
for (const v of state.villagers) {
  if (!v.alive) continue
  const c = politicsOf(v).creed
  if (c) {
    creedHoldersEnd++
    creedBy[c] = (creedBy[c] ?? 0) + 1
  }
}
const endKnowledge = state.villagers.reduce((a, v) => a + knowledgeCount(v.knowledge), 0)
const fortsDone = state.projects.filter(
  (p) => p.phase === 'done' && p.intent.purposes.includes('fortify'),
).length

console.log('\n=== SUMMARY ===')
console.log(
  JSON.stringify(
    {
      seed,
      days,
      pop: { start: startPop, end: s.villagers, peak: peak.pop, births: s.births, deaths: s.deaths },
      religions: {
        creedHoldersPeak: peak.creeds,
        creedHoldersEnd,
        byId: creedBy,
        labels: Object.keys(creedBy).map((k) => creedLabel(k as never)),
        faithCirclesPeak: peak.faith,
        shrinesPeak: peak.shrines,
        religionLog,
      },
      polities: {
        peak: peak.polities,
        end: state.polities.length,
        chiefdomsPeak: peak.chiefdoms,
        kingdomsPeak: peak.kingdoms,
        institutionsPeak: peak.institutions,
        polityLog,
        rows: state.polities.map((p) => `${p.tier}:${p.name}`),
      },
      bandits: { peakBandits: peak.bandits, peakBands: peak.bands, end: s.bandits, bands: s.bands, log: banditLog },
      forts: {
        done: fortsDone,
        peakDone: peak.fortsDone,
        wallsWood: peak.wallsWood,
        wallsStone: peak.wallsStone,
        fortLog,
      },
      inventions: { startBits: startKnowledge, endBits: endKnowledge, peak: peak.inventions, log: inventionLog },
      trade: { completions: s.tradeRunsTotal, peak: peak.tradeRuns, markets: peak.markets },
    },
    null,
    2,
  ),
)
