/**
 * Short multi-seed emergence divergence probe.
 * Run: npx tsx scripts/_probe_emergence_seeds.ts [days=40]
 */
import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { politicsOf, creedLabel } from '../src/lib/sim/politics'
import { mindOf } from '../src/lib/sim/cognition'

const days = Number(process.argv[2] ?? 40)
const seeds = [1, 3, 7]
const ticks = days * TICKS_PER_DAY

type Row = {
  seed: number
  pop: number
  deaths: number
  villages: number
  creeds: string[]
  creedHolders: number
  ambitions: Record<string, number>
  professions: Record<string, number>
  teachStarts: number
  ritualStarts: number
  guilds: number
  faith: number
  institutions: number
  bands: number
  schismLog: number
  migrateLog: number
  guildLog: number
}

function runSeed(seed: number): Row {
  const state = createSimulation(seed)
  let teachStarts = 0
  let ritualStarts = 0
  let lastLog = 0
  let schismLog = 0
  let migrateLog = 0
  let guildLog = 0

  for (let t = 1; t <= ticks; t++) {
    stepSimulation(state)
    if (t % 12 === 0) {
      for (const v of state.villagers) {
        if (!v.alive) continue
        if (v.task?.kind === 'teachCraft' && v.task.ageTicks === 0) teachStarts++
        if (v.task?.kind === 'ritual' && v.task.ageTicks === 0) ritualStarts++
      }
    }
    if (t % TICKS_PER_DAY === 0) {
      for (let i = lastLog; i < state.log.length; i++) {
        const low = state.log[i]!.toLowerCase()
        if (/schisme|se separe|se sépar/.test(low)) schismLog++
        if (/quitte son village|fonde|rejoint le village|quitte le maquis/.test(low)) migrateLog++
        if (/guilde/.test(low)) guildLog++
      }
      lastLog = state.log.length
    }
  }

  const creedSet = new Set<string>()
  let creedHolders = 0
  const ambitions: Record<string, number> = {}
  const professions: Record<string, number> = {}
  for (const v of state.villagers) {
    if (!v.alive) continue
    const cr = politicsOf(v).creed
    if (cr) {
      creedHolders++
      creedSet.add(creedLabel(cr))
    }
    ambitions[v.ambition] = (ambitions[v.ambition] ?? 0) + 1
    professions[v.profession] = (professions[v.profession] ?? 0) + 1
    void mindOf(v)
  }
  const s = computeStats(state)
  return {
    seed,
    pop: s.villagers,
    deaths: s.deaths,
    villages: state.villages.filter((vg) => vg.memberIds.length > 0).length,
    creeds: [...creedSet].sort(),
    creedHolders,
    ambitions,
    professions,
    teachStarts,
    ritualStarts,
    guilds: state.circles.filter((c) => c.isGuild).length,
    faith: state.circles.filter((c) => c.kind === 'faith').length,
    institutions: state.circles.filter((c) => c.isInstitution).length,
    bands: state.bands.length,
    schismLog,
    migrateLog,
    guildLog,
  }
}

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a)
  const B = new Set(b)
  let inter = 0
  for (const x of A) if (B.has(x)) inter++
  const uni = A.size + B.size - inter
  return uni === 0 ? 1 : inter / uni
}

function topKeys(rec: Record<string, number>, n = 4): string {
  return Object.entries(rec)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k, v]) => `${k}:${v}`)
    .join(', ')
}

console.log(`Emergence seed compare — seeds=${seeds.join(',')} days=${days}\n`)
const rows = seeds.map(runSeed)
for (const r of rows) {
  console.log(
    JSON.stringify(
      {
        seed: r.seed,
        pop: r.pop,
        deaths: r.deaths,
        villages: r.villages,
        creeds: r.creeds,
        creedHolders: r.creedHolders,
        teachStarts: r.teachStarts,
        ritualStarts: r.ritualStarts,
        guilds: r.guilds,
        faith: r.faith,
        institutions: r.institutions,
        bands: r.bands,
        schismLog: r.schismLog,
        migrateLog: r.migrateLog,
        guildLog: r.guildLog,
        topAmbitions: topKeys(r.ambitions),
        topProfessions: topKeys(r.professions),
      },
      null,
      0,
    ),
  )
}

const creedPairs = [
  jaccard(rows[0]!.creeds, rows[1]!.creeds),
  jaccard(rows[0]!.creeds, rows[2]!.creeds),
  jaccard(rows[1]!.creeds, rows[2]!.creeds),
]
const teachVar = Math.max(...rows.map((r) => r.teachStarts)) - Math.min(...rows.map((r) => r.teachStarts))
const villageVar = new Set(rows.map((r) => r.villages)).size
const creedUniqs = new Set(rows.flatMap((r) => r.creeds)).size
const summary = {
  creedJaccardMean: +(creedPairs.reduce((a, b) => a + b, 0) / creedPairs.length).toFixed(3),
  uniqueCreedsAcrossSeeds: creedUniqs,
  villageCountSpread: villageVar,
  teachStartsRange: teachVar,
  anyMultiVillage: rows.some((r) => r.villages >= 2),
  anyTeach: rows.some((r) => r.teachStarts > 0),
  anyGuild: rows.some((r) => r.guilds > 0 || r.guildLog > 0),
  divergeNote:
    creedUniqs >= 2 || villageVar > 1 || teachVar > 2
      ? 'SEEDS_DIVERGE'
      : 'LOW_DIVERGENCE',
}
console.log('\nSUMMARY', JSON.stringify(summary, null, 2))
