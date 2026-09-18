/**
 * Focused mine emergence diagnostics.
 * npx tsx scripts/_probe_atlas_mines.ts [seed] [days]
 */
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { MOUNTAIN, TUNNEL } from '../src/lib/sim/types'
import { getTerrain } from '../src/lib/sim/world'
import { findMineEntranceSite, localOreRichness } from '../src/lib/sim/mining'

const seed = Number(process.argv[2] ?? 7)
const days = Number(process.argv[3] ?? 35)
const state = createSimulation(seed)

let claims = 0
let digStarts = 0
let tunnels = 0
let firstMine = -1
const toolHist: Record<string, number> = {}

for (let d = 0; d <= days; d++) {
  if (d > 0) {
    const end = d * TICKS_PER_DAY
    while (state.tick < end) {
      for (const v of state.villagers) {
        if (!v.alive) continue
        toolHist[v.toolTier] = (toolHist[v.toolTier] ?? 0) + 1
        if (v.task?.kind === 'mineTunnel') digStarts++
      }
      const before = state.villages.filter((vg) => vg.mineX >= 0).length
      stepSimulation(state)
      const after = state.villages.filter((vg) => vg.mineX >= 0).length
      if (after > before) claims++
      if (firstMine < 0 && state.villages.some((vg) => vg.hasMine)) firstMine = d
    }
  }
  let nearMtn = 0
  let sites = 0
  let richness = 0
  for (const vg of state.villages) {
    const site = findMineEntranceSite(state.grid, vg.centerX, vg.centerY, 80)
    if (site) {
      sites++
      richness += localOreRichness(state.grid, site.mountainX, site.mountainY, 6)
      nearMtn++
    }
  }
  for (let y = 0; y < state.grid.height; y++) {
    for (let x = 0; x < state.grid.width; x++) {
      const t = getTerrain(state.grid, x, y)
      if (t === TUNNEL) tunnels++
    }
  }
  const mines = state.villages.filter((vg) => vg.hasMine).length
  const claimed = state.villages.filter((vg) => vg.mineX >= 0).length
  const pop = state.villagers.filter((v) => v.alive).length
  const stoneTools = state.villagers.filter((v) => v.alive && (v.toolTier === 'stone' || v.toolTier === 'iron')).length
  const woodTools = state.villagers.filter((v) => v.alive && v.toolTier === 'wood').length
  console.log(JSON.stringify({
    day: d, pop, mines, claimed, sites, nearMtn, richness: +richness.toFixed(1),
    tunnels, digStarts, stoneTools, woodTools, firstMine,
  }))
  tunnels = 0
  digStarts = 0
}
console.log('toolSamples', toolHist)
