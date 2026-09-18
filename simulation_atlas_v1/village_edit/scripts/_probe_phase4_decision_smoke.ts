/**
 * CP1 smoke — exact decision ledger (>0), not PROXY.
 * Natural path only. No CREATE_*, no induce.
 *
 *   npx tsx scripts/_probe_phase4_decision_smoke.ts [days=5] [seed=1]
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import {
  decisionExactCoveragePct,
  snapshotDecisionExact,
} from '../src/lib/sim/decisionLedger'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const days = Math.min(5, Math.max(1, Number(process.argv[2] ?? 5)))
const seed = Number(process.argv[3] ?? 1)

const CONFIG = {
  initialVillagers: 100,
  maxPopulation: 250,
  preset: 'standard' as const,
  worldSize: 1000 as const,
  seed,
}

console.log('=== PHASE 4 CP1 DECISION EXACT SMOKE ===')
console.log(`days=${days} seed=${seed} (natural; no induce)`)

const t0 = Date.now()
let state = createSimulation(seed, CONFIG)
const ticks = days * TICKS_PER_DAY
for (let i = 0; i < ticks; i++) {
  state = stepSimulation(state)
}

const snap = snapshotDecisionExact(state)
const coveragePct = decisionExactCoveragePct(state)
const elapsedMs = Date.now() - t0

const dump = {
  phase: 4,
  cp: 'CP1',
  induced: false,
  seed,
  days,
  ticks,
  elapsedMs,
  decisionExactTotal: snap.decisionExactTotal,
  decisionExactBySource: snap.decisionExactBySource,
  decisionSetTaskAssigns: snap.decisionSetTaskAssigns,
  decisionNoteChosenActions: snap.decisionNoteChosenActions,
  decisionOrphanSetTask: snap.decisionOrphanSetTask,
  coveragePctNoteChosenVsSetTask: coveragePct,
  sampleRingLen: snap.sampleRing.length,
  sampleRingTail: snap.sampleRing.slice(-5),
  residual:
    'Orphan setTask (no noteChosenAction): night home-rest retarget; any future setTask without note. Reprise paths call noteChosenAction without setTask (counted as exact other/HARD).',
  passSmoke: snap.decisionExactTotal > 0,
}

const outPath = path.join(ROOT, `_phase4_decision_smoke_s${seed}.json`)
fs.writeFileSync(outPath, JSON.stringify(dump, null, 2), 'utf8')

console.log(JSON.stringify(dump, null, 2))
console.log(`\nSMOKE ${dump.passSmoke ? 'OK' : 'FAIL'} decisionExactTotal=${dump.decisionExactTotal} -> ${outPath}`)
if (!dump.passSmoke) process.exitCode = 1
