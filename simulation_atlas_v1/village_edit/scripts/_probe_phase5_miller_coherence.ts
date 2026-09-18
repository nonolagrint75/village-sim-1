/**
 * Phase 5 DP6 smoke - miller vs grind coherence (open-task design).
 * Natural path only. No createProfession miller; no grind gate.
 *
 *   npx tsx scripts/_probe_phase5_miller_coherence.ts [days=12] [seed=7]
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const days = Math.min(20, Math.max(1, Number(process.argv[2] ?? 12)))
const seed = Number(process.argv[3] ?? 7)

const CONFIG = {
  initialVillagers: 100,
  maxPopulation: 250,
  preset: 'standard' as const,
  worldSize: 1000 as const,
  seed,
}

function histInc(h: Record<string, number>, k: string) {
  h[k] = (h[k] || 0) + 1
}

console.log('=== PHASE 5 DP6 MILLER/GRIND COHERENCE SMOKE ===')
console.log('days=' + days + ' seed=' + seed + ' (natural; GRIND_OPEN_TASK; no miller spawn)')

const t0 = Date.now()
let state = createSimulation(seed, CONFIG)
const ticks = days * TICKS_PER_DAY
const grindByProfession: Record<string, number> = {}
let harvestStarts = 0
let grindStarts = 0
let bakeStarts = 0
let millerAlivePeak = 0
const prevTask = new Map<number, string | null>()

for (let i = 0; i < ticks; i++) {
  state = stepSimulation(state)
  let millersAlive = 0
  for (const v of state.villagers) {
    if (!v.alive) continue
    if (v.profession === 'miller') millersAlive++
    const kind = v.task?.kind ?? null
    const prev = prevTask.get(v.id) ?? null
    if (kind && kind !== prev) {
      if (kind === 'harvestWheat') harvestStarts++
      else if (kind === 'grindFlour') {
        grindStarts++
        histInc(grindByProfession, v.profession || 'none')
      } else if (kind === 'bakeBread') bakeStarts++
    }
    prevTask.set(v.id, kind)
  }
  if (millersAlive > millerAlivePeak) millerAlivePeak = millersAlive
}

let millersEnd = 0
let nonFarmFields = 0
for (const v of state.villagers) {
  if (!v.alive) continue
  if (v.profession === 'miller') millersEnd++
  if (v.fieldX >= 0) {
    const p = v.profession || 'none'
    if (p !== 'farmer' && p !== 'miller') nonFarmFields++
  }
}

const millerGrind = grindByProfession.miller || 0
const nonMillerGrind = grindStarts - millerGrind
const grindLabel = 'GRIND_OPEN_TASK' as const
const elapsedMs = Date.now() - t0

const dump = {
  phase: 5,
  dp: 'DP6',
  induced: false,
  seed,
  days,
  ticks,
  elapsedMs,
  grindLabel,
  harvestStarts,
  grindStarts,
  bakeStarts,
  grindByProfession,
  millerAlivePeak,
  millerPeakAlive: millerAlivePeak,
  millersEnd,
  nonFarmFields,
  foodChainLive: harvestStarts > 0 && grindStarts > 0 && bakeStarts > 0,
  design: {
    grindOpenTask: true,
    millerProfessionOptional: true,
    forceSpawnMiller: false,
    status: 'WONTFIX_DESIGN',
  },
  acceptance: 'DESIGN_DOCUMENTED',
  note:
    'grindFlour is an open task (no profession===miller gate); farmer jobBonus 2.15x; millerAlivePeak=0 expected; never PASS from millerPeak',
}

const outPath = path.join(ROOT, '_phase5_miller_coherence_smoke_s' + seed + '.json')
fs.writeFileSync(outPath, JSON.stringify(dump, null, 2), 'utf8')

console.log(
  JSON.stringify(
    {
      grindLabel: dump.grindLabel,
      harvestStarts,
      grindStarts,
      bakeStarts,
      grindByProfession,
      millerAlivePeak,
      millersEnd,
      nonFarmFields,
      foodChainLive: dump.foodChainLive,
      nonMillerGrind,
      acceptance: dump.acceptance,
    },
    null,
    2,
  ),
)
console.log('\nSMOKE (DESIGN_DOCUMENTED) -> ' + outPath)
