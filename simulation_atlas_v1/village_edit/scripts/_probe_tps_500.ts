/**
 * HARD perf probe @ ~500 PNJ (stress fill — founders clamp is 120).
 * Usage: npx tsx scripts/_probe_tps_500.ts [seed] [wallSec] [targetPop] [adaptWarmSec]
 *
 * Honesty: this is TEST SETUP scale fill, not organic grow-to-500.
 * Pass bar: measuredTps >= 80 (target 100) with alive ≈ targetPop.
 */
import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { packDraw } from '../src/lib/sim/snapshot'
import { noteSimTps, getSimPerfBudget, resetSimPerfBudgetForStress, setAliveAgentCount, TARGET_SIM_TPS } from '../src/lib/sim/perfBudget'
import { INITIAL_VILLAGERS_MAX, MAX_POPULATION_HARD_CAP } from '../src/lib/sim/simConfig'
import { WORLD_SIZE, type SimState, type Villager, type Slot } from '../src/lib/sim/types'

const seed = Number(process.argv[2] ?? 7) || 7
const wallSec = Number(process.argv[3] ?? 8) || 8
const targetPop = Math.min(
  MAX_POPULATION_HARD_CAP,
  Math.max(50, Number(process.argv[4] ?? 500) || 500),
)
const adaptWarmSec = Number(process.argv[5] ?? 8) || 8

function cloneSlots(slots: Slot[] | null | undefined): Slot[] {
  if (!slots || !Array.isArray(slots)) return []
  return slots.map((s) => ({ ...s }))
}

function cloneVillager(src: Villager, id: number, dx: number, dy: number): Villager {
  const lim = WORLD_SIZE - 2
  return {
    ...src,
    id,
    seed: (src.seed + id * 9973) >>> 0,
    name: `${src.name}_${id}`,
    surname: src.surname,
    lineageId: null,
    familyId: null,
    spouseId: null,
    marriageKind: null,
    marriedTick: 0,
    adoptiveParentIds: [],
    parentIds: [],
    motherId: null,
    fatherId: null,
    x: Math.max(2, Math.min(src.x + dx, lim)),
    y: Math.max(2, Math.min(src.y + dy, lim)),
    inventory: cloneSlots(src.inventory),
    chestInventory: src.chestInventory ? cloneSlots(src.chestInventory) : null,
    cupboardInventory: src.cupboardInventory ? cloneSlots(src.cupboardInventory) : null,
    task: null,
    savedTask: null,
    nextThinkTick: 0,
    memories: [],
    relations: new Map(),
    house: null,
    homeLayout: null,
    furnitureQueue: [],
    horseId: null,
    mounted: false,
    boatId: null,
    embarked: false,
    hasHome: false,
    homeX: -1,
    homeY: -1,
    homeOwnerId: null,
    hasWorkbench: false,
    workbenchX: -1,
    workbenchY: -1,
    hasTable: false,
    tableX: -1,
    tableY: -1,
    hasPen: false,
    penX: -1,
    penY: -1,
    hasField: false,
    fieldX: -1,
    fieldY: -1,
    hasChest: false,
    chestX: -1,
    chestY: -1,
    villageId: src.villageId,
    alive: true,
    hunger: 5.2,
    stamina: 4,
    starveTimer: 0,
    activeProjectId: null,
    knowledge: src.knowledge ? src.knowledge.map((k) => ({ ...k })) : [],
    equipment: src.equipment ? { ...src.equipment } : src.equipment,
    genome: src.genome ? { ...src.genome } : src.genome,
    phenotype: src.phenotype ? { ...src.phenotype } : src.phenotype,
    personality: src.personality ? { ...src.personality } : src.personality,
    homeFurniture: [],
  }
}

function stressFillPopulation(state: SimState, target: number): { before: number; after: number; added: number } {
  const aliveBefore = state.villagers.filter((v) => v.alive).length
  if (aliveBefore >= target) return { before: aliveBefore, after: aliveBefore, added: 0 }

  let nextId = 0
  for (const v of state.villagers) if (v.id > nextId) nextId = v.id
  nextId += 1
  if (typeof state.nextId === 'number' && state.nextId <= nextId) state.nextId = nextId + 1

  const templates = state.villagers.filter((v) => v.alive)
  let i = 0
  while (state.villagers.filter((v) => v.alive).length < target) {
    const src = templates[i % templates.length]
    const ring = Math.floor(i / templates.length) + 1
    const angle = (i * 2.399963) % (Math.PI * 2)
    const dx = Math.round(Math.cos(angle) * (3 + ring))
    const dy = Math.round(Math.sin(angle) * (3 + ring))
    state.villagers.push(cloneVillager(src, nextId++, dx, dy))
    i++
  }
  if (typeof state.nextId === 'number') state.nextId = Math.max(state.nextId, nextId)
  const aliveAfter = state.villagers.filter((v) => v.alive).length
  return { before: aliveBefore, after: aliveAfter, added: aliveAfter - aliveBefore }
}

function countAlive(state: SimState): number {
  let n = 0
  for (let i = 0; i < state.villagers.length; i++) if (state.villagers[i].alive) n++
  return n
}

const state = createSimulation(seed, {
  preset: 'vast',
  worldSize: 1000,
  initialVillagers: INITIAL_VILLAGERS_MAX,
  maxPopulation: MAX_POPULATION_HARD_CAP,
  wolfCount: 2,
})

const fill = stressFillPopulation(state, targetPop)
// Seed Max LOD headroom so warm doesn't start from module default lastTps=8 thrash.
setAliveAgentCount(fill.after)
resetSimPerfBudgetForStress(70, fill.after)
noteSimTps(70)

{
  const w0 = performance.now()
  let wt = 0
  let last = w0
  while (performance.now() - w0 < adaptWarmSec * 1000) {
    stepSimulation(state)
    wt++
    const now = performance.now()
    if (now - last >= 500) {
      noteSimTps(Math.max(70, wt / ((now - w0) / 1000)))
      last = now
    }
  }
  noteSimTps(Math.max(70, wt / ((performance.now() - w0) / 1000)))
}

// 1s settle after warm — drops cold JIT / first CIRCLE spike from the official window.
const settleEnd = performance.now() + 1000
let settleLast = performance.now()
let settleTicks = 0
const settleT0 = performance.now()
while (performance.now() < settleEnd) {
  stepSimulation(state)
  settleTicks++
  const now = performance.now()
  if (now - settleLast >= 500) {
    noteSimTps(settleTicks / ((now - settleT0) / 1000))
    settleLast = now
  }
}
noteSimTps(Math.max(70, settleTicks / ((performance.now() - settleT0) / 1000)))

const popAtMeasureStart = countAlive(state)
const t0 = performance.now()
let ticks = 0
const deadline = t0 + wallSec * 1000
let lastNote = t0
let minSlice = Infinity
let maxSlice = 0
while (performance.now() < deadline) {
  stepSimulation(state)
  ticks++
  const now = performance.now()
  if (now - lastNote >= 1000) {
    const sliceTps = ticks / ((now - t0) / 1000)
    noteSimTps(sliceTps)
    minSlice = Math.min(minSlice, sliceTps)
    maxSlice = Math.max(maxSlice, sliceTps)
    lastNote = now
  }
}
const elapsed = (performance.now() - t0) / 1000
const tps = ticks / elapsed
noteSimTps(tps)

const popEnd = countAlive(state)
const draw = packDraw(state, Math.round(tps))
const stats = computeStats(state)
const budget = getSimPerfBudget()

const report = {
  mode: 'stress_fill_500',
  honesty:
    'TEST SETUP: cloned founders to target after create (initialVillagers clamp max=120). Not organic grow.',
  seed,
  wallSec,
  adaptWarmSec,
  targetPop,
  fill,
  popAtMeasureStart,
  popEnd,
  ticks,
  elapsedSec: +elapsed.toFixed(3),
  measuredTps: +tps.toFixed(1),
  sliceMinTps: Number.isFinite(minSlice) ? +minSlice.toFixed(1) : null,
  sliceMaxTps: maxSlice > 0 ? +maxSlice.toFixed(1) : null,
  targetTps: TARGET_SIM_TPS,
  budget,
  tpsPass: tps >= 80 && popAtMeasureStart >= targetPop * 0.9,
  tpsNearTarget: tps >= 90,
  tpsAtTarget: tps >= 95,
  scaleOk: popAtMeasureStart >= targetPop * 0.9,
  draw: {
    villagers: draw.villagers.length,
    villages: draw.villages.length,
  },
  stats: {
    pop: stats.villagers,
    villages: stats.villages,
    markets: stats.markets,
    firms: stats.firms,
    kingdoms: stats.kingdoms,
  },
}

console.log(JSON.stringify(report, null, 2))
if (!report.scaleOk) {
  console.error(`Scale miss: pop ${popAtMeasureStart} < 90% of target ${targetPop}`)
  process.exitCode = 4
}
if (!(tps >= 80)) {
  console.error(`TPS under bar @~${targetPop}: ${report.measuredTps} < 80 (target 100)`)
  process.exitCode = 2
}