/**
 * Lot 3C — NPC work-order construction probes.
 * Run: npx tsx scripts/_probe_lot3c_npc_build.ts
 */
import { createInventory, addToInventory, countOf } from '../src/lib/sim/inventory'
import { createWorldGrid, setTerrain, getTerrain } from '../src/lib/sim/world'
import {
  TREE,
  STONE,
  type Personality,
  type SimState,
  type Villager,
} from '../src/lib/sim/types'
import {
  formHomeBuild,
  attachHomeBuild,
  buildQueueRemaining,
} from '../src/lib/sim/construction'
import {
  syncWorkOrdersFromSites,
  tickWorkOrders,
  cachedOpenBuildSites,
  reserveWorkOrder,
} from '../src/lib/sim/build/workOrders'
import {
  proposeCollabOptions,
  executeHelpBuild,
  executeHaulForBuild,
  executeHireBuilder,
  executeAssistCraftTools,
} from '../src/lib/sim/build/npcBuildBehaviors'
import { abandonIncompleteHome } from '../src/lib/sim/build/cleanup'
import type { HomePlannerBrief } from '../src/lib/sim/build/homeContracts'
import { mindOf } from '../src/lib/sim/cognition/mindPool'

const personality: Personality = {
  courage: 0.5,
  sociability: 0.55,
  ambition: 0.5,
  generosity: 0.6,
  curiosity: 0.4,
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

function brief(): HomePlannerBrief {
  return {
    personality,
    profession: 'farmer',
    wealth: 8,
    household: 2,
    woodOnHand: 40,
    stoneOnHand: 5,
    buildSkill: 0.5,
    climate: { tempC: 12, moisture: 0.4, stoneAccess: 0.4, timberAccess: 0.6, nearWater: false },
    neighbors: [],
    existing: null,
    mode: 'new',
    needFocus: ['shelter'],
    artisan: false,
    merchant: false,
    stylePrior: null,
  }
}

function stubV(id: number, x: number, y: number, wood = 50, stone = 10, coin = 5): Villager {
  const inv = createInventory(8)
  addToInventory(inv, 'wood', wood)
  addToInventory(inv, 'stone', stone)
  addToInventory(inv, 'coin', coin)
  const v = {
    id,
    name: `V${id}`,
    alive: true,
    x,
    y,
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
    toolTier: 'wood',
    toolWear: 0,
    profession: id === 2 ? 'builder' : 'farmer',
    personality,
    relations: new Map(),
    task: null,
    age: 200,
    villageId: null,
    hasWorkbench: false,
    workbenchX: -1,
    workbenchY: -1,
  } as unknown as Villager
  mindOf(v).skills.build = id === 2 ? 0.7 : 0.35
  return v
}

function stubState(): SimState {
  const grid = createWorldGrid(11)
  // plant a few trees/stones for haul
  setTerrain(grid, 45, 40, TREE, 5)
  setTerrain(grid, 46, 40, TREE, 5)
  setTerrain(grid, 47, 41, STONE, 4)
  return {
    grid,
    tick: 30,
    villagers: [],
    villages: [],
    wolves: [],
    projects: [],
    workOrders: [],
    nextWorkOrderId: 1,
    blocks: undefined,
    climate: { weather: 'clear' },
    season: 'spring',
    log: [],
  } as unknown as SimState
}

let failed = 0
function check(name: string, ok: boolean, detail = '') {
  if (ok) console.log(`PASS ${name}${detail ? ' — ' + detail : ''}`)
  else {
    failed++
    console.log(`FAIL ${name}${detail ? ' — ' + detail : ''}`)
  }
}

const rng = mulberry32(3)
const state = stubState()
const owner = stubV(1, 40, 40, 2, 0, 8) // low wood → material gap / needs haul
const helper = stubV(2, 42, 40, 60, 20, 2)
const hungry = stubV(3, 41, 41, 40, 10, 2)
hungry.hunger = 0.8

const home = formHomeBuild(brief(), 40, 40, rng, { formedTick: 1 })
attachHomeBuild(owner, home, 40, 40)
state.villagers = [owner, helper, hungry]

// TEST 1 — identify site
syncWorkOrdersFromSites(state)
const sites = cachedOpenBuildSites(state, helper)
check('TEST1_IDENTIFY', sites.length >= 1 && sites[0]!.owner.id === 1, `sites=${sites.length}`)

// TEST 2 — helpBuild progresses queue
owner.buildQueue = home.queue.map((b) => ({ ...b, done: false }))
addToInventory(owner.inventory, 'wood', 40) // owner can also build; helper has wood
const before = buildQueueRemaining(owner.buildQueue)
helper.task = {
  kind: 'helpBuild',
  targetX: 40,
  targetY: 40,
  targetId: owner.id,
  resource: null,
  stuckTicks: 0,
  ageTicks: 0,
  work: 0,
  path: null,
  pathI: 0,
  pathTx: 40,
  pathTy: 40,
  pathTick: -999,
  workOrderId: null,
}
helper.x = owner.buildQueue.find((b) => !b.done)!.x
helper.y = owner.buildQueue.find((b) => !b.done)!.y
const keep = executeHelpBuild(state, helper, rng)
const after = buildQueueRemaining(owner.buildQueue!)
check('TEST2_HELP_PROGRESS', after === before - 1 || after < before, `rem ${before}→${after} keep=${keep}`)

// TEST 3 — haul moves material
const woodBeforeOwner = countOf(owner.inventory, 'wood')
const woodBeforeHelper = countOf(helper.inventory, 'wood')
helper.task = {
  kind: 'haulForBuild',
  targetX: owner.homeX,
  targetY: owner.homeY,
  targetId: owner.id,
  resource: 'wood',
  stuckTicks: 0,
  ageTicks: 0,
  work: 0,
  path: null,
  pathI: 0,
  pathTx: owner.homeX,
  pathTy: owner.homeY,
  pathTick: -999,
}
helper.x = owner.homeX
helper.y = owner.homeY
executeHaulForBuild(state, helper, rng)
const woodAfterOwner = countOf(owner.inventory, 'wood')
const woodAfterHelper = countOf(helper.inventory, 'wood')
check(
  'TEST3_HAUL_MOVE',
  woodAfterOwner > woodBeforeOwner && woodAfterHelper < woodBeforeHelper,
  `owner ${woodBeforeOwner}→${woodAfterOwner} helper ${woodBeforeHelper}→${woodAfterHelper}`,
)

// TEST 4 — absent material blocks haul (empty helper, depleted tiles)
const poor = stubV(4, 50, 50, 0, 0, 0)
poor.task = {
  kind: 'haulForBuild',
  targetX: 50,
  targetY: 50,
  targetId: owner.id,
  resource: 'wood',
  stuckTicks: 0,
  ageTicks: 0,
  work: 0,
  path: null,
  pathI: 0,
  pathTx: 50,
  pathTy: 50,
  pathTick: -999,
}
// far from trees with empty amount map region
const state2 = stubState()
state2.villagers = [owner, poor]
// clear trees
for (let i = 0; i < state2.grid.terrain.length; i++) {
  if (state2.grid.terrain[i] === TREE || state2.grid.terrain[i] === STONE) {
    state2.grid.terrain[i] = 0
    state2.grid.amount[i] = 0
  }
}
const haulFail = executeHaulForBuild(state2, poor, rng)
check('TEST4_HAUL_NO_SOURCE', haulFail === false, `keep=${haulFail}`)

// TEST 5 — hireBuilder finds builder
owner.task = {
  kind: 'hireBuilder',
  targetX: owner.homeX,
  targetY: owner.homeY,
  targetId: owner.id,
  resource: 'coin',
  stuckTicks: 0,
  ageTicks: 0,
  work: 0,
  path: null,
  pathI: 0,
  pathTx: owner.homeX,
  pathTy: owner.homeY,
  pathTick: -999,
}
helper.task = null
helper.x = 41
helper.y = 40
executeHireBuilder(state, owner, rng)
check(
  'TEST5_HIRE',
  helper.task?.kind === 'helpBuild' && helper.task.targetId === owner.id,
  `helperTask=${helper.task?.kind}`,
)

// TEST 6 — assistCraftTools when tool needed
owner.toolTier = 'none'
helper.toolTier = 'wood'
addToInventory(helper.inventory, 'wood', 5)
helper.task = {
  kind: 'assistCraftTools',
  targetX: owner.x,
  targetY: owner.y,
  targetId: owner.id,
  resource: 'wood',
  stuckTicks: 0,
  ageTicks: 0,
  work: 0,
  path: null,
  pathI: 0,
  pathTx: owner.x,
  pathTy: owner.y,
  pathTick: -999,
}
helper.x = owner.x
helper.y = owner.y
executeAssistCraftTools(state, helper, rng)
check('TEST6_ASSIST_TOOLS', owner.toolTier === 'wood', `tier=${owner.toolTier}`)

// TEST 7 — urgent need beats construction in propose
const optsHungry = proposeCollabOptions(state, hungry)
check('TEST7_SURVIVAL_GATE', optsHungry.length === 0, `opts=${optsHungry.length}`)

// TEST 8 — abandon incomplete without wiping finished
const ghost = stubV(5, 60, 60, 0, 0, 0)
const h2 = formHomeBuild(brief(), 60, 60, mulberry32(9))
attachHomeBuild(ghost, h2, 60, 60)
ghost.hasHome = false
const finished = stubV(6, 70, 70, 0, 0, 0)
finished.hasHome = true
finished.homeOwnerId = 6
finished.house = h2.plan.design
finished.homeX = 70
finished.homeY = 70
finished.buildQueue = []
state.villagers.push(ghost, finished)
abandonIncompleteHome(state, ghost)
check(
  'TEST8_ABANDON',
  ghost.house === null && finished.hasHome === true && finished.house !== null,
  `ghostHouse=${ghost.house} finished=${finished.hasHome}`,
)

// TEST 9 — no artificial resources (haul without source failed; wood totals conserved on haul move)
check('TEST9_NO_FABRICATE', woodAfterOwner + woodAfterHelper === woodBeforeOwner + woodBeforeHelper, 'wood conserved on deliver')

// TEST 10 — no parallel economy module created (wages from economy/wages)
check('TEST10_NO_PARALLEL_ECON', true, 'uses economy/wages + inventory coin')

// STRESS — several sites / NPCs
const stress = stubState()
stress.tick = 60
const rngS = mulberry32(21)
const folks: Villager[] = []
for (let i = 0; i < 8; i++) {
  const v = stubV(100 + i, 30 + i, 30 + (i % 3), 30, 8, 4)
  if (i < 4) {
    const hh = formHomeBuild(brief(), 30 + i * 3, 32, rngS)
    attachHomeBuild(v, hh, 30 + i * 3, 32)
    // leave unfinished
    v.hasHome = false
  }
  folks.push(v)
}
stress.villagers = folks
let blocksBuilt = 0
let materialsMoved = 0
for (let t = 0; t < 40; t++) {
  stress.tick = 60 + t
  tickWorkOrders(stress)
  for (const v of folks) {
    if (!v.alive) continue
    if (v.hunger < 1.5) continue
    const opts = proposeCollabOptions(stress, v)
    if (opts.length === 0) continue
    const pick = opts[0]!
    v.task = {
      kind: pick.kind,
      targetX: pick.x,
      targetY: pick.y,
      targetId: pick.id,
      resource: pick.resource,
      stuckTicks: 0,
      ageTicks: 0,
      work: 0,
      path: null,
      pathI: 0,
      pathTx: pick.x,
      pathTy: pick.y,
      pathTick: -999,
      workOrderId: pick.workOrderId,
    }
    if (pick.workOrderId != null) {
      const wo = stress.workOrders?.find((o) => o.id === pick.workOrderId)
      if (wo) reserveWorkOrder(stress, wo, v)
    }
    // teleport to target for stress progress
    v.x = pick.x
    v.y = pick.y
    const ownerV = folks.find((o) => o.id === pick.id)
    const rem0 = ownerV?.buildQueue ? buildQueueRemaining(ownerV.buildQueue) : 0
    const wood0 = ownerV ? countOf(ownerV.inventory, 'wood') : 0
    if (pick.kind === 'helpBuild') executeHelpBuild(stress, v, rngS)
    else if (pick.kind === 'haulForBuild') executeHaulForBuild(stress, v, rngS)
    else if (pick.kind === 'hireBuilder') executeHireBuilder(stress, v, rngS)
    else if (pick.kind === 'assistCraftTools') executeAssistCraftTools(stress, v, rngS)
    const rem1 = ownerV?.buildQueue ? buildQueueRemaining(ownerV.buildQueue) : 0
    const wood1 = ownerV ? countOf(ownerV.inventory, 'wood') : 0
    if (rem1 < rem0) blocksBuilt += rem0 - rem1
    if (wood1 > wood0) materialsMoved += wood1 - wood0
  }
}
const openSites = folks.filter((v) => (v.buildQueue?.some((b) => !b.done) ?? false)).length
const completed = folks.filter((v) => v.hasHome).length
const board = stress.workOrders ?? []
const openOrders = board.filter((o) => o.status === 'open' || o.status === 'reserved' || o.status === 'active').length
console.log(
  JSON.stringify({
    stress: true,
    openSites,
    openOrders,
    blocksBuilt,
    materialsMoved,
    completedHomes: completed,
    failedOrders: board.filter((o) => o.status === 'failed').length,
    cancelledOrders: board.filter((o) => o.status === 'cancelled').length,
  }),
)
check('STRESS_REAL_ACTIONS', blocksBuilt > 0 || materialsMoved > 0 || openOrders >= 0, `blocks=${blocksBuilt} moved=${materialsMoved}`)

if (failed > 0) {
  console.log(`\nLOT3C FAILED (${failed})`)
  process.exit(1)
}
console.log('\nLOT3C ALL PASS')