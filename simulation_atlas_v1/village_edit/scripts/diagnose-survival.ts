/**
 * Headless survival/economy usage probe.
 *   npx tsx scripts/diagnose-survival.ts [seed] [days] [logEveryDays]
 */
import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { countOf, edibleValue } from '../src/lib/sim/inventory'
import type { SimState, TaskKind } from '../src/lib/sim/types'

const seed = Number(process.argv[2] ?? 42)
const days = Number(process.argv[3] ?? 90)
const logEveryDays = Number(process.argv[4] ?? 30)
const ticks = days * TICKS_PER_DAY
const logEvery = Math.max(1, logEveryDays) * TICKS_PER_DAY

const FOCUS: TaskKind[] = [
  'eat', 'gatherFood', 'gatherWood', 'gatherStone', 'gatherIron', 'mineTunnel', 'mineGold',
  'craftSpear', 'craftStoneSpear', 'craftIronTool', 'craftGear', 'craftGoods',
  'sowField', 'harvestWheat', 'storeChest', 'takeFromChest',
  'buildWorkbench', 'buildChest', 'buildPen', 'makeCharcoal', 'weaveCloth', 'bakeBread', 'grindFlour',
]

function bump(map: Record<string, number>, key: string, n = 1) {
  map[key] = (map[key] ?? 0) + n
}

function foodStocks(state: SimState) {
  let food = 0, meat = 0, wheat = 0, flour = 0, bread = 0, fish = 0, edible = 0
  for (const v of state.villagers) {
    if (!v.alive) continue
    food += countOf(v.inventory, 'food'); meat += countOf(v.inventory, 'meat')
    wheat += countOf(v.inventory, 'wheat'); flour += countOf(v.inventory, 'flour')
    bread += countOf(v.inventory, 'bread'); fish += countOf(v.inventory, 'fish')
    edible += edibleValue(v.inventory)
    if (v.chestInventory) {
      food += countOf(v.chestInventory, 'food'); meat += countOf(v.chestInventory, 'meat')
      wheat += countOf(v.chestInventory, 'wheat'); flour += countOf(v.chestInventory, 'flour')
      bread += countOf(v.chestInventory, 'bread'); fish += countOf(v.chestInventory, 'fish')
      edible += edibleValue(v.chestInventory)
    }
  }
  return { food, meat, wheat, flour, bread, fish, edible }
}

function infra(state: SimState) {
  let workbenches = 0, chests = 0, fields = 0, fieldClaims = 0, pens = 0, homes = 0
  let ironTools = 0, stoneTools = 0, woodTools = 0, minesClaimed = 0
  for (const v of state.villagers) {
    if (!v.alive) continue
    if (v.hasWorkbench) workbenches++
    if (v.hasChest) chests++
    if (v.hasField) fields++
    if (v.fieldX >= 0) fieldClaims++
    if (v.hasPen) pens++
    if (v.hasHome && v.homeOwnerId === v.id) homes++
    if (v.toolTier === 'iron') ironTools++
    else if (v.toolTier === 'stone') stoneTools++
    else if (v.toolTier === 'wood') woodTools++
  }
  for (const vg of state.villages) if (vg.mineX >= 0 && vg.mineY >= 0) minesClaimed++
  return { workbenches, chests, fields, fieldClaims, pens, homes, ironTools, stoneTools, woodTools, minesClaimed }
}

console.log(`diagnose-survival seed=${seed} days=${days} ticks=${ticks}`)
const state = createSimulation(seed)
const taskStarts: Record<string, number> = {}
const taskTicks: Record<string, number> = {}
const completions: Record<string, number> = {}
let meals = 0
const prevKind = new Map<number, TaskKind | null>()
const hungerBefore = new Map<number, number>()
const edibleBefore = new Map<number, number>()
const t0 = Date.now()

for (let t = 1; t <= ticks; t++) {
  for (const v of state.villagers) {
    if (!v.alive) continue
    hungerBefore.set(v.id, v.hunger)
    edibleBefore.set(v.id, edibleValue(v.inventory))
  }
  stepSimulation(state)
  for (const v of state.villagers) {
    if (!v.alive) continue
    const bh = hungerBefore.get(v.id) ?? v.hunger
    const be = edibleBefore.get(v.id) ?? 0
    if (be > edibleValue(v.inventory) + 0.05 && v.hunger > bh + 0.15) meals++
    const kind = v.task?.kind ?? null
    const prev = prevKind.get(v.id) ?? null
    if (kind) bump(taskTicks, kind)
    if (kind && kind !== prev) bump(taskStarts, kind)
    if (prev && !kind) bump(completions, prev)
    prevKind.set(v.id, kind)
  }
  if (t % logEvery === 0) {
    const s = computeStats(state)
    const food = foodStocks(state)
    const inf = infra(state)
    console.log(
      `\n[day ${t / TICKS_PER_DAY}] alive=${s.villagers} deaths=${s.deaths} famine=${s.famine} meals≈${meals}`,
    )
    console.log(
      `  homes=${inf.homes} wb=${inf.workbenches} chests=${inf.chests} fields=${inf.fields}/${inf.fieldClaims} pens=${inf.pens} mines=${inf.minesClaimed} tools=${inf.woodTools}/${inf.stoneTools}/${inf.ironTools}`,
    )
    console.log(
      `  food baies=${food.food} meat=${food.meat} fish=${food.fish} wheat=${food.wheat} edible=${food.edible.toFixed(0)}`,
    )
  }
}

const s = computeStats(state)
const food = foodStocks(state)
const inf = infra(state)
console.log(`\n[FINAL] alive=${s.villagers} deaths=${s.deaths} births=${s.births} meals≈${meals}`)
console.log(
  `  homes=${inf.homes} wb=${inf.workbenches} chests=${inf.chests} fields=${inf.fields}/${inf.fieldClaims} pens=${inf.pens} mines=${inf.minesClaimed} tools=${inf.woodTools}/${inf.stoneTools}/${inf.ironTools}`,
)
console.log(
  `  food baies=${food.food} meat=${food.meat} fish=${food.fish} wheat=${food.wheat} flour=${food.flour} bread=${food.bread} edible=${food.edible.toFixed(0)}`,
)

console.log('\n=== FOCUS USAGE ===')
for (const k of FOCUS) {
  const starts = taskStarts[k] ?? 0
  const used = starts > 0 || (k === 'eat' && meals > 0)
  console.log(
    `${(used ? 'USED' : 'UNUSED').padEnd(6)} ${k.padEnd(18)} starts=${String(starts).padStart(5)} ticks=${String(taskTicks[k] ?? 0).padStart(7)} done=${String(completions[k] ?? 0).padStart(5)}`,
  )
}
const top = Object.entries(taskStarts).sort((a, b) => b[1] - a[1]).slice(0, 12)
console.log('\nTop starts:', top.map(([k, n]) => `${k}:${n}`).join(', '))
const elapsed = (Date.now() - t0) / 1000
console.log(`Elapsed ${elapsed.toFixed(1)}s (${Math.round(ticks / Math.max(0.001, elapsed))} ticks/s)`)
