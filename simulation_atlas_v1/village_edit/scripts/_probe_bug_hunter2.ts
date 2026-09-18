import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { isNight, distance } from '../src/lib/sim/world'
import { restTaskLabel } from '../src/lib/sim/labels'
import type { SimState, Villager } from '../src/lib/sim/types'

const seeds = String(process.argv[2] ?? '1,7,42').split(',').map(Number)
const days = Number(process.argv[3] ?? 45)
const ticks = days * TICKS_PER_DAY

type C = {
  seed: number
  nan: number; nanEx: string[]
  neg: number; negEx: string[]
  ghost: number; ghostEx: string[]
  homeGhost: number
  spouseGhost: number
  taskGhost: number
  stuckLong: number; stuckKinds: Record<string, number>; maxStuck: number
  dayRestOut: number; dayRestHome: number; dayRestCommute: number; dayRest: number; dayN: number
  dayIdle: number; dayWork: number
  restLie: number; restLieEx: string[]
  campTp: number; campIn: number
  deaths: number; alive: number
}

function push(a: string[], s: string) { if (a.length < 10) a.push(s) }
function bump(m: Record<string, number>, k: string) { m[k] = (m[k] ?? 0) + 1 }

function check(c: C, lab: string, n: number, lo = -0.001, hi = 1e9) {
  if (!Number.isFinite(n)) { c.nan++; push(c.nanEx, lab + '=' + n); return }
  if (n < lo || n > hi) { c.neg++; push(c.negEx, lab + '=' + n) }
}

function ghosts(state: SimState, v: Villager, c: C) {
  if (v.spouseId != null) {
    const s = state.villagers.find(o => o.id === v.spouseId)
    if (!s || !s.alive) { c.ghost++; c.spouseGhost++; push(c.ghostEx, `spouse ${v.id}->${v.spouseId}`) }
  }
  if (v.hasHome && (v.homeX < 0 || v.homeY < 0)) {
    c.ghost++; c.homeGhost++; push(c.ghostEx, `hasHome but homeXY ${v.id} ${v.homeX},${v.homeY}`)
  }
  if (v.homeOwnerId != null && v.homeOwnerId !== v.id) {
    const o = state.villagers.find(x => x.id === v.homeOwnerId)
    if (!o || !o.alive) { c.ghost++; c.homeGhost++; push(c.ghostEx, `homeOwner ${v.id}->${v.homeOwnerId}`) }
  }
  if (v.horseId != null) {
    const h = state.horses.find(x => x.id === v.horseId)
    if (!h || !h.alive) { c.ghost++; push(c.ghostEx, `horse ${v.id}->${v.horseId}`) }
  }
  if (v.boatId != null) {
    const b = state.boats.find(x => x.id === v.boatId)
    if (!b) { c.ghost++; push(c.ghostEx, `boat ${v.id}->${v.boatId}`) }
  }
  if (v.grudgeTarget != null) {
    const t = state.villagers.find(o => o.id === v.grudgeTarget)
    if (!t || !t.alive) { c.ghost++; push(c.ghostEx, `grudge ${v.id}->${v.grudgeTarget}`) }
  }
  const tid = v.task?.targetId
  if (tid != null && tid >= 0) {
    const k = v.task!.kind
    if (k === 'socialise' || k === 'giveFood' || k === 'confront' || k === 'defend' || k === 'steal') {
      const o = state.villagers.find(x => x.id === tid)
      if (!o || !o.alive) { c.ghost++; c.taskGhost++; push(c.ghostEx, `task ${k} ${v.id}->${tid}`) }
    }
  }
}

function run(seed: number): C {
  const c: C = {
    seed, nan:0, nanEx:[], neg:0, negEx:[], ghost:0, ghostEx:[],
    homeGhost:0, spouseGhost:0, taskGhost:0,
    stuckLong:0, stuckKinds:{}, maxStuck:0,
    dayRestOut:0, dayRestHome:0, dayRestCommute:0, dayRest:0, dayN:0,
    dayIdle:0, dayWork:0, restLie:0, restLieEx:[],
    campTp:0, campIn:0, deaths:0, alive:0,
  }
  const state = createSimulation(seed)
  const camp = new Map<number, {x:number;y:number}>()
  const WORK = new Set(['gatherFood','gatherWood','gatherStone','gatherIron','gatherFuel','clearLand','sowField','harvestWheat','fish','buildHouse','buildBed','buildChest','buildWorkbench','buildProject','buildHearth','buildTable','craftGoods','craftGear','craftSpear','mineTunnel','buildWall','grindFlour','bakeBread'])
  for (let t = 1; t <= ticks; t++) {
    stepSimulation(state)
    if (t % 2 !== 0 && t > TICKS_PER_DAY * 2) continue
    for (const band of state.bands) {
      const prev = camp.get(band.id)
      if (!prev) camp.set(band.id, {x: band.campX, y: band.campY})
      else if (prev.x !== band.campX || prev.y !== band.campY) {
        if (distance(prev.x, prev.y, band.campX, band.campY) > 8) c.campTp++
        camp.set(band.id, {x: band.campX, y: band.campY})
      }
      for (const vg of state.villages) {
        if (distance(band.campX, band.campY, vg.centerX, vg.centerY) < 20) c.campIn++
      }
    }
    const night = isNight(state.tick)
    for (const v of state.villagers) {
      if (!v.alive) continue
      check(c, `h${v.id}`, v.hunger, -0.001, 6.001)
      check(c, `s${v.id}`, v.stamina, -0.001, 4.001)
      check(c, `hp${v.id}`, v.health, -0.001, 6.001)
      check(c, `x${v.id}`, v.x, -1, 512)
      check(c, `y${v.id}`, v.y, -1, 512)
      for (const slot of v.inventory) if (slot.type && slot.count < 0) { c.neg++; push(c.negEx, `inv ${slot.type}=${slot.count}`) }
      ghosts(state, v, c)
      const st = v.task?.stuckTicks ?? 0
      if (st > c.maxStuck) c.maxStuck = st
      if (st >= 10) { c.stuckLong++; bump(c.stuckKinds, v.task?.kind ?? '?') }
      if (!night) {
        c.dayN++
        const k = v.task?.kind ?? 'null'
        if (k === 'idle') c.dayIdle++
        if (WORK.has(k)) c.dayWork++
        if (k === 'rest') {
          c.dayRest++
          const atHome = v.hasHome && distance(v.x,v.y,v.homeX,v.homeY) <= 2
          const homeBound = v.hasHome && distance(v.task!.targetX, v.task!.targetY, v.homeX, v.homeY) <= 4.5
          if (homeBound && !atHome) c.dayRestCommute++
          else if (atHome) c.dayRestHome++
          else c.dayRestOut++
          const label = restTaskLabel(v)
          // Lie: chez lui without being at home OR without home-bound target (no home bonuses)
          if (label === 'Se repose chez lui' && (!atHome || !homeBound)) {
            c.restLie++; push(c.restLieEx, `chez lie atHome=${atHome} bound=${homeBound} v${v.id}`)
          }
          if (label === 'Se repose dehors' && atHome && homeBound) {
            c.restLie++; push(c.restLieEx, `dehors at home v${v.id}`)
          }
          if (label === 'Rentre se reposer' && atHome) {
            c.restLie++; push(c.restLieEx, `rentre@home v${v.id}`)
          }
        }
      }
    }
  }
  const s = computeStats(state)
  c.alive = s.villagers; c.deaths = s.deaths
  return c
}

console.log('A13 refined hunter', seeds.join(','), 'd'+days)
for (const seed of seeds) {
  const t0 = Date.now()
  const c = run(seed)
  const p = (n:number,d:number) => d? ((100*n)/d).toFixed(1):'0'
  console.log(`\nseed ${seed} ${((Date.now()-t0)/1000).toFixed(1)}s alive=${c.alive} deaths=${c.deaths}`)
  console.log(`  NaN=${c.nan} neg=${c.neg} ghost=${c.ghost} (spouse=${c.spouseGhost} home=${c.homeGhost} task=${c.taskGhost})`)
  console.log(`  stuck>=10=${c.stuckLong} maxStuck=${c.maxStuck} kinds=${JSON.stringify(c.stuckKinds)}`)
  console.log(`  day rest ${p(c.dayRest,c.dayN)}% home=${p(c.dayRestHome,c.dayN)} commute=${p(c.dayRestCommute,c.dayN)} out=${p(c.dayRestOut,c.dayN)} idle=${p(c.dayIdle,c.dayN)} work=${p(c.dayWork,c.dayN)}`)
  console.log(`  campTp=${c.campTp} campIn=${c.campIn} restLie=${c.restLie}`)
  if (c.nanEx.length) console.log('  nan:', c.nanEx.join(' | '))
  if (c.negEx.length) console.log('  neg:', c.negEx.join(' | '))
  if (c.ghostEx.length) console.log('  ghost:', c.ghostEx.join(' | '))
  if (c.restLieEx.length) console.log('  lie:', c.restLieEx.join(' | '))
  const flags = []
  if (c.nan) flags.push('NAN')
  if (c.neg) flags.push('NEG')
  if (c.ghost) flags.push('GHOST')
  if (c.stuckLong > 100) flags.push('STUCK')
  if (c.dayRestOut / Math.max(1,c.dayN) > 0.12) flags.push('AFK')
  if (c.campTp) flags.push('CAMP_TP')
  if (c.campIn) flags.push('CAMP_IN')
  if (c.restLie) flags.push('REST_LIE')
  console.log('  FLAGS:', flags.length ? flags.join(',') : 'clean')
}
