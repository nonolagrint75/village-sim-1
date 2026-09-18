import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { noteSimTps, getSimPerfBudget } from '../src/lib/sim/perfBudget'
import { INITIAL_VILLAGERS_MAX, MAX_POPULATION_HARD_CAP } from '../src/lib/sim/simConfig'
import { WORLD_SIZE, type SimState, type Villager, type Slot } from '../src/lib/sim/types'
import { tickVillager } from '../src/lib/sim/behaviors'
import { agentHash } from '../src/lib/sim/kernels'
import { resetPathBudget } from '../src/lib/sim/pathfinding'
import { setAliveAgentCount } from '../src/lib/sim/perfBudget'

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
function fill(state: SimState, n: number) {
  let nextId = Math.max(...state.villagers.map(v => v.id)) + 1
  const templates = state.villagers.filter(v => v.alive)
  let i = 0
  while (state.villagers.filter(v => v.alive).length < n) {
    const src = templates[i % templates.length]
    const ring = Math.floor(i / templates.length) + 1
    const angle = (i * 2.399963) % (Math.PI * 2)
    state.villagers.push(cloneVillager(src, nextId++, Math.round(Math.cos(angle)*(3+ring)), Math.round(Math.sin(angle)*(3+ring))))
    i++
  }
}

const state = createSimulation(7, { preset:'vast', worldSize:1000, initialVillagers:120, maxPopulation:500, wolfCount:1 })
fill(state, 500)
for (let i=0;i<15;i++) stepSimulation(state)

// A: all light hunger-only (patch: call tickVillager light without execute by clearing tasks)
for (const v of state.villagers) { v.task = null }
setAliveAgentCount(500); resetPathBudget(500); agentHash.rebuild(state)
let t0 = performance.now()
for (let n=0;n<10;n++) {
  for (const v of state.villagers) if (v.alive) tickVillager(state, v, () => 0.5, true)
}
console.log('allLightHungerMs', +((performance.now()-t0)/10).toFixed(2))

// B: full stepSimulation
t0 = performance.now()
for (let n=0;n<8;n++) stepSimulation(state)
const ms = (performance.now()-t0)/8
console.log(JSON.stringify({ fullStepMs: +ms.toFixed(2), tps: +(1000/ms).toFixed(1), budget: getSimPerfBudget() }))