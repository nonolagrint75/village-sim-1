/**
 * Evidence: bag empty + chest food + hungry → takeFromChest → eat (not resume work).
 *   npx tsx scripts/_probe_chest_eat.ts [plain|interrupted|gatherFood]
 */
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { addToInventory, edibleValue, createInventory } from '../src/lib/sim/inventory'
import type { TaskKind } from '../src/lib/sim/types'

const SCENARIO = (process.argv[2] as string) || 'gatherFood'
const state = createSimulation(42)
const v =
  state.villagers.find((x) => x.alive && x.hasChest && x.chestInventory) ??
  state.villagers.find((x) => x.alive)!

v.hasChest = true
if (!v.chestInventory) v.chestInventory = createInventory(8)
for (const slot of v.inventory) {
  slot.type = null
  slot.count = 0
}
for (const slot of v.chestInventory) {
  slot.type = null
  slot.count = 0
}
addToInventory(v.chestInventory, 'bread', 4)
v.hunger = 0.9
v.starveTimer = 0
v.task = null
v.savedTask = null
v.nextThinkTick = state.tick
if (v.chestX >= 0) {
  v.x = v.chestX
  v.y = v.chestY
}

if (SCENARIO === 'interrupted' || SCENARIO === 'gatherFood') {
  const kind = (SCENARIO === 'gatherFood' ? 'gatherFood' : 'gatherWood') as TaskKind
  v.savedTask = {
    kind,
    targetX: v.x + 8,
    targetY: v.y + 8,
    targetId: null,
    resource: null,
    ageTicks: 20,
    work: 3,
    stuckTicks: 0,
    path: null,
    pathI: 0,
    pathTx: 0,
    pathTy: 0,
    pathTick: -999,
  }
}

type Snap = {
  tick: number
  hunger: number
  bag: number
  chest: number
  task: string | null
  saved: string | null
}

const snaps: Snap[] = []
let lastKey = ''
for (let i = 0; i < 120; i++) {
  stepSimulation(state)
  const snap: Snap = {
    tick: state.tick,
    hunger: +v.hunger.toFixed(3),
    bag: edibleValue(v.inventory),
    chest: edibleValue(v.chestInventory!),
    task: v.task?.kind ?? null,
    saved: v.savedTask?.kind ?? null,
  }
  const key = `${snap.task}|${snap.bag}|${snap.chest}|${snap.hunger}|${snap.saved}`
  if (key !== lastKey) {
    snaps.push(snap)
    lastKey = key
  }
  if (v.hunger >= 2.2) break
}

const ate = snaps.some((s, i) => i > 0 && s.hunger > snaps[i - 1]!.hunger + 0.15)
const idxEat = snaps.findIndex((s) => s.task === 'eat')
const idxResume = snaps.findIndex(
  (s) => s.task === 'gatherWood' || s.task === 'gatherFood' || s.task === 'fish' || s.task === 'harvestWheat',
)
const firstTask = snaps[0]?.task ?? null
const chainedSameTick =
  firstTask === 'eat' && (snaps[0]?.bag ?? 0) > 0 && (snaps[0]?.chest ?? 1) === 0 && (snaps[0]?.saved ?? null) !== null

console.log(
  JSON.stringify(
    {
      scenario: SCENARIO,
      villager: v.id,
      ate,
      sawEatTask: idxEat >= 0,
      // After fix: first lasting task should be eat (saved work kept), not resume forage.
      firstTaskAfterPull: firstTask,
      savedWhileEating: snaps.find((s) => s.task === 'eat')?.saved ?? null,
      chainedTakeThenEat: chainedSameTick || (idxEat >= 0 && ate && (idxResume < 0 || idxEat <= idxResume)),
      resumedWorkBeforeEat: idxResume >= 0 && (idxEat < 0 || idxResume < idxEat) && !ate,
      finalHunger: +v.hunger.toFixed(3),
      finalBag: edibleValue(v.inventory),
      finalChest: edibleValue(v.chestInventory!),
      snaps: snaps.slice(0, 20),
    },
    null,
    2,
  ),
)
