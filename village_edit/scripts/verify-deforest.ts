/**
 * Headless deforestation check — trees near village drop, fields rise over weeks.
 * Run: npx tsx scripts/verify-deforest.ts
 */
import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { TREE, WHEAT, FIELD } from '../src/lib/sim/types'
import { getTerrain, inBounds } from '../src/lib/sim/world'

const SEEDS = [1, 7, 42]
const DAYS = 42
const RING = 18

function countNear(
  state: ReturnType<typeof createSimulation>,
  cx: number,
  cy: number,
  r: number,
): { trees: number; fields: number; wheat: number } {
  const grid = state.grid
  let trees = 0
  let fields = 0
  let wheat = 0
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if (!inBounds(grid, x, y)) continue
      if (Math.hypot(x - cx, y - cy) > r) continue
      const t = getTerrain(grid, x, y)
      if (t === TREE) trees++
      else if (t === FIELD) fields++
      else if (t === WHEAT) wheat++
    }
  }
  return { trees, fields, wheat }
}

function villageAnchor(state: ReturnType<typeof createSimulation>): { x: number; y: number } {
  const vg = state.villages[0]
  if (vg) return { x: vg.centerX, y: vg.centerY }
  const home = state.villagers.find((v) => v.alive && v.hasHome)
  if (home) return { x: home.homeX, y: home.homeY }
  const any = state.villagers.find((v) => v.alive)
  return { x: Math.round(any?.x ?? 64), y: Math.round(any?.y ?? 64) }
}

let pass = 0
for (const seed of SEEDS) {
  const state = createSimulation(seed)
  const a0 = villageAnchor(state)
  const d0 = countNear(state, a0.x, a0.y, RING)
  const snap: { day: number; trees: number; fields: number; wheat: number; hasField: number }[] = []
  snap.push({ day: 0, ...d0, hasField: state.villagers.filter((v) => v.alive && v.hasField).length })

  for (let t = 1; t <= DAYS * TICKS_PER_DAY; t++) {
    stepSimulation(state)
    if (t % (TICKS_PER_DAY * 7) === 0) {
      const a = villageAnchor(state)
      const d = countNear(state, a.x, a.y, RING)
      snap.push({
        day: t / TICKS_PER_DAY,
        ...d,
        hasField: state.villagers.filter((v) => v.alive && v.hasField).length,
      })
    }
  }

  const last = snap[snap.length - 1]!
  const first = snap[0]!
  const treesDrop = last.trees < first.trees
  const fieldsRise = last.fields + last.wheat > first.fields + first.wheat || last.hasField > first.hasField
  const ok = treesDrop && fieldsRise
  if (ok) pass++
  const stats = computeStats(state)
  console.log(
    JSON.stringify({
      seed,
      ok,
      treesDrop,
      fieldsRise,
      trees0: first.trees,
      treesEnd: last.trees,
      fieldTiles0: first.fields + first.wheat,
      fieldTilesEnd: last.fields + last.wheat,
      hasField0: first.hasField,
      hasFieldEnd: last.hasField,
      pop: stats.villagers,
      weekly: snap,
    }),
  )
}

if (pass < SEEDS.length) {
  console.error(`FAIL: ${pass}/${SEEDS.length} seeds showed deforestation + fields`)
  process.exit(1)
}
console.log(`PASS: ${pass}/${SEEDS.length} seeds — trees down, fields up near village`)
