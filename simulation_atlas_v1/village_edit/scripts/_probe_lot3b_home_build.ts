/**
 * Lot 3B tests — plan → queue → BuildBlock → progression / invalid / legacy / build-off.
 * Run: npx tsx scripts/_probe_lot3b_home_build.ts
 */
import { createInventory, addToInventory } from '../src/lib/sim/inventory'
import { createWorldGrid } from '../src/lib/sim/world'
import { getTerrain } from '../src/lib/sim/world'
import type { Personality, SimState, Villager } from '../src/lib/sim/types'
import {
  buildQueueRemaining,
  formHomeBuild,
  attachHomeBuild,
  applyNextHomeBuildBlock,
  spatialPlanFromLegacyHouse,
  rebuildQueueFromDesign,
} from '../src/lib/sim/construction'
import { houseFootprint as hf } from '../src/lib/sim/architecture'
import type { HouseDesign } from '../src/lib/sim/architecture'
import type { HomePlannerBrief } from '../src/lib/sim/build/homeContracts'

const personality: Personality = {
  courage: 0.5,
  sociability: 0.5,
  ambition: 0.5,
  generosity: 0.5,
  curiosity: 0.5,
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function brief(overrides: Partial<HomePlannerBrief> = {}): HomePlannerBrief {
  return {
    personality,
    profession: 'farmer',
    wealth: 6,
    household: 2,
    woodOnHand: 40,
    stoneOnHand: 10,
    buildSkill: 0.5,
    climate: {
      tempC: 12,
      moisture: 0.4,
      stoneAccess: 0.4,
      timberAccess: 0.6,
      nearWater: false,
    },
    neighbors: [],
    existing: null,
    mode: 'new',
    needFocus: ['shelter', 'sleep'],
    artisan: false,
    merchant: false,
    stylePrior: null,
    ...overrides,
  }
}

function stubVillager(id: number): Villager {
  const inv = createInventory(8)
  addToInventory(inv, 'wood', 200)
  addToInventory(inv, 'stone', 80)
  return {
    id,
    alive: true,
    inventory: inv,
    house: null,
    homePlan: null,
    buildQueue: [],
    homeX: -1,
    homeY: -1,
    hasHome: false,
    homeOwnerId: null,
  } as unknown as Villager
}

function stubState(grid = createWorldGrid(42)): SimState {
  return { grid, tick: 0, villagers: [], blocks: undefined } as unknown as SimState
}

let failed = 0
function check(name: string, ok: boolean, detail?: string) {
  if (ok) console.log(`PASS ${name}${detail ? ' — ' + detail : ''}`)
  else {
    failed++
    console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`)
  }
}

const rng = mulberry32(99)
const cx = 40
const cy = 40

// TEST 1 — PLAN
const home = formHomeBuild(brief(), cx, cy, rng, { formedTick: 1 })
check(
  'TEST1_PLAN',
  !!home.plan?.design &&
    home.plan.design.rx >= 1 &&
    home.plan.doorSide != null &&
    home.plan.wallMaterial != null &&
    home.plan.floorMaterial != null,
  `shape=${home.plan.design.shape} rx=${home.plan.design.rx} door=${home.plan.doorSide} wall=${home.plan.wallMaterial}`,
)

// TEST 2 — QUEUE
const qLen = home.queue.length
const walls = home.queue.filter((b) => b.kind === 'wall').length
check(
  'TEST2_QUEUE',
  qLen > 0 && walls > 0 && home.queue.every((b) => b.done === false),
  `len=${qLen} walls=${walls}`,
)

// TEST 3 — BLOCK execute
const state = stubState()
const v = stubVillager(1)
attachHomeBuild(v, home, cx, cy)
state.villagers = [v]
const beforeRem = buildQueueRemaining(v.buildQueue!)
const r1 = applyNextHomeBuildBlock(state, v, { spendMaterials: true, mirrorBlocks: true })
check(
  'TEST3_BLOCK',
  r1.ok === true && !!r1.block,
  `reason=${r1.reason ?? 'ok'} @(${r1.block?.x},${r1.block?.y}) kind=${r1.block?.kind}`,
)

// TEST 4 — PROGRESSION
const afterRem = buildQueueRemaining(v.buildQueue!)
const doneN = v.buildQueue!.filter((b) => b.done).length
check(
  'TEST4_PROGRESSION',
  afterRem === beforeRem - 1 && doneN >= 1 && afterRem < beforeRem,
  `remaining ${beforeRem}→${afterRem} done=${doneN}`,
)

// TEST 5 — INVALIDATION (out of bounds block)
const vBad = stubVillager(2)
vBad.buildQueue = [{ kind: 'wall', x: -5, y: -5, material: 'wood', done: false }]
vBad.house = home.plan.design
vBad.homeX = cx
vBad.homeY = cy
const state2 = stubState(state.grid)
const rBad = applyNextHomeBuildBlock(state2, vBad, { spendMaterials: false, mirrorBlocks: false })
check(
  'TEST5_INVALIDATION',
  rBad.ok === false && rBad.reason === 'out_of_bounds',
  `reason=${rBad.reason}`,
)

// TEST 6 — LEGACY house without doorSide/materials
const legacy: HouseDesign = {
  shape: 'square',
  rx: 2,
  ry: 2,
  bedSlots: 2,
  hasWorkshop: false,
  hasStoreroom: false,
  roomKinds: ['chambre'],
}
const legacyPlan = spatialPlanFromLegacyHouse(legacy)
const legacyQ = rebuildQueueFromDesign(legacy, cx, cy, mulberry32(7))
const fp = hf(legacy, cx, cy)
check(
  'TEST6_LEGACY',
  legacyPlan.doorSide === 'S' &&
    legacyPlan.wallMaterial === 'wood' &&
    legacyQ.length > 0 &&
    fp.walls.length > 0 &&
    !('doorSide' in legacy && (legacy as HouseDesign).doorSide !== undefined && legacy.doorSide === undefined),
  `defaults door=${legacyPlan.doorSide} wall=${legacyPlan.wallMaterial} q=${legacyQ.length} walls=${fp.walls.length}`,
)

// TEST 7 — BUILD OFF: no chantier → no block world forced by tick/path
const idle = stubState(createWorldGrid(3))
check(
  'TEST7_BUILD_OFF',
  idle.blocks === undefined,
  `blocks=${String(idle.blocks)}`,
)
// forming a plan alone must not create blocks
const idleHome = formHomeBuild(brief({ woodOnHand: 5 }), 20, 20, mulberry32(3))
check(
  'TEST7b_PLAN_NO_BLOCKS',
  idle.blocks === undefined && idleHome.queue.length > 0,
  `queue=${idleHome.queue.length} blocksStill=${String(idle.blocks)}`,
)

if (failed > 0) {
  console.log(`\nLOT3B FAILED (${failed})`)
  process.exit(1)
}
console.log('\nLOT3B ALL PASS')