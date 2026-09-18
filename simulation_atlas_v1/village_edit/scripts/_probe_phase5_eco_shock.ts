/**
 * Phase 5 DP9 — CONTROLLED economy shock MECHANISM probe.
 *
 * Channel: MECHANISM / TEST SETUP only.
 * ONE starting variable: wheat stock cut (surplus + inventories).
 * Does NOT inject into natural soak scripts.
 * NEVER claims EMERGENCE PASS from this probe.
 *
 *   npx tsx scripts/_probe_phase5_eco_shock.ts [daysAfter=8] [seed=7] [warmDays=4]
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import {
  beginPriceShock,
  clearPriceShock,
  snapshotCausalityMetrics,
} from '../src/lib/sim/causalityMetrics'
import { snapshotDecisionExact } from '../src/lib/sim/decisionLedger'
import { countOf } from '../src/lib/sim/inventory'
import { BASE_PRICES } from '../src/lib/sim/resources'
import type { SimState } from '../src/lib/sim/types'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const daysAfter = Math.min(20, Math.max(2, Number(process.argv[2] ?? 8)))
const seed = Number(process.argv[3] ?? 7)
const warmDays = Math.min(12, Math.max(1, Number(process.argv[4] ?? 4)))

const SHOCK_ID = 'P9-wheat-stock-cut'
const CONFIG = {
  initialVillagers: 100,
  maxPopulation: 250,
  preset: 'standard' as const,
  worldSize: 1000 as const,
  seed,
}

function wheatStockTotal(state: SimState): number {
  let n = 0
  for (const vg of state.villages) n += Math.max(0, vg.surplus.wheat ?? 0)
  for (const v of state.villagers) {
    if (!v.alive) continue
    n += countOf(v.inventory, 'wheat')
    if (v.chestInventory) n += countOf(v.chestInventory, 'wheat')
  }
  return n
}

function foodProfCounts(state: SimState): Record<string, number> {
  const food = ['farmer', 'forager', 'fisher', 'herder', 'miller'] as const
  const c: Record<string, number> = {}
  for (const p of food) c[p] = 0
  for (const v of state.villagers) {
    if (!v.alive) continue
    if ((food as readonly string[]).includes(v.profession)) {
      c[v.profession] = (c[v.profession] ?? 0) + 1
    }
  }
  return c
}

function taskKindCounts(state: SimState): Record<string, number> {
  const want = ['grindFlour', 'bakeBread', 'harvest', 'sowField', 'tradeRun', 'giveFood'] as const
  const c: Record<string, number> = {}
  for (const k of want) c[k] = 0
  for (const v of state.villagers) {
    if (!v.alive || !v.task) continue
    const k = v.task.kind
    if ((want as readonly string[]).includes(k)) c[k] = (c[k] ?? 0) + 1
  }
  return c
}

/**
 * TEST SETUP — single starting variable: wheat stock only.
 * No famine flag force, no CREATE_*, no food-yield cheat beyond this cut.
 */
function induceWheatStockCut(state: SimState): { wheatBefore: number; wheatAfter: number } {
  const wheatBefore = wheatStockTotal(state)
  for (const vg of state.villages) {
    vg.surplus.wheat = Math.min(vg.surplus.wheat ?? 0, 0)
  }
  for (const v of state.villagers) {
    if (!v.alive) continue
    for (const it of v.inventory) {
      if (it.type === 'wheat') it.count = 0
    }
    if (v.chestInventory) {
      for (const it of v.chestInventory) {
        if (it.type === 'wheat') it.count = Math.min(it.count, 0)
      }
    }
  }
  const wheatAfter = wheatStockTotal(state)
  return { wheatBefore, wheatAfter }
}

console.log('=== PHASE 5 DP9 ECO SHOCK CONTROLLED (MECHANISM) ===')
console.log(
  `seed=${seed} warmDays=${warmDays} daysAfter=${daysAfter} | TEST SETUP: ${SHOCK_ID}`,
)
console.log('CANAL: MECHANISM — never EMERGENCE PASS from this probe')

const t0 = Date.now()
let state = createSimulation(seed, CONFIG)

const warmTicks = warmDays * TICKS_PER_DAY
for (let i = 0; i < warmTicks; i++) state = stepSimulation(state)

const preExact = snapshotDecisionExact(state)
const preCaus = snapshotCausalityMetrics(state)
const priceOf = (res: 'wheat' | 'flour' | 'bread' | 'food') =>
  state.prices[res] ?? BASE_PRICES[res] ?? 3
const prePrices = {
  wheat: priceOf('wheat'),
  flour: priceOf('flour'),
  bread: priceOf('bread'),
  food: priceOf('food'),
}
const preProfs = foodProfCounts(state)
const preTasks = taskKindCounts(state)

const cut = induceWheatStockCut(state)
beginPriceShock(state, SHOCK_ID)
console.log(
  JSON.stringify({
    stage: 'TEST_SETUP',
    shockId: SHOCK_ID,
    label: 'TEST SETUP: wheat stock cut (single variable)',
    wheatBefore: cut.wheatBefore,
    wheatAfter: cut.wheatAfter,
    pricesBefore: prePrices,
    decisionExactBefore: preExact.decisionExactTotal,
  }),
)

const afterTicks = daysAfter * TICKS_PER_DAY
for (let i = 0; i < afterTicks; i++) state = stepSimulation(state)

clearPriceShock(state)

const postExact = snapshotDecisionExact(state)
const postCaus = snapshotCausalityMetrics(state)
const c = postCaus.counters
const postPrices = {
  wheat: priceOf('wheat'),
  flour: priceOf('flour'),
  bread: priceOf('bread'),
  food: priceOf('food'),
}
const postProfs = foodProfCounts(state)
const postTasks = taskKindCounts(state)
const elapsedMs = Date.now() - t0

const samples = (c.priceChainSamples ?? []).filter((s) => s.shockId === SHOCK_ID)
const deltaSamples = samples.filter((s) => s.stage === 'priceDelta')
const taskSamples = samples.filter((s) => s.stage === 'taskShift')
const profSamples = samples.filter((s) => s.stage === 'professionShift')
const npcIds = [
  ...new Set(
    samples
      .map((s) => s.npcId)
      .filter((id): id is number => typeof id === 'number'),
  ),
]

const decisionsAfterShock = Math.max(0, postExact.decisionExactTotal - preExact.decisionExactTotal)
const supplyDemand = {
  wheatStockBefore: cut.wheatBefore,
  wheatStockAfterCut: cut.wheatAfter,
  wheatStockEnd: wheatStockTotal(state),
  priceWheatDelta: +(postPrices.wheat - prePrices.wheat).toFixed(2),
  priceFlourDelta: +(postPrices.flour - prePrices.flour).toFixed(2),
  priceBreadDelta: +(postPrices.bread - prePrices.bread).toFixed(2),
}

const chainStages = {
  shock: cut.wheatBefore > cut.wheatAfter,
  decision: decisionsAfterShock > 0,
  supply_demand: supplyDemand.priceWheatDelta !== 0 || supplyDemand.priceFlourDelta !== 0 || supplyDemand.priceBreadDelta !== 0,
  price: (c.priceShockTaggedDeltas ?? 0) > 0 || deltaSamples.length > 0,
  taskShift: (c.priceShockLinkedTaskShifts ?? 0) > 0 || taskSamples.length > 0,
  professionShift: (c.priceShockLinkedProfessionShifts ?? 0) > 0 || profSamples.length > 0,
}

const ordered =
  chainStages.shock &&
  chainStages.decision &&
  chainStages.supply_demand &&
  chainStages.price &&
  (chainStages.taskShift || chainStages.professionShift)

const mechanismVerdict =
  ordered && npcIds.length >= 1
    ? 'PARTIAL'
    : chainStages.shock && chainStages.price
      ? 'CONNECTION_NOT_PROVEN'
      : 'NOT_TESTED'

const dump = {
  phase: 5,
  dp: 'DP9',
  test: 'P9-eco-shock-controlled',
  channel: 'MECHANISM',
  induced: true,
  testSetup: `TEST SETUP: ${SHOCK_ID} — wheat stock cut only`,
  seed,
  warmDays,
  daysAfter,
  ticks: warmTicks + afterTicks,
  elapsedMs,
  decisionExactTotal: postExact.decisionExactTotal,
  decisionsAfterShock,
  chain: 'shock->decision->supply/demand->price->taskShift|professionShift',
  chainStages,
  supplyDemand,
  prices: { before: prePrices, after: postPrices },
  professions: { before: preProfs, after: postProfs },
  liveTasks: { before: preTasks, after: postTasks },
  counters: {
    priceDeltaEvents: c.priceDeltaEvents,
    priceTaskShifts: c.priceTaskShifts,
    priceProfessionShifts: c.priceProfessionShifts,
    priceNpcCount: c.priceNpcCount ?? 0,
    priceShockTaggedDeltas: c.priceShockTaggedDeltas ?? 0,
    priceShockLinkedTaskShifts: c.priceShockLinkedTaskShifts ?? 0,
    priceShockLinkedProfessionShifts: c.priceShockLinkedProfessionShifts ?? 0,
  },
  npcIds,
  sampleCounts: {
    delta: deltaSamples.length,
    task: taskSamples.length,
    profession: profSamples.length,
  },
  samplesTail: samples.slice(-12),
  priceChainNaturalLabel: postCaus.chains.price,
  mechanismVerdict,
  emergence: 'NOT_CLAIMED',
  acceptance: 'PENDING',
  acceptanceNaturalSec32: 'PENDING',
  note:
    'DONE CODE controlled MECHANISM probe — never EMERGENCE PASS; natural §32 acceptance PENDING',
}

const outPath = path.join(ROOT, '_phase5_eco_shock_controlled_s' + seed + '.json')
fs.writeFileSync(outPath, JSON.stringify(dump, null, 2), 'utf8')

console.log(
  JSON.stringify(
    {
      channel: dump.channel,
      testSetup: dump.testSetup,
      decisionsAfterShock,
      supplyDemand,
      counters: dump.counters,
      npcIds: dump.npcIds.slice(0, 12),
      chainStages,
      mechanismVerdict,
      emergence: dump.emergence,
      acceptance: dump.acceptance,
      acceptanceNaturalSec32: dump.acceptanceNaturalSec32,
    },
    null,
    2,
  ),
)
console.log('\nTEST: P9-eco-shock-controlled')
console.log('CHAIN: shock->decision->supply/demand->price')
console.log('CANAL: MECHANISM')
console.log(`VERDICT_BLOC: ${mechanismVerdict} (never EMERGENCE PASS)`)
console.log('SMOKE (controlled MECHANISM) -> ' + outPath)