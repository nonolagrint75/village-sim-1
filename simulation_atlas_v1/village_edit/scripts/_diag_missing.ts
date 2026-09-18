import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { noteSimTps, getSimPerfBudget } from '../src/lib/sim/perfBudget'
import { WORLD_SIZE, type SimState, type Villager, type Slot } from '../src/lib/sim/types'
import { tickAtlasLifeSystems } from '../src/lib/sim/emergence/atlasLifeSystems'
import { tickSocietyCycle } from '../src/lib/sim/societyCycle'
import { tickBuildProjects } from '../src/lib/sim/construction'
import { tickWorkOrders } from '../src/lib/sim/build/workOrders'
import { tickRegrowth, tickSheep, tickHorse, tickWolf } from '../src/lib/sim/behaviors'
import { compactIndex } from '../src/lib/sim/resourceIndex'
import { tickRoadWear } from '../src/lib/sim/roads'

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
for (let i = 0; i < 35; i++) { noteSimTps(50); stepSimulation(state) }
const N = 10
const acc: Record<string, number> = {}
const add = (k: string, ms: number) => { acc[k] = (acc[k] ?? 0) + ms }
for (let n = 0; n < N; n++) {
  let t = performance.now(); stepSimulation(state); add('fullStep', performance.now() - t)
  t = performance.now(); tickAtlasLifeSystems(state); add('atlas', performance.now() - t)
  t = performance.now(); tickSocietyCycle(state); add('society', performance.now() - t)
  t = performance.now(); tickBuildProjects(state); tickWorkOrders(state); add('build', performance.now() - t)
  t = performance.now(); tickRegrowth(state, () => 0.4); add('regrowth', performance.now() - t)
  t = performance.now()
  for (const s of state.sheep) if (s.alive) tickSheep(state, s, () => 0.4)
  for (const h of state.horses) if (h.alive) tickHorse(state, h, () => 0.4)
  for (const w of state.wolves) if (w.alive) tickWolf(state, w, () => 0.4)
  add('animals', performance.now() - t)
  t = performance.now(); state.compactCursor = compactIndex(state.grid.index, state.grid, state.compactCursor); add('compact', performance.now() - t)
  t = performance.now(); tickRoadWear(state.grid, state.tick); add('roads', performance.now() - t)
}
const ranked = Object.entries(acc).map(([k,v]) => ({k, ms:+(v/N).toFixed(2)})).sort((a,b)=>b.ms-a.ms)
console.log(JSON.stringify({ ranked, budget: getSimPerfBudget() }, null, 2))