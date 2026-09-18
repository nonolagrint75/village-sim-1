/**
 * Validation measurement only — home queues + world tiles + diversity + profession flips.
 * No gameplay rule changes.
 */
import fs from 'node:fs'
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { snapshotEmergence } from '../src/lib/sim/build/emergenceMetrics'
import { buildQueueRemaining } from '../src/lib/sim/build/homeContracts'
import { materialCost } from '../src/lib/sim/build/chunks'
import { countOf } from '../src/lib/sim/inventory'
import { HOUSE, ROAD, FIELD, WHEAT, TREE, STONE } from '../src/lib/sim/types'
import { getTerrain } from '../src/lib/sim/world'
import { estimateWealth } from '../src/lib/sim/ecology'
import { mindOf } from '../src/lib/sim/cognition/mindPool'
import { isActiveHomeSite } from '../src/lib/sim/build/collabContracts'

function worldSnap(state: any) {
  const g = state.grid
  let house = 0, road = 0, field = 0, wheat = 0, tree = 0, stone = 0
  for (let y = 0; y < g.height; y++) {
    for (let x = 0; x < g.width; x++) {
      const t = getTerrain(g, x, y)
      if (t === HOUSE) house++
      else if (t === ROAD) road++
      else if (t === FIELD) field++
      else if (t === WHEAT) wheat++
      else if (t === TREE) tree++
      else if (t === STONE) stone++
    }
  }
  return { house, road, field, wheat, tree, stone, villages: state.villages.length }
}

function dump(state: any, label: string, profCh: number) {
  const e = snapshotEmergence(state)
  const prof: Record<string, number> = {}
  const tasks: Record<string, number> = {}
  const sites: any[] = []
  let edible = 0, hungry = 0
  const sample: any[] = []
  for (const v of state.villagers) {
    if (!v.alive) continue
    prof[v.profession] = (prof[v.profession] ?? 0) + 1
    const tk = v.task?.kind ?? 'null'
    tasks[tk] = (tasks[tk] ?? 0) + 1
    if (v.hunger < 1.5 || v.starveTimer > 0) hungry++
    for (const s of v.inventory) {
      if (['berries', 'meat', 'bread', 'fish', 'wheat', 'flour'].includes(s.type)) edible += s.count
    }
    if (v.buildQueue?.length) {
      const rem = buildQueueRemaining(v.buildQueue)
      let needWood = 0
      for (const b of v.buildQueue) if (!b.done) needWood += materialCost(b).wood
      sites.push({
        id: v.id, hasHome: v.hasHome, active: isActiveHomeSite(v),
        q: v.buildQueue.length, done: v.buildQueue.length - rem, rem,
        wood: countOf(v.inventory, 'wood'), needWood,
        woodGap: Math.max(0, needWood - countOf(v.inventory, 'wood')),
        task: tk,
      })
    }
    if (sample.length < 5) {
      const m = mindOf(v)
      sample.push({
        id: v.id, prof: v.profession, task: tk, hunger: +v.hunger.toFixed(2),
        wealth: +estimateWealth(v).toFixed(1), home: v.hasHome, goal: m.goal?.kind ?? null,
        farm: +(m.skills.farm ?? 0).toFixed(2), mine: +(m.skills.mine ?? 0).toFixed(2),
        build: +(m.skills.build ?? 0).toFixed(2),
      })
    }
  }
  const chains = e.recentChains ?? []
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)
  return {
    label, tick: state.tick, world: worldSnap(state), emergence: e, prof, tasks, sample,
    edible, hungry, deaths: state.deaths ?? 0, profCh,
    sitesSummary: {
      n: sites.length,
      qAvg: avg(sites.map((s) => s.q)),
      remAvg: avg(sites.map((s) => s.rem)),
      doneAvg: avg(sites.map((s) => s.done)),
      woodGapAvg: avg(sites.map((s) => s.woodGap)),
      rem0: sites.filter((s) => s.rem === 0).length,
      hasHomeWithRem: sites.filter((s) => s.hasHome && s.rem > 0).length,
      stalledMats: sites.filter((s) => s.rem > 0 && s.woodGap > 0).length,
    },
    sitesSample: sites.slice(0, 4),
    chains: chains.slice(-10),
    loops: {
      restFlee: chains.filter((c: string) => /rest→flee|flee→rest/.test(c)).length,
      restEat: chains.filter((c: string) => /rest→eat|eat→rest/.test(c)).length,
      farmRest: chains.filter((c: string) => /harvestWheat→rest|sowField→rest|gatherFood→rest/.test(c)).length,
    },
  }
}

const seeds = (process.argv[2] ? process.argv[2].split(',').map(Number) : [7, 42, 100, 999])
const marks = [0, 1000, 5000, 10000]
const all: any[] = []
for (const seed of seeds) {
  console.log(`[audit] seed=${seed}`)
  const state = createSimulation(seed, {
    initialVillagers: 36, maxPopulation: 80, worldSize: 600, preset: 'standard', wolfCount: 3,
  })
  const last = new Map<number, string>()
  for (const v of state.villagers) last.set(v.id, v.profession)
  let profCh = 0
  const series: any[] = []
  series.push(dump(state, 't0', 0))
  let hi = 1
  while (state.tick < 10000) {
    stepSimulation(state)
    for (const v of state.villagers) {
      const p = last.get(v.id)
      if (p != null && v.alive && v.profession !== p) {
        profCh++
        last.set(v.id, v.profession)
      } else if (v.alive) last.set(v.id, v.profession)
    }
    if (hi < marks.length && state.tick >= marks[hi]!) {
      const s = dump(state, `t${marks[hi]}`, profCh)
      series.push(s)
      console.log(
        `  ${s.label} alive=${s.emergence.npcsAlive} house=${s.world.house} road=${s.world.road} field=${s.world.field}` +
          ` homeS=${s.emergence.homesStarted} homeC=${s.emergence.homesCompleted} homeless=${s.emergence.homeless}` +
          ` edible=${s.edible} hungry=${s.hungry} profCh=${profCh} wgap=${s.sitesSummary.woodGapAvg.toFixed(1)}`,
      )
      console.log('   tasks', Object.entries(s.tasks).sort((a: any, b: any) => b[1] - a[1]).slice(0, 6))
      console.log('   prof', s.prof)
      console.log('   sites', s.sitesSummary)
      hi++
    }
  }
  all.push({ seed, series })
}
fs.writeFileSync('_emergence_world_diversity_audit.json', JSON.stringify(all, null, 2), 'utf8')
console.log('Wrote _emergence_world_diversity_audit.json')