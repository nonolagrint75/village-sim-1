import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { fortifyIsBuilt } from '../src/lib/sim/construction'
import { HOUSE, WALL_STONE, WALL_WOOD } from '../src/lib/sim/types'
import { writeFileSync } from 'fs'

const lines: string[] = []
const log = (s: string) => {
  lines.push(s)
  console.log(s)
}

try {
  for (const seed of [3, 7, 11, 42]) {
    const state = createSimulation(seed)
    const days = 90
    let bp = 0
    for (let t = 1; t <= days * TICKS_PER_DAY; t++) {
      stepSimulation(state)
      for (const v of state.villagers) if (v.alive && v.task?.kind === 'buildProject') bp++
    }
    const forts = state.projects.filter((p) => p.intent.purposes.includes('fortify'))
    let sw = 0
    let ww = 0
    for (const ter of state.grid.terrain) {
      if (ter === WALL_STONE) sw++
      if (ter === WALL_WOOD) ww++
    }
    log(
      `seed ${seed} alive=${state.villagers.filter((v) => v.alive).length} bp=${bp} sw=${sw} ww=${ww} forts=${forts.length}`,
    )
    for (const p of forts) {
      let stamped = 0
      for (const c of [...p.footprint.walls, ...p.footprint.towers]) {
        const ter = state.grid.terrain[c.y * state.grid.width + c.x]
        if (ter === WALL_STONE || ter === WALL_WOOD || ter === HOUSE) stamped++
      }
      log(
        `  ${JSON.stringify({
          id: p.id,
          phase: p.phase,
          mat: p.params.wallMaterial,
          rx: p.params.rx,
          towers: p.params.towers,
          pending: p.pending.length,
          wallN: p.footprint.walls.length,
          stamped,
          built: fortifyIsBuilt(state, p),
          label: p.label,
        })}`,
      )
    }
  }
} catch (e) {
  log(`ERROR ${e instanceof Error ? e.stack ?? e.message : String(e)}`)
}

writeFileSync('scripts/_fort_debug_out.txt', lines.join('\n'))
