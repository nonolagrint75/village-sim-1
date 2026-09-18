import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { noteSimTps, getSimPerfBudget, villagerLodStride } from '../src/lib/sim/perfBudget'
import { INITIAL_VILLAGERS_MAX, MAX_POPULATION_HARD_CAP } from '../src/lib/sim/simConfig'
import { WORLD_SIZE, type SimState, type Villager, type Slot } from '../src/lib/sim/types'
import { tickVillager, tickFields, tickTrade, tickCombat } from '../src/lib/sim/behaviors'
import { tickPolitics } from '../src/lib/sim/politics'
import { tickClimate } from '../src/lib/sim/climate'
import { tickBandits } from '../src/lib/sim/bandits'
import { agentHash } from '../src/lib/sim/kernels'
import { resetPathBudget } from '../src/lib/sim/pathfinding'
import { setAliveAgentCount } from '../src/lib/sim/perfBudget'
import { bindEmergenceState } from '../src/lib/sim/build/emergenceMetrics'
import { bindDecisionLedger } from '../src/lib/sim/decisionLedger'
import { bindAttributionMetrics } from '../src/lib/sim/attributionMetrics'
import { bindBehaviorSeqMetrics } from '../src/lib/sim/behaviorSequenceMetrics'

function cloneSlots(slots: Slot[] | null | undefined): Slot[] {
  if (!slots || !Array.isArray(slots)) return []
  return slots.map((s) => ({ ...s }))
}
function cloneVillager(src: Villager, id: number, dx: number, dy: number): Villager {
  const lim = WORLD_SIZE - 2
  return {
    ...src, id, seed: (src.seed + id * 9973) >>> 0, name: `${src.name}_${id}`,
    lineageId: null, familyId: null, spouseId: null, marriageKind: null, marriedTick: 0,
    adoptiveParentIds: [], parentIds: [], motherId: null, fatherId: null,
    x: Math.max(2, Math.min(src.x + dx, lim)), y: Math.max(2, Math.min(src.y + dy, lim)),
    inventory: cloneSlots(src.inventory), chestInventory: null, cupboardInventory: null,
    task: null, savedTask: null, nextThinkTick: 0, memories: [], relations: new Map(),
    house: null, homeLayout: null, furnitureQueue: [], horseId: null, mounted: false,
    boatId: null, embarked: false, hasHome: false, homeX: -1, homeY: -1, homeOwnerId: null,
    hasWorkbench: false, workbenchX: -1, workbenchY: -1, hasTable: false, tableX: -1, tableY: -1,
    hasPen: false, penX: -1, penY: -1, hasField: false, fieldX: -1, fieldY: -1,
    hasChest: false, chestX: -1, chestY: -1, villageId: src.villageId, alive: true,
    hunger: 5.2, stamina: 4, starveTimer: 0, activeProjectId: null, knowledge: [],
    equipment: src.equipment ? { ...src.equipment } : src.equipment,
    genome: src.genome ? { ...src.genome } : src.genome,
    phenotype: src.phenotype ? { ...src.phenotype } : src.phenotype,
    personality: src.personality ? { ...src.personality } : src.personality,
    homeFurniture: [],
  }
}
function fill(state: SimState) {
  let nextId = Math.max(...state.villagers.map((v) => v.id)) + 1
  const templates = state.villagers.filter((v) => v.alive)
  let i = 0
  while (state.villagers.filter((v) => v.alive).length < 500) {
    const src = templates[i % templates.length]
    const ring = Math.floor(i / templates.length) + 1
    const angle = (i * 2.399963) % (Math.PI * 2)
    state.villagers.push(cloneVillager(src, nextId++, Math.round(Math.cos(angle) * (3 + ring)), Math.round(Math.sin(angle) * (3 + ring))))
    i++
  }
}

const state = createSimulation(7, { preset: 'vast', worldSize: 1000, initialVillagers: 120, maxPopulation: 500, wolfCount: 1 })
fill(state)
for (let i = 0; i < 40; i++) { noteSimTps(35); stepSimulation(state) }

const N = 8
const acc: Record<string, number> = {}
function add(k: string, ms: number) { acc[k] = (acc[k] ?? 0) + ms }

for (let n = 0; n < N; n++) {
  let t = performance.now()
  bindEmergenceState(state); bindDecisionLedger(state); bindAttributionMetrics(state); bindBehaviorSeqMetrics(state)
  add('binds', performance.now() - t)

  t = performance.now()
  let alive = 0
  for (const v of state.villagers) if (v.alive) alive++
  setAliveAgentCount(alive); resetPathBudget(alive); agentHash.rebuild(state)
  add('hash', performance.now() - t)

  t = performance.now()
  tickClimate(state, () => 0.4)
  add('climate', performance.now() - t)

  const stride = villagerLodStride(alive)
  let fullBudget = 3
  t = performance.now()
  for (const v of state.villagers) {
    if (!v.alive) continue
    const urgent = v.hunger < 0.45 || v.starveTimer > 3
    let light = !urgent && (state.tick + v.id) % stride !== 0
    if (!light && !urgent) { if (fullBudget <= 0) light = true; else fullBudget-- }
    tickVillager(state, v, () => 0.4, light)
  }
  add('villagers', performance.now() - t)

  t = performance.now(); tickTrade(state); add('trade', performance.now() - t)
  t = performance.now(); tickFields(state); add('fields', performance.now() - t)
  t = performance.now(); tickCombat(state, () => 0.4); tickBandits(state, () => 0.4); add('combat_bandits', performance.now() - t)
  t = performance.now(); tickPolitics(state); add('politics', performance.now() - t)

  state.tick++
}

const ranked = Object.entries(acc).map(([k, ms]) => ({ k, ms: +(ms / N).toFixed(2) })).sort((a, b) => b.ms - a.ms)
const sum = ranked.reduce((s, r) => s + r.ms, 0)
console.log(JSON.stringify({ sumMs: +sum.toFixed(2), tpsEst: +(1000 / sum).toFixed(1), stride: villagerLodStride(500), budget: getSimPerfBudget(), ranked }, null, 2))