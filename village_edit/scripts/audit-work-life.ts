/**
 * Headless work-life plausibility audit.
 *
 * Samples random villagers across seasons and flags impossible livelihoods:
 * farm in sterile climate, mine without tools, craft without bench, etc.
 *
 *   npx tsx scripts/audit-work-life.ts [seed] [days] [sampleN]
 */
import { hourOfDay, seasonFromTick, TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { cropTempFactor, sampleTempC } from '../src/lib/sim/climate'
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { mindOf } from '../src/lib/sim/cognition/mindPool'
import { canMineRock, localOreRichness } from '../src/lib/sim/mining'
import { livelihoodLabelForUi } from '../src/lib/sim/livelihood'
import type { SimState, Villager } from '../src/lib/sim/types'

const seed = Number(process.argv[2] ?? 7)
const days = Number(process.argv[3] ?? 90)
const sampleN = Number(process.argv[4] ?? 8)
const ticks = days * TICKS_PER_DAY
const SAMPLE_EVERY = TICKS_PER_DAY

type Flags = {
  farmCold: number
  mineNoTool: number
  craftNoBench: number
  sowWinter: number
  minerNoOre: number
  benchCraftOk: number
  mineOk: number
  farmOk: number
  woodcut: number
}

function pickSample(state: SimState, n: number): Villager[] {
  const alive = state.villagers.filter((v) => v.alive && v.age > 100)
  const out: Villager[] = []
  for (let i = 0; i < alive.length && out.length < n; i++) {
    if ((i * 17 + state.tick) % Math.max(1, Math.floor(alive.length / n)) === 0 || out.length < n) {
      const v = alive[(i * 13 + state.tick) % alive.length]!
      if (!out.some((o) => o.id === v.id)) out.push(v)
    }
  }
  while (out.length < Math.min(n, alive.length)) {
    const v = alive[out.length]!
    if (!out.some((o) => o.id === v.id)) out.push(v)
    else break
  }
  return out
}

function isCraft(kind: string): boolean {
  return (
    kind.startsWith('craft') ||
    kind === 'weaveCloth' ||
    kind === 'sewClothing' ||
    kind === 'tanHide' ||
    kind === 'makeCharcoal' ||
    kind === 'bakeBread' ||
    kind === 'mintCoins'
  )
}

const flags: Flags = {
  farmCold: 0,
  mineNoTool: 0,
  craftNoBench: 0,
  sowWinter: 0,
  minerNoOre: 0,
  benchCraftOk: 0,
  mineOk: 0,
  farmOk: 0,
  woodcut: 0,
}

const snapshots: string[] = []
const state = createSimulation(seed)
console.log(`Work-life audit — seed=${seed}, ${days} days, sample=${sampleN}\n`)

for (let t = 1; t <= ticks; t++) {
  stepSimulation(state)
  if (t % SAMPLE_EVERY !== 0) continue
  const season = seasonFromTick(state.tick)
  const sample = pickSample(state, sampleN)
  for (const v of sample) {
    const task = v.task?.kind ?? 'idle'
    const airT = sampleTempC(state.climate, v.x, v.y)
    const farmMul = cropTempFactor(airT)
    const title = livelihoodLabelForUi(v)
    const ore = localOreRichness(state.grid, v.x, v.y, 24)

    if (v.profession === 'farmer' && farmMul < 0.22) flags.farmCold++
    if (task === 'mineTunnel' && !canMineRock(v.toolTier)) flags.mineNoTool++
    if (task === 'mineTunnel' && canMineRock(v.toolTier)) flags.mineOk++
    if (isCraft(task) && task !== 'craftSpear' && !v.hasWorkbench) flags.craftNoBench++
    if (isCraft(task) && v.hasWorkbench) flags.benchCraftOk++
    if (task === 'sowField' && (season === 'winter' || farmMul < 0.2)) flags.sowWinter++
    if (v.profession === 'miner' && ore < 4) flags.minerNoOre++
    if ((task === 'sowField' || task === 'harvestWheat') && farmMul >= 0.25) flags.farmOk++
    if (task === 'gatherWood') flags.woodcut++

    if (snapshots.length < 24 && (task === 'mineTunnel' || task === 'sowField' || task === 'craftIronTool' || task === 'gatherWood' || task === 'craftGoods')) {
      snapshots.push(
        `d${Math.floor(t / TICKS_PER_DAY)} ${season} h${hourOfDay(state.tick)} ${v.name} [${title}/${v.profession}] ` +
          `${task} tool=${v.toolTier} bench=${v.hasWorkbench ? 'y' : 'n'} T=${airT.toFixed(1)} farmMul=${farmMul.toFixed(2)} ore=${ore.toFixed(0)}`,
      )
    }
  }
}

const alive = state.villagers.filter((v) => v.alive)
const byProf: Record<string, number> = {}
const coldFarmers: string[] = []
for (const v of alive) {
  byProf[v.profession] = (byProf[v.profession] ?? 0) + 1
  const mul = cropTempFactor(sampleTempC(state.climate, v.x, v.y))
  if (v.profession === 'farmer' && mul < 0.22) {
    coldFarmers.push(`${v.name}@${mul.toFixed(2)}`)
  }
}

console.log('=== Profession mix (end) ===')
console.log(Object.entries(byProf).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}:${n}`).join('  '))
console.log(`\nCold-locked farmers (farmMul<0.22): ${coldFarmers.length}${coldFarmers.length ? ' — ' + coldFarmers.slice(0, 6).join(', ') : ''}`)

console.log('\n=== Plausibility counters (sampled) ===')
console.log(JSON.stringify(flags, null, 2))

console.log('\n=== Sample work moments ===')
for (const s of snapshots) console.log(s)

const fail =
  flags.mineNoTool > 0 ||
  flags.craftNoBench > 0 ||
  flags.sowWinter > 0 ||
  coldFarmers.length > Math.max(1, Math.floor(alive.length * 0.08))

console.log(fail ? '\nRESULT: FAIL — still seeing impossible work' : '\nRESULT: PASS — livelihoods look grounded')
process.exit(fail ? 1 : 0)
