/**
 * Embark probe after boats exist — npx tsx _embark_probe.ts [seed] [days]
 */
import { createSimulation, stepSimulation } from './src/lib/sim/engine'
import { TICKS_PER_DAY } from './src/lib/sim/calendar'
import { WATER } from './src/lib/sim/types'
import { getTerrain } from './src/lib/sim/world'

const seed = Number(process.argv[2] ?? 42)
const days = Number(process.argv[3] ?? 40)
const state = createSimulation(seed)

let fishTicks = 0
let fishWithBoat = 0
let embarkedSeen = 0
let besideBoat = 0
let firstBoatDay = -1

for (let t = 1; t <= days * TICKS_PER_DAY; t++) {
  stepSimulation(state)
  if (state.boats.length > 0 && firstBoatDay < 0) firstBoatDay = Math.ceil(t / TICKS_PER_DAY)
  for (const v of state.villagers) {
    if (!v.alive) continue
    if (v.embarked) embarkedSeen++
    if (v.task?.kind === 'fish') {
      fishTicks++
      if (v.boatId != null) {
        fishWithBoat++
        const boat = state.boats.find((b) => b.id === v.boatId && b.alive)
        if (boat) {
          const dx = Math.abs(v.x - boat.x)
          const dy = Math.abs(v.y - boat.y)
          if (Math.max(dx, dy) <= 1) besideBoat++
        }
      }
    }
  }
}

const owners = state.villagers.filter((v) => v.alive && v.boatId != null)
console.log({
  seed,
  days,
  firstBoatDay,
  boats: state.boats.length,
  owners: owners.length,
  fishTicks,
  fishWithBoat,
  besideBoat,
  embarkedSeen,
  ownerDetail: owners.map((v) => ({
    name: v.name,
    boatId: v.boatId,
    embarked: v.embarked,
    task: v.task?.kind ?? null,
    pos: `${v.x},${v.y}`,
    terrain: getTerrain(state.grid, v.x, v.y) === WATER ? 'WATER' : 'land',
  })),
  boatsDetail: state.boats.map((b) => ({
    id: b.id,
    pos: `${b.x},${b.y}`,
    terrain: getTerrain(state.grid, b.x, b.y) === WATER ? 'WATER' : 'land',
    alive: b.alive,
    ownerId: b.ownerId,
  })),
})
