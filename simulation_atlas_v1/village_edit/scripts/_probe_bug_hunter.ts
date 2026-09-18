/**
 * TOTAL AUDIT A13 — Bug hunter probe.
 * Hunts: NaN, negative impossible, stuck tasks, ghost refs, AFK, camp TP, rest-label lies.
 *
 *   npx tsx scripts/_probe_bug_hunter.ts [seedsCsv] [days]
 *   npx tsx scripts/_probe_bug_hunter.ts 1,7,42 25
 */
import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { isNight, distance } from '../src/lib/sim/world'
import { restTaskLabel } from '../src/lib/sim/labels'
import type { SimState, Villager } from '../src/lib/sim/types'

const seeds = String(process.argv[2] ?? '1,7,42')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n))
const days = Number(process.argv[3] ?? 25)
const ticks = days * TICKS_PER_DAY

type Counters = {
  seed: number
  days: number
  nanHits: number
  nanExamples: string[]
  negHits: number
  negExamples: string[]
  stuckHits: number
  stuckKinds: Record<string, number>
  ghostHits: number
  ghostExamples: string[]
  dayRestOutdoor: number
  dayRestHome: number
  dayRestCommute: number
  dayRestTotal: number
  dayAliveSamples: number
  dayIdle: number
  dayWork: number
  nightRest: number
  nightSamples: number
  campTpJumps: number
  campInsideVillage: number
  restLabelLies: number
  restLabelExamples: string[]
  longStuckTasks: number
  maxStuckSeen: number
  aliveEnd: number
  deaths: number
}

const WORK = new Set([
  'gatherFood', 'gatherWood', 'gatherStone', 'gatherIron', 'gatherFuel',
  'clearLand', 'sowField', 'harvestWheat', 'fish',
  'buildHouse', 'buildBed', 'buildChest', 'buildWorkbench', 'buildProject',
  'buildHearth', 'buildTable', 'craftGoods', 'craftGear', 'craftSpear',
  'craftStoneSpear', 'craftIronTool', 'mineTunnel', 'mineGold',
  'buildWall', 'buildMill', 'grindFlour', 'bakeBread',
])

function bump(map: Record<string, number>, k: string) {
  map[k] = (map[k] ?? 0) + 1
}

function pushEx(arr: string[], s: string, cap = 8) {
  if (arr.length < cap) arr.push(s)
}

function checkNum(c: Counters, label: string, n: number) {
  if (!Number.isFinite(n)) {
    c.nanHits++
    pushEx(c.nanExamples, label)
    return
  }
  if (n < -1e-9) {
    c.negHits++
    pushEx(c.negExamples, `${label}=${n}`)
  }
}

function ghostCheck(state: SimState, v: Villager, c: Counters) {
  const byId = (id: number) => state.villagers.find((o) => o.id === id)
  if (v.spouseId != null) {
    const s = byId(v.spouseId)
    if (!s || !s.alive) {
      c.ghostHits++
      pushEx(c.ghostExamples, `spouseId ${v.id}->${v.spouseId} dead/missing`)
    }
  }
  if (v.homeOwnerId != null && v.homeOwnerId !== v.id) {
    const o = byId(v.homeOwnerId)
    if (!o || !o.alive) {
      c.ghostHits++
      pushEx(c.ghostExamples, `homeOwnerId ${v.id}->${v.homeOwnerId} dead/missing`)
    }
  }
  if (v.villageId != null) {
    if (!state.villages.some((vg) => vg.id === v.villageId)) {
      c.ghostHits++
      pushEx(c.ghostExamples, `villageId ${v.id}->${v.villageId} missing`)
    }
  }
  if (v.horseId != null) {
    const h = state.horses.find((x) => x.id === v.horseId)
    if (!h || !h.alive) {
      c.ghostHits++
      pushEx(c.ghostExamples, `horseId ${v.id}->${v.horseId} dead/missing`)
    }
  }
  if (v.boatId != null) {
    const b = state.boats.find((x) => x.id === v.boatId)
    if (!b) {
      c.ghostHits++
      pushEx(c.ghostExamples, `boatId ${v.id}->${v.boatId} missing`)
    }
  }
  if (v.task?.targetId != null && v.task.targetId >= 0) {
    const kind = v.task.kind
    if (kind === 'socialise' || kind === 'giveFood' || kind === 'confront' || kind === 'defend') {
      const o = byId(v.task.targetId)
      if (!o || !o.alive) {
        c.ghostHits++
        pushEx(c.ghostExamples, `task.targetId ${v.id} ${kind}->${v.task.targetId}`)
      }
    } else if (kind === 'tameHorse' || kind === 'feedHorse' || kind === 'mount') {
      const h = state.horses.find((x) => x.id === v.task!.targetId)
      if (!h || !h.alive) {
        c.ghostHits++
        pushEx(c.ghostExamples, `task.targetId ${v.id} ${kind}->${v.task.targetId}`)
      }
    } else if (kind === 'captureSheep' || kind === 'feedPen') {
      const sh = state.sheep.find((x) => x.id === v.task!.targetId)
      if (!sh || !sh.alive) {
        c.ghostHits++
        pushEx(c.ghostExamples, `task.targetId ${v.id} ${kind}->${v.task.targetId}`)
      }
    }
  }
  for (const pid of v.parentIds ?? []) {
    if (!state.villagers.some((o) => o.id === pid)) {
      c.ghostHits++
      pushEx(c.ghostExamples, `parentIds ${v.id}->${pid} never existed`)
    }
  }
}

function scanVitals(state: SimState, v: Villager, c: Counters) {
  const day = Math.floor(state.tick / TICKS_PER_DAY)
  checkNum(c, `v${v.id}.x d${day}`, v.x)
  checkNum(c, `v${v.id}.y d${day}`, v.y)
  checkNum(c, `v${v.id}.hunger d${day}`, v.hunger)
  checkNum(c, `v${v.id}.stamina d${day}`, v.stamina)
  checkNum(c, `v${v.id}.health d${day}`, v.health)
  checkNum(c, `v${v.id}.age d${day}`, v.age)
  checkNum(c, `v${v.id}.hue d${day}`, v.hue)
  if (v.hunger < -0.01 || v.stamina < -0.01 || v.health < -0.01) {
    c.negHits++
    pushEx(c.negExamples, `vitals v${v.id} h=${v.hunger} s=${v.stamina} hp=${v.health}`)
  }
  if (v.hunger > 20 || v.stamina > 20 || v.health > 5) {
    c.negHits++
    pushEx(c.negExamples, `absurdHigh v${v.id} h=${v.hunger} s=${v.stamina} hp=${v.health}`)
  }
  for (const stack of v.inventory ?? []) {
    checkNum(c, `inv ${v.id}.${stack.type}`, stack.count)
    if (stack.count < 0) {
      c.negHits++
      pushEx(c.negExamples, `inv ${v.id}.${stack.type}=${stack.count}`)
    }
  }
  if (v.chestInventory) {
    for (const stack of v.chestInventory) {
      checkNum(c, `chest ${v.id}.${stack.type}`, stack.count)
      if (stack.count < 0) {
        c.negHits++
        pushEx(c.negExamples, `chest ${v.id}.${stack.type}=${stack.count}`)
      }
    }
  }
}

function runSeed(seed: number): Counters {
  const c: Counters = {
    seed, days,
    nanHits: 0, nanExamples: [],
    negHits: 0, negExamples: [],
    stuckHits: 0, stuckKinds: {},
    ghostHits: 0, ghostExamples: [],
    dayRestOutdoor: 0, dayRestHome: 0, dayRestCommute: 0, dayRestTotal: 0,
    dayAliveSamples: 0, dayIdle: 0, dayWork: 0,
    nightRest: 0, nightSamples: 0,
    campTpJumps: 0, campInsideVillage: 0,
    restLabelLies: 0, restLabelExamples: [],
    longStuckTasks: 0, maxStuckSeen: 0,
    aliveEnd: 0, deaths: 0,
  }
  const state = createSimulation(seed)
  const campAnchor = new Map<number, { x: number; y: number }>()
  for (let t = 1; t <= ticks; t++) {
    stepSimulation(state)
    const sample = t <= TICKS_PER_DAY * 3 || t % 3 === 0
    if (!sample) continue

    for (const band of state.bands) {
      const prev = campAnchor.get(band.id)
      if (!prev) campAnchor.set(band.id, { x: band.campX, y: band.campY })
      else if (prev.x !== band.campX || prev.y !== band.campY) {
        const jump = distance(prev.x, prev.y, band.campX, band.campY)
        if (jump > 8) c.campTpJumps++
        campAnchor.set(band.id, { x: band.campX, y: band.campY })
      }
      for (const vg of state.villages) {
        if (distance(band.campX, band.campY, vg.centerX, vg.centerY) < 20) c.campInsideVillage++
      }
    }

    const night = isNight(state.tick)
    for (const v of state.villagers) {
      if (!v.alive) continue
      scanVitals(state, v, c)
      ghostCheck(state, v, c)

      const stuck = v.task?.stuckTicks ?? 0
      if (stuck > c.maxStuckSeen) c.maxStuckSeen = stuck
      if (stuck >= 8) {
        c.stuckHits++
        bump(c.stuckKinds, v.task?.kind ?? 'null')
      }
      if (stuck >= 14) c.longStuckTasks++

      if (night) {
        c.nightSamples++
        if (v.task?.kind === 'rest') c.nightRest++
      } else {
        c.dayAliveSamples++
        const kind = v.task?.kind ?? 'null'
        if (kind === 'idle') c.dayIdle++
        else if (WORK.has(kind)) c.dayWork++
        if (kind === 'rest') {
          c.dayRestTotal++
          const atHome = v.hasHome && distance(v.x, v.y, v.homeX, v.homeY) <= 2
          const homeBound =
            v.hasHome && distance(v.task!.targetX, v.task!.targetY, v.homeX, v.homeY) <= 4.5
          if (homeBound && !atHome) c.dayRestCommute++
          else if (atHome) c.dayRestHome++
          else c.dayRestOutdoor++

          const label = restTaskLabel(v)
          if (label === 'Se repose chez lui' && !atHome) {
            c.restLabelLies++
            pushEx(c.restLabelExamples, `chez-lui lie v${v.id} d=${distance(v.x, v.y, v.homeX, v.homeY).toFixed(1)}`)
          }
          if (label === 'Se repose dehors' && atHome) {
            c.restLabelLies++
            pushEx(c.restLabelExamples, `dehors lie v${v.id} at home`)
          }
          if (label === 'Se repose' && (atHome || homeBound)) {
            c.restLabelLies++
            pushEx(c.restLabelExamples, `generic rest label v${v.id}`)
          }
          if (label === 'Rentre se reposer' && atHome) {
            c.restLabelLies++
            pushEx(c.restLabelExamples, `rentre while home v${v.id}`)
          }
        }
      }
    }

    for (const b of state.bandits) {
      if (!b.alive) continue
      checkNum(c, `bandit${b.id}.x`, b.x)
      checkNum(c, `bandit${b.id}.y`, b.y)
      checkNum(c, `bandit${b.id}.health`, b.health)
    }
  }

  const s = computeStats(state)
  c.aliveEnd = s.villagers
  c.deaths = s.deaths
  return c
}

function pct(n: number, d: number) {
  return d <= 0 ? 0 : (100 * n) / d
}

console.log(`A13 bug hunter seeds=${seeds.join(',')} days=${days}\n`)
const results: Counters[] = []
for (const seed of seeds) {
  const t0 = Date.now()
  const c = runSeed(seed)
  results.push(c)
  const dayRestPct = pct(c.dayRestTotal, c.dayAliveSamples)
  const outdoorShare = pct(c.dayRestOutdoor, Math.max(1, c.dayRestTotal))
  const afkBad = dayRestPct > 35 && outdoorShare > 40
  console.log(`-- seed ${seed} (${((Date.now() - t0) / 1000).toFixed(1)}s) --`)
  console.log(`  alive=${c.aliveEnd} deaths=${c.deaths}`)
  console.log(`  NaN=${c.nanHits} neg/absurd=${c.negHits} ghosts=${c.ghostHits}`)
  console.log(`  stuck>=8 samples=${c.stuckHits} long>=14=${c.longStuckTasks} maxStuck=${c.maxStuckSeen}`)
  if (Object.keys(c.stuckKinds).length) {
    console.log(
      `  stuck kinds: ${Object.entries(c.stuckKinds)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([k, n]) => `${k}:${n}`)
        .join(', ')}`,
    )
  }
  console.log(
    `  day rest ${dayRestPct.toFixed(1)}% (home ${pct(c.dayRestHome, c.dayAliveSamples).toFixed(1)}% commute ${pct(c.dayRestCommute, c.dayAliveSamples).toFixed(1)}% outdoor ${pct(c.dayRestOutdoor, c.dayAliveSamples).toFixed(1)}%) idle ${pct(c.dayIdle, c.dayAliveSamples).toFixed(1)}% work ${pct(c.dayWork, c.dayAliveSamples).toFixed(1)}%`,
  )
  console.log(`  night rest ${pct(c.nightRest, c.nightSamples).toFixed(1)}%`)
  console.log(`  camp TP>8=${c.campTpJumps} campInsideTicks=${c.campInsideVillage}`)
  console.log(`  restLabelLies=${c.restLabelLies}`)
  if (c.nanExamples.length) console.log(`  NaN ex: ${c.nanExamples.join(' | ')}`)
  if (c.negExamples.length) console.log(`  neg ex: ${c.negExamples.join(' | ')}`)
  if (c.ghostExamples.length) console.log(`  ghost ex: ${c.ghostExamples.join(' | ')}`)
  if (c.restLabelExamples.length) console.log(`  label ex: ${c.restLabelExamples.join(' | ')}`)
  const flags: string[] = []
  if (c.nanHits > 0) flags.push('NAN')
  if (c.negHits > 0) flags.push('NEG')
  if (c.ghostHits > 50) flags.push('GHOST')
  if (c.longStuckTasks > 200) flags.push('STUCK')
  if (afkBad) flags.push('AFK')
  if (c.campTpJumps > 0) flags.push('CAMP_TP')
  if (c.campInsideVillage > 0) flags.push('CAMP_IN')
  if (c.restLabelLies > 0) flags.push('REST_LIE')
  console.log(flags.length ? `  FLAGS: ${flags.join(',')}` : '  FLAGS: clean')
  console.log('')
}

const agg = {
  nan: results.reduce((a, r) => a + r.nanHits, 0),
  neg: results.reduce((a, r) => a + r.negHits, 0),
  ghost: results.reduce((a, r) => a + r.ghostHits, 0),
  campTp: results.reduce((a, r) => a + r.campTpJumps, 0),
  campIn: results.reduce((a, r) => a + r.campInsideVillage, 0),
  restLies: results.reduce((a, r) => a + r.restLabelLies, 0),
  longStuck: results.reduce((a, r) => a + r.longStuckTasks, 0),
}
console.log('-- AGGREGATE --')
console.log(JSON.stringify(agg, null, 2))
const critical =
  agg.nan > 0 || agg.neg > 0 || agg.campTp > 0 || agg.restLies > 0 || agg.campIn > 100
console.log(critical ? '\nCRITICAL signals present — investigate' : '\nNo hard critical signals (NaN/neg/campTP/restLies)')
process.exit(critical ? 2 : 0)
