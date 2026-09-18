/**
 * Tech / experiment / invention probe.
 *   npx tsx scripts/_probe_tech.ts [seed=1] [days=45]
 */
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { experimentUrge } from '../src/lib/sim/technology'
import { countOf } from '../src/lib/sim/inventory'

const seed = Number(process.argv[2] ?? 1)
const DAYS = Number(process.argv[3] ?? 45)
const state = createSimulation(seed)

let experimentChosen = 0
let experimentActive = 0
let urgeEligible = 0
let urgeSamples = 0
const inventLines: string[] = []
const teachLines: string[] = []
const diffuseLines: string[] = []
let lastLog = 0

for (let t = 0; t < DAYS * TICKS_PER_DAY; t++) {
  stepSimulation(state)
  if (t % 60 === 0) {
    for (const v of state.villagers) {
      if (!v.alive) continue
      urgeSamples++
      const u = experimentUrge(v, state)
      if (u > 20) urgeEligible++
    }
  }
  for (const v of state.villagers) {
    if (!v.alive) continue
    if (v.task?.kind === 'experiment') {
      experimentActive++
      if (v.task.ageTicks === 0) experimentChosen++
    }
  }
  if (state.log.length > lastLog) {
    for (let i = lastLog; i < state.log.length; i++) {
      const line = state.log[i]
      if (/découvert|invente/i.test(line)) inventLines.push(`[${state.tick}] ${line}`)
      else if (/enseigne/i.test(line)) teachLines.push(`[${state.tick}] ${line}`)
      else if (/savoir/i.test(line)) diffuseLines.push(`[${state.tick}] ${line}`)
    }
    lastLog = state.log.length
  }
}

const bits = new Map()
const vgBits = new Map()
let withWB = 0
const toolTiers = { none: 0, wood: 0, stone: 0, iron: 0 }
const wall = {}
let ageOk = 0
let hungerOk = 0
let stamOk = 0
let matsOk = 0
let wbOk = 0

for (const v of state.villagers) {
  if (!v.alive) continue
  if (v.hasWorkbench) {
    withWB++
    wbOk++
  }
  toolTiers[v.toolTier] = (toolTiers[v.toolTier] ?? 0) + 1
  if (v.age >= 35) ageOk++
  if (v.hunger >= 1.5) hungerOk++
  if (v.stamina >= 1.2) stamOk++
  if (countOf(v.inventory, 'wood') >= 1 || countOf(v.inventory, 'stone') >= 1) matsOk++
  for (const k of v.knowledge ?? []) bits.set(k.id, (bits.get(k.id) ?? 0) + 1)
}
for (const vg of state.villages) {
  wall[vg.wallTier] = (wall[vg.wallTier] ?? 0) + 1
  for (const k of vg.knowledge ?? []) vgBits.set(k.id, (vgBits.get(k.id) ?? 0) + 1)
}

console.log(
  JSON.stringify(
    {
      days: DAYS,
      alive: state.villagers.filter((v) => v.alive).length,
      deaths: state.deaths,
      experimentChosen,
      experimentActiveTicks: experimentActive,
      urgeEligiblePct: urgeSamples ? +((100 * urgeEligible) / urgeSamples).toFixed(2) : 0,
      inventCount: inventLines.length,
      inventSample: inventLines.slice(0, 20),
      teachCount: teachLines.length,
      teachSample: teachLines.slice(0, 8),
      diffuseCount: diffuseLines.length,
      withWB,
      toolTiers,
      wall,
      endGates: { ageOk, hungerOk, stamOk, matsOk, wbOk },
      villagerKnowledge: Object.fromEntries(bits),
      villageKnowledge: Object.fromEntries(vgBits),
      projects: state.projects.map((p) => ({
        label: p.label,
        phase: p.phase,
        purposes: p.intent.purposes,
      })),
    },
    null,
    2,
  ),
)
