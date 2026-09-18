import { createSimulation, stepSimulation } from "../src/lib/sim/engine"
import { noteSimTps, villagerLodStride, setAliveAgentCount, getSimPerfBudget } from "../src/lib/sim/perfBudget"
import { INITIAL_VILLAGERS_MAX, MAX_POPULATION_HARD_CAP } from "../src/lib/sim/simConfig"
import { WORLD_SIZE, type SimState, type Villager, type Slot } from "../src/lib/sim/types"
import { tickVillager, tickTrade, tickFields, tickCombat, tickRegrowth } from "../src/lib/sim/behaviors"
import { tickPolitics } from "../src/lib/sim/politics"
import { tickAtlasLifeSystems } from "../src/lib/sim/emergence/atlasLifeSystems"
import { tickSocietyCycle } from "../src/lib/sim/societyCycle"
import { agentHash } from "../src/lib/sim/kernels"
import { resetPathBudget } from "../src/lib/sim/pathfinding"
import { tickBandits } from "../src/lib/sim/bandits"
import { tickBuildProjects } from "../src/lib/sim/construction"
import { tickWorkOrders } from "../src/lib/sim/build/workOrders"
import { tickClimate } from "../src/lib/sim/climate"
import { compactIndex } from "../src/lib/sim/resourceIndex"

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
function fill500(state: SimState) {
  let nextId = 0
  for (const v of state.villagers) if (v.id > nextId) nextId = v.id
  nextId++
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

const phases: Record<string, number> = {}
function mark(k: string, ms: number) { phases[k] = (phases[k] ?? 0) + ms }

const state = createSimulation(7, {
  preset: "vast", worldSize: 1000,
  initialVillagers: INITIAL_VILLAGERS_MAX, maxPopulation: MAX_POPULATION_HARD_CAP, wolfCount: 2,
})
fill500(state)
for (let i = 0; i < 40; i++) { stepSimulation(state); if (i % 5 === 4) noteSimTps(15) }

const sample = 12
const tFull0 = performance.now()
for (let i = 0; i < sample; i++) stepSimulation(state)
const fullMs = (performance.now() - tFull0) / sample

for (let n = 0; n < sample; n++) {
  let alive = 0
  for (const v of state.villagers) if (v.alive) alive++
  let a0 = performance.now()
  setAliveAgentCount(alive); resetPathBudget(alive); agentHash.rebuild(state)
  mark("hash", performance.now() - a0)

  a0 = performance.now(); tickClimate(state, () => 0.4); mark("climate", performance.now() - a0)

  const stride = villagerLodStride(alive)
  let nFull = 0, nLight = 0
  a0 = performance.now()
  for (const v of state.villagers) {
    if (!v.alive) continue
    const urgent = v.hunger < 0.85 || v.starveTimer > 0 || (!!v.task && (v.task.kind === "flee" || v.task.kind === "fight" || v.task.kind === "defend"))
    const light = !urgent && stride > 1 && (state.tick + v.id) % stride !== 0
    if (light) nLight++; else nFull++
    tickVillager(state, v, () => 0.37, light)
  }
  mark("villagers", performance.now() - a0)
  mark("nFull", nFull); mark("nLight", nLight)

  a0 = performance.now(); tickTrade(state); tickFields(state); tickCombat(state, () => 0.4); tickBandits(state, () => 0.4)
  mark("actors", performance.now() - a0)

  a0 = performance.now(); tickRegrowth(state, () => 0.4); mark("regrowth", performance.now() - a0)
  a0 = performance.now(); state.compactCursor = compactIndex(state.grid.index, state.grid, state.compactCursor); mark("compact", performance.now() - a0)
  a0 = performance.now(); tickPolitics(state); mark("politics", performance.now() - a0)
  a0 = performance.now(); tickSocietyCycle(state); tickAtlasLifeSystems(state); mark("atlas_soc", performance.now() - a0)
  a0 = performance.now(); tickBuildProjects(state); tickWorkOrders(state); mark("build", performance.now() - a0)
  state.tick++
}

const ranked = Object.entries(phases)
  .filter(([k]) => !k.startsWith("n"))
  .map(([k, ms]) => ({ phase: k, msPerTick: +(ms / sample).toFixed(2) }))
  .sort((a, b) => b.msPerTick - a.msPerTick)

console.log(JSON.stringify({
  fullMsPerTick: +fullMs.toFixed(2),
  fullTps: +(1000 / fullMs).toFixed(1),
  avgFull: +(phases.nFull / sample).toFixed(1),
  avgLight: +(phases.nLight / sample).toFixed(1),
  stride: villagerLodStride(500),
  budget: getSimPerfBudget(),
  ranked,
}, null, 2))