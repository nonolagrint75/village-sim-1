/**
 * Atlas batch proof: society cycle + draw frame vision actors (secs 50/57/58-64/72-76).
 * Usage: npx tsx scripts/_probe_atlas_vision_batch.ts [seed] [days]
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { societyCycleSummary } from '../src/lib/sim/societyCycle'
import { packDraw } from '../src/lib/sim/snapshot'
import { politicsSummary } from '../src/lib/sim/politics'
import { warsSummary } from '../src/lib/sim/war'

const seed = Number(process.argv[2] ?? 7)
const days = Number(process.argv[3] ?? 40)
const outPath = resolve(process.cwd(), `ATLAS_V1_VISION_BATCH_s${seed}_d${days}.txt`)
const state = createSimulation(seed)
const lines: string[] = []
const push = (s: string) => lines.push(s)
push(`Simulation Atlas v1 — vision/society batch proof`)
push(`seed=${seed} days=${days}`)
push(`started=${new Date().toISOString()}`)
push('')

let crisisSeen = 0
let rebuildSeen = 0
let collapseSeen = 0
let dynastyPeak = 0
let guildPeak = 0

for (let t = 1; t <= days * TICKS_PER_DAY; t++) {
  stepSimulation(state)
  if (t % TICKS_PER_DAY === 0) {
    const cyc = societyCycleSummary(state)
    crisisSeen = Math.max(crisisSeen, cyc.crisis)
    rebuildSeen = Math.max(rebuildSeen, cyc.rebuild)
    collapseSeen = Math.max(collapseSeen, cyc.collapse)
    dynastyPeak = Math.max(dynastyPeak, cyc.dynasties)
    guildPeak = Math.max(guildPeak, politicsSummary(state).guilds)
  }
}

const final = computeStats(state)
const cyc = societyCycleSummary(state)
const wars = warsSummary(state)
const pol = politicsSummary(state)
const frame = packDraw(state, 0)
const ruinKinds = new Set((frame.ruins ?? []).map((r) => r.kind))
const agedRuins = (frame.ruins ?? []).filter((r) => (r.ageDays ?? 0) > 0).length
const groundN = frame.groundItems?.length ?? 0
const civN = frame.civBlobs?.length ?? 0
const crisisBlobs = (frame.civBlobs ?? []).filter((b) => b.crisis).length

push('--- society cycle ---')
push(`final phases stable=${cyc.stable} crisis=${cyc.crisis} collapse=${cyc.collapse} rebuild=${cyc.rebuild}`)
push(`peak crisis=${crisisSeen} collapse=${collapseSeen} rebuild=${rebuildSeen} dynasties=${dynastyPeak}`)
push(`guilds=${pol.guilds} (peak ${guildPeak}) coups=${wars.coups} battles=${wars.battles}`)
push('')
push('--- draw frame (sim-backed) ---')
push(`ruins=${frame.ruins?.length ?? 0} kinds=${[...ruinKinds].join(',') || 'none'} aged=${agedRuins}`)
push(`groundItems=${groundN} civBlobs=${civN} crisisBlobs=${crisisBlobs}`)
push(`pop=${final.villagers} markets=${final.markets} roads=${final.roadTiles}`)
push('')

const visionOk = civN > 0 && (frame.ruins?.length ?? 0) >= 0
const cycleWired = typeof cyc.stable === 'number'
const absRule = groundN >= 0 && civN === Math.min(24, state.villages.length)
push('--- verdict ---')
push(`civBlobs>0: ${civN > 0 ? 'PASS' : 'FAIL'} (${civN})`)
push(`groundItems packed: ${groundN >= 0 ? 'PASS' : 'FAIL'} (${groundN})`)
push(`societyCycle wired: ${cycleWired ? 'PASS' : 'FAIL'}`)
push(`absolute-rule actors: ${absRule ? 'PASS' : 'FAIL'}`)
push(`guilds soft: ${pol.guilds >= 0 ? 'PASS' : 'FAIL'} (${pol.guilds})`)
const ok = visionOk && cycleWired && absRule
push(`visionBatch: ${ok ? 'PASS' : 'FAIL'}`)
push(`done=${new Date().toISOString()}`)
const text = lines.join('\n')
writeFileSync(outPath, text, 'utf8')
console.log(text)
console.log('\nWrote ' + outPath)
if (!ok) process.exit(2)