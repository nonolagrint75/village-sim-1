/**
 * Early wolf wipe probe — deathsByWolf over founding weeks.
 *   npx tsx scripts/_probe_wolf_early.ts [days=21] [seeds=1,2,3,7,42,99]
 */
import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'

const days = Math.max(1, Math.min(60, Number(process.argv[2] ?? 21)))
const seeds = (process.argv[3] ?? '1,2,3,7,42,99')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n))

const ticks = days * TICKS_PER_DAY
let totalDeaths = 0
let totalWolf = 0
let totalAliveEnd = 0
let totalStart = 0
const rows: string[] = []

for (const seed of seeds) {
  const state = createSimulation(seed)
  const start = state.villagers.filter((v) => v.alive).length
  totalStart += start
  for (let t = 0; t < ticks; t++) stepSimulation(state)
  const stats = computeStats(state)
  const alive = state.villagers.filter((v) => v.alive).length
  totalDeaths += stats.deaths
  totalWolf += stats.deathsByWolf
  totalAliveEnd += alive
  rows.push(
    `seed=${seed} start=${start} alive=${alive} deaths=${stats.deaths} wolf=${stats.deathsByWolf} sheep=${stats.sheep} wolves=${stats.wolves}`,
  )
}

console.log(`days=${days} seeds=${seeds.join(',')}`)
for (const r of rows) console.log(r)
console.log(
  `TOTAL start=${totalStart} aliveEnd=${totalAliveEnd} deaths=${totalDeaths} deathsByWolf=${totalWolf} wolfShare=${totalDeaths ? ((100 * totalWolf) / totalDeaths).toFixed(1) : 0}%`,
)
