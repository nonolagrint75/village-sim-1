// Quick AFK probe: daytime rest/idle vs productive work tick share.
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { isNight } from '../src/lib/sim/world'
import { edibleValue } from '../src/lib/sim/inventory'

const seed = Number(process.argv[2] ?? 7)
const days = Number(process.argv[3] ?? 5)
const ticks = days * TICKS_PER_DAY
const WORK = new Set([
  'gatherFood', 'gatherWood', 'gatherStone', 'gatherIron', 'gatherFuel',
  'clearLand', 'sowField', 'harvestWheat', 'fish',
  'buildHouse', 'buildBed', 'buildChest', 'buildWorkbench', 'buildProject',
  'buildHearth', 'buildTable', 'craftGoods', 'craftGear', 'craftSpear',
  'craftStoneSpear', 'craftIronTool', 'mineTunnel', 'mineGold',
])

const state = createSimulation(seed)
const byKind: Record<string, number> = {}
const starts: Record<string, number> = {}
const prev = new Map<number, string | null>()
let dayRest = 0, nightRest = 0, dayIdle = 0, dayWork = 0, dayTotal = 0, nightTotal = 0

for (let t = 1; t <= ticks; t++) {
  stepSimulation(state)
  const night = isNight(state.tick)
  for (const v of state.villagers) {
    if (!v.alive) continue
    const k = v.task?.kind ?? 'null'
    byKind[k] = (byKind[k] ?? 0) + 1
    const p = prev.get(v.id) ?? null
    if (k !== p) starts[k] = (starts[k] ?? 0) + 1
    prev.set(v.id, k)
    if (night) { nightTotal++; if (k === 'rest') nightRest++ }
    else {
      dayTotal++
      if (k === 'rest') dayRest++
      else if (k === 'idle') dayIdle++
      else if (WORK.has(k)) dayWork++
    }
  }
}

const totalTicks = Object.values(byKind).reduce((a, b) => a + b, 0)
const top = Object.entries(byKind).sort((a, b) => b[1] - a[1]).slice(0, 12)
console.log('probe-afk seed=' + seed + ' days=' + days)
console.log('tick share: ' + top.map(([k, n]) => k + ':' + ((100 * n) / totalTicks).toFixed(1) + '%').join(', '))
console.log('day rest ' + ((100 * dayRest) / dayTotal).toFixed(1) + '% idle ' + ((100 * dayIdle) / dayTotal).toFixed(1) + '% work ' + ((100 * dayWork) / dayTotal).toFixed(1) + '%')
console.log('night rest ' + ((100 * nightRest) / nightTotal).toFixed(1) + '%')
console.log('top starts: ' + Object.entries(starts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([k, n]) => k + ':' + n).join(', '))
