/**
 * Society / politics / culture / religion probe — emergent only (no CREATE_X).
 * WP10: dumps §§34–37 instrumentation; harness honesty wrap (ACCEPTANCE PENDING).
 *   npx tsx scripts/_probe_society.ts [seed=7] [days=50]
 */
import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { mindOf } from '../src/lib/sim/cognition'
import {
  creedLabel,
  politicalTaskBias,
  politicsOf,
  type CreedId,
} from '../src/lib/sim/politics'
import { ethnosOf, findLanguage } from '../src/lib/sim/ethnos'
import { BANDIT_CALENDAR_FLOOR_DAY, BANDIT_START_DAY } from '../src/lib/sim/bandits'
import { snapshotSocietyMetrics } from '../src/lib/sim/societyMetrics'
import { adaptSocietyProbe, printAdaptedReport } from './harness/adapters.ts'

const seed = Number(process.argv[2] ?? 7)
const days = Number(process.argv[3] ?? 50)
const ticks = days * TICKS_PER_DAY

const state = createSimulation(seed)
let lastLog = 0
const creedHist: Record<string, number> = {}
let teachStarts = 0
let ritualStarts = 0
let guildLog = 0
let creedLog = 0
let ethnieSeen = 0
let langSeen = 0
let maxLangs = 0
let maxEthnies = 0
const biasSamples: { creed: string; ritual: number; steal: number; trade: number; experiment: number }[] = []

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
      if (/guilde/.test(low) && /se forme|naissance|émerge|devient/.test(low)) guildLog++
      if (/creed|voie de foi|honorer|partage avant|ordre contre|commerce libre|protéger les|vengeance|usages|changer les/.test(low))
        creedLog++
    }
    lastLog = state.log.length

    maxLangs = Math.max(maxLangs, state.languages.filter((L) => !L.faded).length)
    maxEthnies = Math.max(maxEthnies, (state.ethnies ?? []).filter((e) => !e.faded).length)

    for (const v of state.villagers) {
      if (!v.alive) continue
      const cr = politicsOf(v).creed
      if (cr) creedHist[cr] = (creedHist[cr] ?? 0) + 1
      const eth = ethnosOf(v)
      if (eth.ethnieId !== null) ethnieSeen++
      if (findLanguage(state, eth.languageId)) langSeen++
    }

    const day = t / TICKS_PER_DAY
    if (day === days || day % 10 === 0) {
      const byCreed = new Map<CreedId, (typeof state.villagers)[0]>()
      for (const v of state.villagers) {
        if (!v.alive) continue
        const c = politicsOf(v).creed
        if (c && !byCreed.has(c)) byCreed.set(c, v)
      }
      for (const [c, v] of byCreed) {
        biasSamples.push({
          creed: creedLabel(c),
          ritual: +politicalTaskBias(state, v, 'ritual', null).toFixed(3),
          steal: +politicalTaskBias(state, v, 'steal', null).toFixed(3),
          trade: +politicalTaskBias(state, v, 'tradeRun', null).toFixed(3),
          experiment: +politicalTaskBias(state, v, 'experiment', null).toFixed(3),
        })
      }
      const s = computeStats(state)
      const circles = state.circles.length
      const inst = state.circles.filter((c) => c.isInstitution).length
      const guilds = state.circles.filter((c) => c.isGuild).length
      const faith = state.circles.filter((c) => c.kind === 'faith').length
      const sm = snapshotSocietyMetrics(state)
      console.log(
        `d${day} pop=${s.villagers} circles=${circles} inst=${inst} guilds=${guilds} faith=${faith} ` +
          `polities=${state.polities.length} bands=${s.bands} bandits=${s.bandits} langs=${state.languages.filter((L) => !L.faded).length} ` +
          `creedΔ=${sm.counters.creedChanges} conflicts=${sm.counters.conflictsTotal} causes=${sm.distinctConflictCauses} inst30d=${sm.institutionsAgeGe30d}`,
      )
    }
  }
}

const creedEnd: Record<string, number> = {}
for (const v of state.villagers) {
  if (!v.alive) continue
  const c = politicsOf(v).creed
  if (c) creedEnd[c] = (creedEnd[c] ?? 0) + 1
}

const uniqCreeds = Object.keys(creedEnd).length
const s = computeStats(state)
const societyMetrics = snapshotSocietyMetrics(state)
const out = {
  seed,
  days,
  banditStartDay: BANDIT_START_DAY,
  banditCalendarFloorDay: BANDIT_CALENDAR_FLOOR_DAY,
  banditUnlockNote:
    'Soft start day=40; hard floor day=22; pressure/outcast may unlock between floor and soft start (WP10).',
  pop: s.villagers,
  deaths: s.deaths,
  circles: state.circles.length,
  institutions: state.circles.filter((c) => c.isInstitution).length,
  guilds: state.circles.filter((c) => c.isGuild).length,
  faithCircles: state.circles.filter((c) => c.kind === 'faith').length,
  faithCircleCreeds: state.circles.filter((c) => c.kind === 'faith').map((c) => c.creed),
  polities: state.polities.map((p) => `${p.tier}:${p.name}`),
  creedEnd,
  uniqCreeds,
  creedLog,
  guildLog,
  teachStarts,
  ritualStarts,
  maxLangs,
  maxEthnies,
  ethnieHoldersSampled: ethnieSeen,
  langHoldersSampled: langSeen,
  bands: s.bands,
  bandits: s.bandits,
  thefts: s.thefts,
  origins: state.bands.map((b) => b.origin),
  biasSamples: biasSamples.slice(-12),
  rivals: state.villagers.filter((v) => v.alive && mindOf(v).rivalId !== null).length,
  societyMetrics,
  sec34_37: {
    status: 'ACCEPTANCE_PENDING',
    note: 'Instrumentation LIVE; multi-seed soak thresholds not claimed this pass',
  },
  noCreateX: true,
}

console.log(JSON.stringify(out, null, 2))

const report = adaptSocietyProbe(out)
printAdaptedReport(report)

const wirePass =
  uniqCreeds >= 2 &&
  teachStarts > 0 &&
  state.circles.length >= 4 &&
  state.polities.length >= 1 &&
  (s.bands > 0 || days < BANDIT_CALENDAR_FLOOR_DAY + 5)
console.log(
  wirePass
    ? '\nMECHANISM PASS — emergent society wire (secs 34-37 ACCEPTANCE PENDING; no GLOBAL PASS)'
    : '\nMECHANISM FAIL — monoculture or dead teach/society',
)
process.exit(wirePass ? 0 : 1)
