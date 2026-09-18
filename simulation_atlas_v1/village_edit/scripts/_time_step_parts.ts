import { createSimulation, stepSimulation } from "../src/lib/sim/engine"
import { noteSimTps, getSimPerfBudget, setAliveAgentCount, villagerLodStride } from "../src/lib/sim/perfBudget"
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

function cloneVillager(src: Villager, id: number, dx: number, dy: number): Villager {
  const lim = WORLD_SIZE - 2
  return {
    ...src, id, seed: (src.seed + id * 9973) >>> 0, name: `${src.name}_${id}`,
    lineageId: null, familyId: null, spouseId: null, marriageKind: null, marriedTick: 0,
    adoptiveParentIds: [], parentIds: [], motherId: null, fatherId: null,
    x: Math.max(2, Math.min(src.x + dx, lim)), y: Math.max(2, Math.min(src.y + dy, lim)),
    inventory: (src.inventory || []).map((s) => ({ ...s })),
    chestInventory: null, cupboardInventory: null,
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

const state = createSimulation(7, {
  preset: "vast", worldSize: 1000,
  initialVillagers: INITIAL_VILLAGERS_MAX, maxPopulation: MAX_POPULATION_HARD_CAP, wolfCount: 2,
})
fill500(state)
let w0 = performance.now(), wt = 0, last = w0
while (performance.now() - w0 < 2000) {
  stepSimulation(state); wt++
  const now = performance.now()
  if (now - last >= 500) { noteSimTps(wt / ((now - w0) / 1000)); last = now }
}
noteSimTps(wt / ((performance.now() - w0) / 1000))

const phases: Record<string, number> = {}
const mark = (k: string, ms: number) => { phases[k] = (phases[k] ?? 0) + ms }
const sample = 40
const tFull = performance.now()
for (let i = 0; i < sample; i++) stepSimulation(state)
const fullMs = (performance.now() - tFull) / sample

for (let n = 0; n < sample; n++) {
  // Approximate engine villager LOD
  let alive = 0
  for (const v of state.villagers) if (v.alive) alive++
  const perf = getSimPerfBudget()
  const tps = perf.lastTps
  const vStride = villagerLodStride(alive)
  let fullBudget = tps < 90 ? 2 : 4
  let urgentBudget = tps < 90 ? 4 : 8
  let a0 = performance.now()
  setAliveAgentCount(alive); resetPathBudget(alive)
  if (state.tick % 2 === 0) agentHash.rebuild(state)
  mark("setup", performance.now() - a0)
  a0 = performance.now(); tickClimate(state, () => 0.4); mark("climate", performance.now() - a0)
  a0 = performance.now()
  let nTick = 0
  for (const v of state.villagers) {
    if (!v.alive) continue
    const combat = !!v.task && (v.task.kind === "flee" || v.task.kind === "fight" || v.task.kind === "defend")
    const urgent = v.hunger < 0.45 || v.starveTimer > 3 || combat
    let light = !urgent && vStride > 1 && (state.tick + v.id) % vStride !== 0
    if (urgent) {
      if (urgentBudget <= 0 && !combat) light = true
      else urgentBudget--
    } else if (!light) {
      if (fullBudget <= 0) light = true
      else fullBudget--
    }
    if (light && !combat && (state.tick + v.id) % 8 !== 0) continue
    nTick++
    tickVillager(state, v, () => 0.37, light)
  }
  mark("villagers", performance.now() - a0)
  mark("nTick", nTick)
  a0 = performance.now(); tickTrade(state); tickFields(state); mark("trade_fields", performance.now() - a0)
  a0 = performance.now(); tickCombat(state, () => 0.4); tickBandits(state, () => 0.4); mark("combat_bandits", performance.now() - a0)
  a0 = performance.now(); tickPolitics(state); mark("politics", performance.now() - a0)
  a0 = performance.now(); tickSocietyCycle(state); tickAtlasLifeSystems(state); mark("atlas", performance.now() - a0)
  a0 = performance.now(); tickBuildProjects(state); tickWorkOrders(state); mark("build", performance.now() - a0)
  a0 = performance.now(); tickRegrowth(state, () => 0.4); mark("regrowth", performance.now() - a0)
  state.tick++
}
const ranked = Object.entries(phases).filter(([k]) => k !== "nTick")
  .map(([k, ms]) => ({ k, ms: +(ms / sample).toFixed(2) }))
  .sort((a, b) => b.ms - a.ms)
console.log(JSON.stringify({
  fullMs: +fullMs.toFixed(2), fullTps: +(1000 / fullMs).toFixed(1),
  avgNTick: +(phases.nTick / sample).toFixed(1),
  sheep: state.sheep.length, horses: state.horses.length, wolves: state.wolves.length,
  ranked, budget: getSimPerfBudget(),
}, null, 2))