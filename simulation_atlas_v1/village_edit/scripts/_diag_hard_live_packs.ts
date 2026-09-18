/** Dual-seed pack snapshot WITHOUT sticky lifeTagHits. */
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { evaluateLifeTypeEvidence } from '../src/lib/sim/emergence/lifeTypeEvidence'

const days = Number(process.argv[2] ?? 35)
const seeds = (process.argv[3] ?? '1,7').split(',').map(Number)

function softBag(state, key) { return state[key] }

function packSnapshot(state) {
  const er = softBag(state, 'exploreRoutes')
  const gangs = softBag(state, 'parallelGangs') ?? []
  const houses = softBag(state, 'dynastyHouses') ?? []
  const arts = softBag(state, 'artScenes') ?? []
  const mil = softBag(state, 'militaryFactions') ?? []
  const faith = softBag(state, 'faithMovements') ?? []
  const succ = softBag(state, 'successionCrises') ?? []
  const guild = softBag(state, 'guildPads') ?? []
  const merch = softBag(state, 'merchantNetworks') ?? []
  const agri = softBag(state, 'agriInventions') ?? []
  const milDyn = softBag(state, 'militaryDynasties') ?? []
  const labor = softBag(state, 'laborMovements') ?? []
  const credit = softBag(state, 'creditBooks') ?? []
  const wool = softBag(state, 'woolIndustry')
  const mq = softBag(state, 'migrantQuarters')
  const kin = softBag(state, 'kinGraph')
  return {
    exploreRoutes: er ? { routes: (er.routes ?? []).map(r => ({ status: r.status, kind: r.discoveryKind, vol: r.volume, goods: (r.shockGoods || []).length })), towns: er.towns?.length || 0 } : null,
    gangs: gangs.map(g => ({ phase: g.phase, zone: g.zoneControl, raids: g.raids, deals: (g.deals || []).length })),
    houses: houses.map(h => ({ phase: h.phase, rent: h.rentMultiplier, sink: h.prestigeSink, seized: (h.claims || []).filter(c => c.seized).length, branches: (h.branches || []).length })),
    arts: arts.map(a => a.phase), milFac: mil.map(m => m.phase), faith: faith.map(f => f.phase), succ: succ.map(s => s.phase),
    guild: guild.map(g => g.kind + ':' + g.phase),
    merch: merch.map(m => ({ nodes: m.nodes?.length, last: (m.events || []).slice(-3).map(e => e.kind) })),
    agri: agri.map(a => a.phase), milDyn: milDyn.map(d => d.phase), labor: labor.map(l => l.phase),
    credit: credit.map(c => c.phase + '/loans=' + ((c.loans || []).length)),
    woolPhase: wool?.boomBust?.phase || wool?.phase,
    migrantQ: mq?.quarters?.length || 0, migrantPeople: mq?.people?.length || 0,
    kinSize: kin?.nodes?.size ?? kin?.people?.size ?? 0,
  }
}

for (const seed of seeds) {
  console.log('diag seed=' + seed + ' days=' + days + '...')
  const state = createSimulation(seed)
  const ticks = days * TICKS_PER_DAY
  for (let t = 0; t < ticks; t++) stepSimulation(state)
  const stickyKeys = Object.keys(state.lifeTagHits ?? {})
  state.lifeTagHits = {}
  const rows = evaluateLifeTypeEvidence(state)
  const p = rows.filter(r => r.verdict === 'PASS').length
  const pa = rows.filter(r => r.verdict === 'PARTIAL').length
  const f = rows.filter(r => r.verdict === 'FAIL').length
  console.log('  no-sticky PASS/PARTIAL/FAIL = ' + p + '/' + pa + '/' + f + ' (sticky cleared ' + stickyKeys.length + ' keys)')
  for (const r of rows.filter(x => x.verdict !== 'PASS')) {
    console.log('  ' + r.verdict + ' L' + r.index + ' ' + r.name + ': ' + r.hitCount + '/' + r.passMin + ' miss=[' + r.missTags.slice(0, 6).join(',') + ']')
  }
  console.log('  packs:', JSON.stringify(packSnapshot(state)))
}
