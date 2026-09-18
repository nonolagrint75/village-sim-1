/**
 * Headless systems audit — run: npx tsx _systems_audit.ts [seed] [days]
 */
import { createSimulation, stepSimulation, computeStats } from './src/lib/sim/engine'
import { TICKS_PER_DAY } from './src/lib/sim/calendar'
import { PATH, ROAD, TRAIL } from './src/lib/sim/types'
import { mindOf } from './src/lib/sim/cognition'
import { ensureLivelihood } from './src/lib/sim/livelihood'

const seed = Number(process.argv[2] ?? 1)
const days = Number(process.argv[3] ?? 240)
const ticks = days * TICKS_PER_DAY

type Counters = {
  taskSeen: Record<string, number>
  taskChosenPeak: Record<string, number>
  embarkedTicks: number
  embarkedPeak: number
  fightEngageTicks: number
  romanceMarriages: number
  arrangedMarriages: number
  wealthMarriages: number
  guildFormed: number
  institutionFormed: number
  boatBuilt: number
  portBuilt: number
  bridgeBuilt: number
  roadPathLog: number
  wolfKillVillager: number
  wolfKillCombatant: number
  wolfRescue: number
  wolfPackBreach: number
  chronicleHits: Record<string, number>
  peakWolves: number
  peakTradeRuns: number
  peakCraftCircles: number
  peakGuilds: number
  peakPath: number
  peakRoad: number
  peakBoats: number
}

function empty(): Counters {
  return {
    taskSeen: {},
    taskChosenPeak: {},
    embarkedTicks: 0,
    embarkedPeak: 0,
    fightEngageTicks: 0,
    romanceMarriages: 0,
    arrangedMarriages: 0,
    wealthMarriages: 0,
    guildFormed: 0,
    institutionFormed: 0,
    boatBuilt: 0,
    portBuilt: 0,
    bridgeBuilt: 0,
    roadPathLog: 0,
    wolfKillVillager: 0,
    wolfKillCombatant: 0,
    wolfRescue: 0,
    wolfPackBreach: 0,
    chronicleHits: {},
    peakWolves: 0,
    peakTradeRuns: 0,
    peakCraftCircles: 0,
    peakGuilds: 0,
    peakPath: 0,
    peakRoad: 0,
    peakBoats: 0,
  }
}

function bump(map: Record<string, number>, key: string, n = 1) {
  map[key] = (map[key] ?? 0) + n
}

function scanLog(c: Counters, lines: string[], from: number) {
  for (let i = from; i < lines.length; i++) {
    const t = lines[i]
    const low = t.toLowerCase()
    if (/guilde/.test(low) && /se forme|naissance/.test(low)) {
      c.guildFormed++
      bump(c.chronicleHits, 'guild')
    }
    if (/devient une institution/.test(low)) {
      c.institutionFormed++
      bump(c.chronicleHits, 'institution')
    }
    if (/mis à l'eau|barque|chaland/.test(low)) {
      c.boatBuilt++
      bump(c.chronicleHits, 'boat')
    }
    if (/achevé le port|premier port/.test(low)) {
      c.portBuilt++
      bump(c.chronicleHits, 'port')
    }
    if (/pont|passerelle/.test(low) && /achevé|construit|pose/.test(low)) {
      c.bridgeBuilt++
      bump(c.chronicleHits, 'bridge')
    }
    if (/sentier|chemin|route/.test(low)) {
      c.roadPathLog++
      bump(c.chronicleHits, 'road_log')
    }
    if (/tué par un loup/.test(low)) {
      c.wolfKillVillager++
      bump(c.chronicleHits, 'wolf_prey')
    }
    if (/tombé face à un loup/.test(low)) {
      c.wolfKillCombatant++
      bump(c.chronicleHits, 'wolf_fight_death')
    }
    if (/a sauvé .+ d'un loup/.test(low)) {
      c.wolfRescue++
      bump(c.chronicleHits, 'wolf_rescue')
    }
    if (/loups ont enfoncé/.test(low)) {
      c.wolfPackBreach++
      bump(c.chronicleHits, 'wall_breach')
    }
    if (/unissent|mariage|épous/.test(low)) bump(c.chronicleHits, 'marriage_log')
    if (/par amour/.test(low)) bump(c.chronicleHits, 'romance_log')
  }
}

function used(n: number, soft = 1): 'USED' | 'RARE' | 'UNUSED' {
  if (n >= soft * 5) return 'USED'
  if (n > 0) return 'RARE'
  return 'UNUSED'
}

console.log(`Systems audit — seed=${seed} days=${days} ticks=${ticks}\n`)

const state = createSimulation(seed)
const c = empty()
let lastLog = 0
const sampleEvery = 3

for (let t = 1; t <= ticks; t++) {
  stepSimulation(state)

  if (t % sampleEvery === 0) {
    let embarked = 0
    let fighting = 0
    const kinds: Record<string, number> = {}
    for (const v of state.villagers) {
      if (!v.alive) continue
      if (v.embarked) embarked++
      const k = v.task?.kind
      if (k) {
        bump(kinds, k)
        bump(c.taskSeen, k)
        if (k === 'fight') fighting++
      }
    }
    c.embarkedTicks += embarked
    if (embarked > c.embarkedPeak) c.embarkedPeak = embarked
    c.fightEngageTicks += fighting
    for (const [k, n] of Object.entries(kinds)) {
      if (n > (c.taskChosenPeak[k] ?? 0)) c.taskChosenPeak[k] = n
    }
  }

  if (t % TICKS_PER_DAY === 0) {
    scanLog(c, state.log, lastLog)
    lastLog = state.log.length
    let rom = 0, arr = 0, wea = 0
    for (const v of state.villagers) {
      if (!v.alive || v.spouseId === null) continue
      if (v.id > v.spouseId) continue
      if (v.marriageKind === 'romance') rom++
      else if (v.marriageKind === 'arranged') arr++
      else if (v.marriageKind === 'wealth') wea++
    }
    c.romanceMarriages = Math.max(c.romanceMarriages, rom)
    c.arrangedMarriages = Math.max(c.arrangedMarriages, arr)
    c.wealthMarriages = Math.max(c.wealthMarriages, wea)

    const s = computeStats(state)
    c.peakWolves = Math.max(c.peakWolves, s.wolves)
    c.peakTradeRuns = Math.max(c.peakTradeRuns, s.tradeRunsTotal)
    c.peakBoats = Math.max(c.peakBoats, s.boats)
    const craft = state.circles.filter((x) => x.kind === 'craft' || x.kind === 'trade').length
    const guilds = state.circles.filter((x) => x.isGuild).length
    c.peakCraftCircles = Math.max(c.peakCraftCircles, craft)
    c.peakGuilds = Math.max(c.peakGuilds, guilds)
    let pathN = 0, roadN = 0
    for (let i = 0; i < state.grid.terrain.length; i++) {
      const ter = state.grid.terrain[i]
      if (ter === PATH) pathN++
      else if (ter === ROAD) roadN++
    }
    c.peakPath = Math.max(c.peakPath, pathN)
    c.peakRoad = Math.max(c.peakRoad, roadN)

    if ((t / TICKS_PER_DAY) % 30 === 0) {
      console.log(
        `day ${t / TICKS_PER_DAY} | pop ${s.villagers} villages ${s.villages} | ` +
          `boats ${s.boats} ports ${s.ports} trades ${s.tradeRunsTotal} roads ${s.roadTiles} bridges ${s.bridges} | ` +
          `circles ${state.circles.length} guilds ${guilds} craft ${craft} | ` +
          `marriages R/A/W ${rom}/${arr}/${wea} | wolves ${s.wolves}`,
      )
    }
  }
}

scanLog(c, state.log, lastLog)
const s = computeStats(state)
const guilds = state.circles.filter((x) => x.isGuild)
const craftCircles = state.circles.filter((x) => x.kind === 'craft' || x.kind === 'trade')
const titles: Record<string, number> = {}
let embarkedNow = 0
let withBoat = 0
for (const v of state.villagers) {
  if (!v.alive) continue
  if (v.embarked) embarkedNow++
  if (v.boatId !== null) withBoat++
  bump(titles, ensureLivelihood(mindOf(v)).titleFr || 'sans métier clair')
}

let trail = 0, path = 0, road = 0
for (let i = 0; i < state.grid.terrain.length; i++) {
  const ter = state.grid.terrain[i]
  if (ter === TRAIL) trail++
  else if (ter === PATH) path++
  else if (ter === ROAD) road++
}

const interest = [
  'socialise','giveFood','entertain','counsel','teachCraft','confront','steal',
  'fight','flee','defend','tradeRun','buildBoat','buildPort','buildBridge','buildCart','fish','experiment',
]

console.log('\n=== TASK KIND SAMPLES ===')
for (const k of interest) {
  const n = c.taskSeen[k] ?? 0
  console.log(`  ${k.padEnd(14)} ${String(n).padStart(8)}  peak=${c.taskChosenPeak[k] ?? 0}  ${used(n)}`)
}

console.log('\n=== STATE END / PEAKS ===')
console.log(`pop=${s.villagers} villages=${s.villages} births=${s.births} deaths=${s.deaths} year=${s.year}`)
console.log(`boats end=${s.boats} peak=${c.peakBoats} owners=${withBoat} embarkedPeak=${c.embarkedPeak}`)
console.log(`ports=${s.ports} tradeRuns end=${s.tradeRunsTotal} peak=${c.peakTradeRuns} bridges=${s.bridges}`)
console.log(`trail=${trail} path=${path} (peak ${c.peakPath}) road=${road} (peak ${c.peakRoad})`)
console.log(`circles=${state.circles.length} craft peak=${c.peakCraftCircles} end=${craftCircles.length} guilds peak=${c.peakGuilds} end=${guilds.length}`)
if (guilds.length) console.log('  guilds:', guilds.map((g) => g.name).join(' | '))
console.log(`marriages peak R/A/W=${c.romanceMarriages}/${c.arrangedMarriages}/${c.wealthMarriages}`)
console.log(`wolves peak=${c.peakWolves} end=${s.wolves} fightEngageTicks=${c.fightEngageTicks}`)

console.log('\n=== CHRONICLE ===')
for (const [k, n] of Object.entries(c.chronicleHits).sort((a, b) => b[1] - a[1])) console.log(`  ${k}: ${n}`)

console.log('\n=== LIVELIHOOD TITLES ===')
const titleEntries = Object.entries(titles).sort((a, b) => b[1] - a[1])
for (const [t, n] of titleEntries.slice(0, 15)) console.log(`  ${t}: ${n}`)

console.log('\n=== EVIDENCE TABLE ===')
const rows: [string, string, string][] = [
  ['socialise', used(c.taskSeen.socialise ?? 0), `samples=${c.taskSeen.socialise ?? 0}`],
  ['romance', used(c.romanceMarriages + (c.chronicleHits.romance_log ?? 0), 1), `peakBonds=${c.romanceMarriages} log=${c.chronicleHits.romance_log ?? 0}`],
  ['guild formation', used(c.peakGuilds + c.guildFormed + c.peakCraftCircles, 1), `peakGuilds=${c.peakGuilds} craftPeak=${c.peakCraftCircles} log=${c.guildFormed}`],
  ['embark/boat', used(c.peakBoats + c.embarkedPeak + (c.taskSeen.buildBoat ?? 0), 1), `boatsPeak=${c.peakBoats} buildBoat=${c.taskSeen.buildBoat ?? 0} embarkedPeak=${c.embarkedPeak}`],
  ['tradeRun', used(c.peakTradeRuns + (c.taskSeen.tradeRun ?? 0), 1), `peakCompleted=${c.peakTradeRuns} samples=${c.taskSeen.tradeRun ?? 0}`],
  ['road building', used(c.peakPath + c.peakRoad + trail, 5), `trail=${trail} pathPeak=${c.peakPath} roadPeak=${c.peakRoad}`],
  ['wolf fights', used(c.fightEngageTicks + (c.taskSeen.fight ?? 0) + c.wolfRescue + c.wolfKillCombatant + (c.taskSeen.flee ?? 0), 1), `fight=${c.taskSeen.fight ?? 0} flee=${c.taskSeen.flee ?? 0} wolvesPeak=${c.peakWolves} rescues=${c.wolfRescue}`],
  ['livelihood titles', used(titleEntries.filter(([t]) => t !== 'sans métier clair').length, 1), titleEntries.slice(0, 6).map(([t, n]) => `${t}:${n}`).join(', ')],
  ['politics circles', used(state.circles.length + c.peakCraftCircles, 1), `end=${state.circles.length} craftPeak=${c.peakCraftCircles}`],
]
for (const [sys, status, evid] of rows) console.log(`${status.padEnd(7)} | ${sys.padEnd(20)} | ${evid}`)
