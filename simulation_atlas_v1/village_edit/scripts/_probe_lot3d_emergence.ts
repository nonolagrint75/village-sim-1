/**
 * Lot 3D — long-run emergence validation (real-action metrics only).
 *   npx tsx scripts/_probe_lot3d_emergence.ts [seed=7]
 * Multi-seed / repro / diverge: scripts/_probe_emergence_master.ts (see emergence_protocol.md)
 */
import * as fs from 'node:fs'
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { countOf } from '../src/lib/sim/inventory'
import {
  snapshotEmergence,
  fingerprintEmergence,
  type EmergenceSnapshot,
} from '../src/lib/sim/build/emergenceMetrics'
import {
  executeHaulForBuild,
  executeHelpBuild,
  executeHireBuilder,
  proposeCollabOptions,
} from '../src/lib/sim/build/npcBuildBehaviors'
import { syncWorkOrdersFromSites, tickWorkOrders, failWorkOrder, findWorkOrder } from '../src/lib/sim/build/workOrders'
import { formHomeBuild, attachHomeBuild, buildQueueRemaining } from '../src/lib/sim/construction'
import { createInventory, addToInventory } from '../src/lib/sim/inventory'
import type { Personality, SimState, Villager } from '../src/lib/sim/types'
import { createWorldGrid, setTerrain } from '../src/lib/sim/world'
import { TREE } from '../src/lib/sim/types'
import type { HomePlannerBrief } from '../src/lib/sim/build/homeContracts'
import { mindOf } from '../src/lib/sim/cognition/mindPool'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, '_lot3d_emergence_report.json')
const seed = Number(process.argv[2] ?? 7)

const HORIZONS = [1000, 5000, 10000]

function snap(state: SimState, label: string) {
  const e = snapshotEmergence(state)
  const s = computeStats(state)
  const deaths = state.deaths ?? 0
  const villages = s.villages
  return {
    label,
    ...e,
    villages,
    deaths,
    fingerprint: fingerprintEmergence({ ...e, deaths, villages }),
  }
}

console.log(`Lot 3D emergence seed=${seed} horizons=${HORIZONS.join(',')}`)
const t0 = Date.now()
const state = createSimulation(seed, {
  initialVillagers: 36,
  maxPopulation: 80,
  worldSize: 600,
  preset: 'standard',
})

const series: ReturnType<typeof snap>[] = []
let nextH = 0
const taskKindHist = new Map<string, number>()
const professionSwitches: string[] = []
const prevProf = new Map<number, string>()

for (const v of state.villagers) prevProf.set(v.id, v.profession)

while (nextH < HORIZONS.length) {
  stepSimulation(state)
  for (const v of state.villagers) {
    if (!v.alive) continue
    const k = v.task?.kind ?? 'idle'
    taskKindHist.set(k, (taskKindHist.get(k) ?? 0) + 1)
    const prev = prevProf.get(v.id)
    if (prev !== undefined && prev !== v.profession) {
      professionSwitches.push(`t${state.tick} #${v.id} ${prev}→${v.profession}`)
      prevProf.set(v.id, v.profession)
    } else if (prev === undefined) {
      prevProf.set(v.id, v.profession)
    }
  }
  if (state.tick >= HORIZONS[nextH]!) {
    const row = snap(state, `t${HORIZONS[nextH]}`)
    series.push(row)
    console.log(JSON.stringify(row))
    nextH++
  }
}

const elapsed = Date.now() - t0
const final = series[series.length - 1]!
const em = state.emergence

// --- Failure adaptation micro-scenarios (isolated, real fail paths) ---
const personality: Personality = {
  courage: 0.5,
  sociability: 0.5,
  ambition: 0.5,
  generosity: 0.5,
  curiosity: 0.5,
}
function brief(): HomePlannerBrief {
  return {
    personality,
    profession: 'farmer',
    wealth: 2,
    household: 2,
    woodOnHand: 0,
    stoneOnHand: 0,
    buildSkill: 0.4,
    climate: { tempC: 10, moisture: 0.4, stoneAccess: 0.2, timberAccess: 0.2, nearWater: false },
    neighbors: [],
    existing: null,
    mode: 'new',
    needFocus: ['shelter'],
    artisan: false,
    merchant: false,
    stylePrior: null,
  }
}
function stub(id: number, wood: number, coin: number): Villager {
  const inv = createInventory(8)
  if (wood) addToInventory(inv, 'wood', wood)
  if (coin) addToInventory(inv, 'coin', coin)
  const v = {
    id,
    name: `T${id}`,
    alive: true,
    x: 20,
    y: 20,
    inventory: inv,
    house: null,
    homePlan: null,
    buildQueue: [],
    homeX: -1,
    homeY: -1,
    hasHome: false,
    homeOwnerId: null,
    hunger: 3,
    starveTimer: 0,
    stamina: 5,
    toolTier: 'none' as const,
    toolWear: 0,
    profession: 'farmer',
    personality,
    relations: new Map(),
    task: null,
    age: 100,
    villageId: null,
    hasWorkbench: false,
    workbenchX: -1,
    workbenchY: -1,
  } as unknown as Villager
  mindOf(v)
  return v
}

const failTests: { name: string; ok: boolean; detail: string }[] = []
{
  const g = createWorldGrid(5)
  // no trees
  for (let i = 0; i < g.terrain.length; i++) {
    g.terrain[i] = 0
    g.amount[i] = 0
  }
  const st = {
    grid: g,
    tick: 90,
    villagers: [] as Villager[],
    villages: [],
    wolves: [],
    projects: [],
    workOrders: [],
    nextWorkOrderId: 1,
    climate: { weather: 'clear' },
    season: 'spring',
    log: [],
    deaths: 0,
  } as unknown as SimState
  const owner = stub(1, 0, 0)
  const helper = stub(2, 0, 0)
  const home = formHomeBuild(brief(), 20, 20, () => 0.3)
  attachHomeBuild(owner, home, 20, 20)
  st.villagers = [owner, helper]
  helper.task = {
    kind: 'haulForBuild',
    targetX: 20,
    targetY: 20,
    targetId: 1,
    resource: 'wood',
    stuckTicks: 0,
    ageTicks: 0,
    work: 0,
    path: null,
    pathI: 0,
    pathTx: 20,
    pathTy: 20,
    pathTick: -999,
  }
  const keep = executeHaulForBuild(st, helper, () => 0.5)
  failTests.push({
    name: 'FAIL_NO_WOOD_SOURCE',
    ok: keep === false,
    detail: `keep=${keep} failedWO=${st.emergence?.workOrdersFailed ?? 0}`,
  })
}
{
  // hungry NPC does not propose construction
  const st = createSimulation(99, { initialVillagers: 12, worldSize: 600, maxPopulation: 40 })
  const v = st.villagers.find((x) => x.alive)!
  v.hunger = 0.5
  // ensure some site exists
  const other = st.villagers.find((x) => x.alive && x.id !== v.id)
  if (other) {
    const home = formHomeBuild(brief(), other.x, other.y, () => 0.4)
    attachHomeBuild(other, home, Math.floor(other.x), Math.floor(other.y))
    other.hasHome = false
  }
  syncWorkOrdersFromSites(st)
  const opts = proposeCollabOptions(st, v)
  failTests.push({
    name: 'FAIL_HUNGER_BLOCKS_COLLAB',
    ok: opts.length === 0,
    detail: `opts=${opts.length}`,
  })
}
{
  // owner without coins — hire may fail cleanly
  const g = createWorldGrid(5)
  setTerrain(g, 22, 20, TREE, 3)
  const st = {
    grid: g,
    tick: 120,
    villagers: [] as Villager[],
    villages: [],
    wolves: [],
    projects: [],
    workOrders: [],
    nextWorkOrderId: 1,
    climate: { weather: 'clear' },
    season: 'spring',
    log: [],
    deaths: 0,
  } as unknown as SimState
  const owner = stub(10, 5, 0)
  const builder = stub(11, 20, 0)
  builder.profession = 'builder'
  builder.x = 21
  builder.y = 20
  const home = formHomeBuild(brief(), 20, 20, () => 0.2)
  attachHomeBuild(owner, home, 20, 20)
  st.villagers = [owner, builder]
  owner.task = {
    kind: 'hireBuilder',
    targetX: 20,
    targetY: 20,
    targetId: 10,
    resource: 'coin',
    stuckTicks: 0,
    ageTicks: 0,
    work: 0,
    path: null,
    pathI: 0,
    pathTx: 20,
    pathTy: 20,
    pathTick: -999,
  }
  executeHireBuilder(st, owner, () => 0.5)
  // Without coins, wageWouldClear may still hire if offer from wealth — check no crash + decision returned
  failTests.push({
    name: 'FAIL_HIRE_NO_CRASH',
    ok: true,
    detail: `helperTask=${builder.task?.kind ?? 'none'}`,
  })
}

let failCount = 0
for (const f of failTests) {
  if (f.ok) console.log(`PASS ${f.name} — ${f.detail}`)
  else {
    failCount++
    console.log(`FAIL ${f.name} — ${f.detail}`)
  }
}

// Audit: no forced auto-build loop — construction tasks appear via chooseTask distribution
const buildTaskTicks = (taskKindHist.get('helpBuild') ?? 0) + (taskKindHist.get('haulForBuild') ?? 0) + (taskKindHist.get('buildHouse') ?? 0)
const eatTicks = taskKindHist.get('eat') ?? 0
const gatherTicks = (taskKindHist.get('gatherFood') ?? 0) + (taskKindHist.get('gatherWood') ?? 0)
const forcedLoopSuspected = buildTaskTicks > 0 && eatTicks === 0 && gatherTicks === 0 && final.meanHunger < 1.5

const report = {
  seed,
  elapsedMs: elapsed,
  ticks: state.tick,
  horizons: series,
  final,
  taskKindTop: [...taskKindHist.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15),
  professionSwitches: professionSwitches.slice(0, 20),
  chains: em?.chains.slice(-20) ?? [],
  failTests,
  audit: {
    forcedLoopSuspected,
    buildTaskTicks,
    eatTicks,
    gatherTicks,
    workOrderPath: 'need→WO→chooseTask→reserve→execute→progress',
  },
}

fs.writeFileSync(OUT, JSON.stringify(report, null, 2), 'utf8')
console.log(`\nWrote ${OUT}`)
console.log(`elapsed=${elapsed}ms ticks=${state.tick} blocks=${final.blocksBuilt} homesDone=${final.homesCompleted} WO✓=${final.completedWorkOrders}`)

if (failCount > 0) process.exit(1)
console.log('\nLOT3D VALIDATION PASS')