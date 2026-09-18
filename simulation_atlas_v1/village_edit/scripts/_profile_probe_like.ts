import { createSimulation, stepSimulation } from "../src/lib/sim/engine"
import { noteSimTps, getSimPerfBudget } from "../src/lib/sim/perfBudget"
import { INITIAL_VILLAGERS_MAX, MAX_POPULATION_HARD_CAP } from "../src/lib/sim/simConfig"
import { WORLD_SIZE, type SimState, type Villager, type Slot } from "../src/lib/sim/types"

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

const state = createSimulation(7, {
  preset: "vast", worldSize: 1000,
  initialVillagers: INITIAL_VILLAGERS_MAX, maxPopulation: MAX_POPULATION_HARD_CAP, wolfCount: 2,
})
fill500(state)

// Mirror probe warm
let w0 = performance.now(), wt = 0, last = w0
while (performance.now() - w0 < 2000) {
  stepSimulation(state); wt++
  const now = performance.now()
  if (now - last >= 500) { noteSimTps(wt / ((now - w0) / 1000)); last = now }
}
noteSimTps(wt / ((performance.now() - w0) / 1000))

const slices: number[] = []
const t0 = performance.now()
let ticks = 0, lastNote = t0
const deadline = t0 + 4000
while (performance.now() < deadline) {
  const a = performance.now()
  stepSimulation(state)
  const b = performance.now()
  ticks++
  if (b - lastNote >= 1000) {
    const slice = ticks / ((b - t0) / 1000)
    slices.push(+slice.toFixed(1))
    noteSimTps(slice)
    lastNote = b
  }
}
const elapsed = (performance.now() - t0) / 1000
console.log(JSON.stringify({
  warmTicks: wt,
  ticks,
  elapsed: +elapsed.toFixed(3),
  measuredTps: +(ticks / elapsed).toFixed(1),
  slices,
  budget: getSimPerfBudget(),
  msPerTick: +((elapsed * 1000) / ticks).toFixed(2),
}, null, 2))