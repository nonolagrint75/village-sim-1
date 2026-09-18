/**
 * Headless fort/keep proof — run: npx tsx scripts/_probe_fort.ts [seed] [days]
 */
import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { fortifyIsBuilt } from '../src/lib/sim/construction'
import { WALL_STONE, WALL_WOOD } from '../src/lib/sim/types'

const seed = Number(process.argv[2] ?? 7)
const days = Number(process.argv[3] ?? 120)
const ticks = days * TICKS_PER_DAY

const state = createSimulation(seed)
let buildProjectTicks = 0
let fortProposeLog = 0
let fortDoneLog = 0

const snap = (d: number) => {
  const s = computeStats(state)
  let fortOpen = 0
  let fortBuilt = 0
  let keepLike = 0
  let towers = 0
  let stoneWall = 0
  let woodWall = 0
  for (const p of state.projects) {
    if (!p.intent.purposes.includes('fortify')) continue
    if (p.phase !== 'done') fortOpen++
    if (fortifyIsBuilt(state, p)) {
      fortBuilt++
      if (p.params.towers) towers++
    } else if (p.phase !== 'done' && p.params.towers) {
      towers++
    }
    if (p.params.wallMaterial === 'stone' || p.intent.scale >= 0.55) keepLike++
  }
  for (let i = 0; i < state.grid.terrain.length; i++) {
    const t = state.grid.terrain[i]
    if (t === WALL_STONE) stoneWall++
    else if (t === WALL_WOOD) woodWall++
  }
  let keepTech = 0
  let stackTech = 0
  for (const vg of state.villages) {
    for (const k of vg.knowledge ?? []) {
      if (k.id === 'high_stone_keep' && k.confidence >= 0.25) keepTech++
      if (k.id === 'stack_stone_high' && k.confidence >= 0.2) stackTech++
    }
  }
  console.log(
    JSON.stringify({
      day: d,
      alive: s.villagers,
      villages: s.villages,
      fortOpen,
      fortBuilt,
      keepLike,
      towers,
      stoneWall,
      woodWall,
      buildProjectTicks,
      fortProposeLog,
      fortDoneLog,
      stackTech,
      keepTech,
      wallTiers: state.villages.map((v) => v.wallTier).join(','),
    }),
  )
}

console.log(`Fort probe seed=${seed} days=${days}`)
snap(0)

for (let t = 1; t <= ticks; t++) {
  const logAt = state.log.length
  stepSimulation(state)
  for (const v of state.villagers) {
    if (v.alive && v.task?.kind === 'buildProject') buildProjectTicks++
  }
  for (let i = logAt; i < state.log.length; i++) {
    const line = state.log[i].toLowerCase()
    if (/projet de /.test(line) && /fort|donjon|enceinte|palissade|keep/.test(line)) fortProposeLog++
    if (/achevé/.test(line) && /fort|donjon|enceinte|palissade|keep|tours/.test(line)) fortDoneLog++
  }
  if (t % TICKS_PER_DAY === 0 && (t / TICKS_PER_DAY) % 20 === 0) snap(t / TICKS_PER_DAY)
}

snap(days)
const fortBuilt = state.projects.filter((p) => fortifyIsBuilt(state, p)).length
const fortAny = state.projects.filter((p) => p.intent.purposes.includes('fortify')).length
const stoneWall = state.grid.terrain.reduce((n, t) => n + (t === WALL_STONE ? 1 : 0), 0)
const woodWall = state.grid.terrain.reduce((n, t) => n + (t === WALL_WOOD ? 1 : 0), 0)
console.log(
  JSON.stringify({
    proof: {
      fortProjects: fortAny,
      fortBuilt,
      stoneWallTiles: stoneWall,
      woodWallTiles: woodWall,
      buildProjectTicks,
      fortProposeLog,
      fortDoneLog,
      ok: fortBuilt > 0 || stoneWall > 0 || (woodWall > 8 && buildProjectTicks > 0),
    },
  }),
)
