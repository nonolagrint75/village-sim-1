import { createSimulation, stepSimulation } from './src/lib/sim/engine'
import { TICKS_PER_DAY } from './src/lib/sim/calendar'
import { WALL_WOOD, WALL_STONE } from './src/lib/sim/types'
import { getTerrain } from './src/lib/sim/world'

const state = createSimulation(7)
for (let t = 1; t <= 55 * TICKS_PER_DAY; t++) stepSimulation(state)

for (const vg of state.villages) {
  let wood = 0
  let stone = 0
  const total = vg.perimeter.length
  for (const c of vg.perimeter) {
    const ter = getTerrain(state.grid, c.x, c.y)
    if (ter === WALL_WOOD) wood++
    if (ter === WALL_STONE) stone++
  }
  console.log(
    JSON.stringify({
      id: vg.id,
      tier: vg.wallTier,
      perimeter: total,
      wood,
      stone,
      cover: vg.naturalCover,
      members: vg.memberIds.length,
      progress: total ? ((wood + stone) / total).toFixed(2) : '0',
    }),
  )
}
console.log(
  'fortify',
  JSON.stringify(
    state.projects
      .filter((p) => p.intent.purposes.includes('fortify'))
      .map((p) => ({
        id: p.id,
        label: p.label,
        phase: p.phase,
        scale: p.intent.scale,
        pending: p.pending?.length ?? 0,
        rx: p.params.rx,
        ry: p.params.ry,
      })),
  ),
)
console.log('alive', state.villagers.filter((v) => v.alive).length, 'bandits', state.bandits.filter((b) => b.alive).length)
