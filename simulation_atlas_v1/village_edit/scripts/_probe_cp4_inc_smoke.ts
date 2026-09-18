/**
 * CP4 short regression smoke — INC-01..04 + food-chain LIVE + farmer locks.
 * Natural path only. No induce.
 *
 *   npx tsx scripts/_probe_cp4_inc_smoke.ts [days=12] [seed=7]
 */
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { edibleValue } from '../src/lib/sim/inventory'
import { snapshotMigrationMetrics } from '../src/lib/sim/migrationMetrics'
import { farmerLockedToField } from '../src/lib/sim/fields'

const days = Math.max(1, Number(process.argv[2] ?? 12))
const seed = Number(process.argv[3] ?? 7)

let state = createSimulation(seed, {
  initialVillagers: 100,
  maxPopulation: 250,
  preset: 'standard',
  worldSize: 1000,
})

const starts = { harvest: 0, grind: 0, bake: 0 }
const grindBy: Record<string, number> = {}
const prev = new Map<number, string | null>()
for (const v of state.villagers) prev.set(v.id, v.task?.kind ?? null)

const ticks = days * TICKS_PER_DAY
for (let t = 0; t < ticks; t++) {
  state = stepSimulation(state)
  for (const v of state.villagers) {
    if (!v.alive) continue
    const k = v.task?.kind ?? null
    const p = prev.get(v.id) ?? null
    if (k !== p && k) {
      if (k === 'harvestWheat') starts.harvest++
      if (k === 'grindFlour') {
        starts.grind++
        const prof = v.profession || 'none'
        grindBy[prof] = (grindBy[prof] ?? 0) + 1
      }
      if (k === 'bakeBread') starts.bake++
    }
    prev.set(v.id, k)
  }
}

const stock: Record<string, number> = { food: 0, wheat: 0, flour: 0, bread: 0, meat: 0, edible: 0 }
let millers = 0
let farmers = 0
let locked = 0
for (const v of state.villagers) {
  if (!v.alive) continue
  if (v.profession === 'miller') millers++
  if (v.profession === 'farmer') farmers++
  if (farmerLockedToField(state, v)) locked++
  for (const inv of [v.inventory, v.chestInventory, v.cupboardInventory]) {
    if (!inv) continue
    for (const it of inv) {
      if (!it.type || it.count <= 0) continue
      if (it.type in stock) stock[it.type]! += it.count
    }
  }
  stock.edible += edibleValue(v.inventory)
  if (v.chestInventory) stock.edible += edibleValue(v.chestInventory)
  if (v.cupboardInventory) stock.edible += edibleValue(v.cupboardInventory)
}
stock.edible = Math.round(stock.edible)

const mig = snapshotMigrationMetrics(state)
const help = state.helpCounters ?? {}
const helpCats = Object.entries(help).filter(([, n]) => (n as number) > 0)
const live = starts.harvest > 0 && starts.grind > 0 && starts.bake > 0

const out = {
  cp: 'CP4',
  seed,
  days,
  foodChainLive: live,
  foodChain: starts,
  grindByProfession: grindBy,
  millersEnd: millers,
  farmersEnd: farmers,
  farmerLocks: locked,
  foodStock: stock,
  help,
  helpCatsActive: helpCats.length,
  helpCats: Object.fromEntries(helpCats),
  migration: {
    leaves: mig.counters.leaves,
    rejoins: mig.counters.rejoins,
    foundCamps: mig.counters.foundCamps,
    leaveAttempts: mig.counters.leaveAttempts,
  },
  ok:
    live &&
    stock.edible > 0 &&
    (mig.counters.leaves === 0 || mig.counters.foundCamps > 0 || mig.counters.rejoins > 0),
}

console.log(JSON.stringify(out, null, 2))
console.log(out.ok && live ? 'SMOKE OK' : 'SMOKE CHECK')
if (!live) process.exitCode = 1
