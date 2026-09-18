/**
 * Civilization systems audit v2 — institutions, creed, succession, polity, war, bandits, forts.
 * Run: npx tsx _civ_audit.ts [seed] [days]
 */
import { createSimulation, stepSimulation, computeStats } from './src/lib/sim/engine'
import { TICKS_PER_DAY } from './src/lib/sim/calendar'
import { mindOf } from './src/lib/sim/cognition'
import { politicsOf, creedLabel } from './src/lib/sim/politics'

const seed = Number(process.argv[2] ?? 1)
const days = Number(process.argv[3] ?? 60)
const ticks = days * TICKS_PER_DAY

function used(n: number, soft = 1): 'USED' | 'RARE' | 'UNUSED' {
  if (n >= soft * 5) return 'USED'
  if (n > 0) return 'RARE'
  return 'UNUSED'
}

console.log(`Civ audit v2 — seed=${seed} days=${days} ticks=${ticks}\n`)

const state = createSimulation(seed)
let lastLog = 0
const logHits: Record<string, number> = {}
const samples: string[] = []

function bump(key: string, n = 1) {
  logHits[key] = (logHits[key] ?? 0) + n
}

function scan(from: number) {
  for (let i = from; i < state.log.length; i++) {
    const t = state.log[i]
    const low = t.toLowerCase()
    if (/devient une institution/.test(low)) bump('institution')
    if (/guilde/.test(low) && /se forme|naissance|émerge/.test(low)) bump('guild')
    if (/creed|voie de foi|honorer le sacré|conversion/.test(low)) bump('creed')
    if (/rite|rituel|autel|sanctuaire|gourou|recueillement/.test(low)) bump('ritual')
    if (/succède|lutte d'influence|vide de pouvoir|crise de succession|défie/.test(low)) bump('succession')
    if (/hors-la-loi|brigand|bande |pillards|coupe-jarrets/.test(low)) bump('bandit')
    if (/prétentions territoriales|absorbe|étend ses prétentions/.test(low)) bump('territory')
    if (/chefferie|royaume|campement|souverain|doyen du|chef du/.test(low)) bump('polity')
    if (/donjon|keep|fort de|enceinte fortifiée|palissade|forteresse|château/.test(low)) bump('fort_label')
    if (/enceinte fermée|rempart de pierre/.test(low)) bump('wall_closed')
    if (/rival|guerre|belligér/.test(low)) bump('war')
    if (samples.length < 20 && /creed|rite|bande|chefferie|royaume|succède|donjon|autel|institution|territorial/.test(low)) {
      samples.push(t)
    }
  }
}

let peakBandits = 0
let peakRaiding = 0
let peakCreeds = 0
let peakRivals = 0
let peakInstitutions = 0
let peakFaith = 0
let fortifyEnq = 0
const seenFort = new Set<number>()
let confront = 0
let fight = 0
let buildWall = 0

for (let t = 1; t <= ticks; t++) {
  stepSimulation(state)

  if (t % 6 === 0) {
    for (const v of state.villagers) {
      if (!v.alive) continue
      if (v.task?.kind === 'confront') confront++
      if (v.task?.kind === 'fight') fight++
      if (v.task?.kind === 'buildWall') buildWall++
    }
  }

  if (t % TICKS_PER_DAY === 0) {
    scan(lastLog)
    lastLog = state.log.length

    const aliveB = (state.bandits ?? []).filter((b) => b.alive)
    peakBandits = Math.max(peakBandits, aliveB.length)
    peakRaiding = Math.max(peakRaiding, aliveB.filter((b) => b.phase === 'raid').length)
    peakInstitutions = Math.max(peakInstitutions, state.circles.filter((c) => c.isInstitution).length)
    peakFaith = Math.max(peakFaith, state.circles.filter((c) => c.kind === 'faith').length)

    let creeds = 0
    let rivals = 0
    for (const v of state.villagers) {
      if (!v.alive) continue
      if (politicsOf(v).creed) creeds++
      if (mindOf(v).rivalId !== null) rivals++
    }
    peakCreeds = Math.max(peakCreeds, creeds)
    peakRivals = Math.max(peakRivals, rivals)

    for (const p of state.projects) {
      if (p.intent.purposes.includes('fortify') && !seenFort.has(p.id)) {
        seenFort.add(p.id)
        fortifyEnq++
      }
    }

    const day = t / TICKS_PER_DAY
    if (day % 15 === 0 || day === days) {
      const s = computeStats(state)
      const tiers = (state.polities ?? []).map((p) => p.tier).join(',') || '-'
      console.log(
        `day ${day} | pop ${s.villagers} | circles ${state.circles.length} inst ${peakInstitutions} faith ${state.circles.filter((c) => c.kind === 'faith').length} | ` +
          `creeds ${creeds} rivals ${rivals} | bandits ${aliveB.length} raid ${aliveB.filter((b) => b.phase === 'raid').length} bands ${(state.bands ?? []).length} | ` +
          `polities ${tiers} | walls ${state.villages.map((v) => v.wallTier).join(',')} shrines ${state.villages.filter((v) => v.hasShrine).length}`,
      )
    }
  }
}
scan(lastLog)

const s = computeStats(state)
const creedEnd: Record<string, number> = {}
let creedHolders = 0
let rivalsEnd = 0
let sacredMax = 0
for (const v of state.villagers) {
  if (!v.alive) continue
  const pol = politicsOf(v)
  if (pol.creed) {
    creedHolders++
    creedEnd[pol.creed] = (creedEnd[pol.creed] ?? 0) + 1
  }
  const m = mindOf(v)
  if (m.rivalId !== null) rivalsEnd++
  sacredMax = Math.max(sacredMax, m.sacredConf)
}

const fortDone = state.projects.filter((p) => p.phase === 'done' && p.intent.purposes.includes('fortify')).length
const fortOpen = state.projects.filter((p) => p.phase !== 'done' && p.intent.purposes.includes('fortify')).length
const fortLabels = state.projects.filter((p) => p.intent.purposes.includes('fortify')).map((p) => p.label)

console.log('\n=== END ===')
console.log(`pop=${s.villagers} deaths=${s.deaths} deathsByBandit=${s.deathsByBandit ?? 0} year=${s.year}`)
console.log(`circles=${state.circles.length} inst=${state.circles.filter((c) => c.isInstitution).length} faith=${state.circles.filter((c) => c.kind === 'faith').length}`)
console.log(`creeds=${creedHolders} ${JSON.stringify(creedEnd)} sacredMax=${sacredMax.toFixed(2)} rivals=${rivalsEnd}`)
console.log(
  `bandits=${(state.bandits ?? []).filter((b) => b.alive).length} peak=${peakBandits} bands=${(state.bands ?? []).length} raids=${(state.bands ?? []).reduce((a, b) => a + b.raids, 0)}`,
)
console.log(
  `polities=${(state.polities ?? []).map((p) => `${p.tier}:${p.name}`).join(' | ') || 'none'}`,
)
console.log(`fortify enq=${fortifyEnq} done=${fortDone} open=${fortOpen} labels=${fortLabels.slice(0, 5).join('; ')}`)
console.log(`walls=${state.villages.map((v) => v.wallTier).join(',')} buildWallSamples=${buildWall} closedLog=${logHits.wall_closed ?? 0}`)
console.log(`shrines=${state.villages.filter((v) => v.hasShrine).map((v) => v.shrineLabel).join(' | ') || 'none'}`)
console.log(`confront=${confront} fight=${fight}`)
console.log('milestones', JSON.stringify(state.milestones))
console.log('logHits', JSON.stringify(logHits))
console.log('\nSamples:')
for (const line of samples) console.log(' ', line)

const rows: [string, string, string][] = [
  ['politics circles', used(state.circles.length, 1), `end=${state.circles.length}`],
  ['institutions', used(peakInstitutions, 1), `peak=${peakInstitutions} log=${logHits.institution ?? 0}`],
  ['faith circles', used(peakFaith, 1), `peak=${peakFaith}`],
  ['creed/religion', used(peakCreeds + (logHits.creed ?? 0), 1), `peakHolders=${peakCreeds} end=${creedHolders} log=${logHits.creed ?? 0}`],
  ['shrines/rites', used((logHits.ritual ?? 0) + state.villages.filter((v) => v.hasShrine).length, 1), `shrines=${state.villages.filter((v) => v.hasShrine).length} ritualLog=${logHits.ritual ?? 0}`],
  ['polities', used((state.polities ?? []).length + (logHits.polity ?? 0), 1), `n=${(state.polities ?? []).length} tiers=${[...new Set((state.polities ?? []).map((p) => p.tier))].join(',')} log=${logHits.polity ?? 0}`],
  ['chiefdom+', used((state.polities ?? []).filter((p) => p.tier === 'chiefdom' || p.tier === 'kingdom').length + (logHits.polity ?? 0) * 0, 1), `chief/king=${(state.polities ?? []).filter((p) => p.tier === 'chiefdom' || p.tier === 'kingdom').length}`],
  ['succession', used((logHits.succession ?? 0), 1), `log=${logHits.succession ?? 0}`],
  ['territory claims', used(logHits.territory ?? 0, 1), `log=${logHits.territory ?? 0}`],
  ['war rivals', used(peakRivals + confront, 1), `rivalPeak=${peakRivals} confront=${confront}`],
  ['bandits', used(peakBandits + (logHits.bandit ?? 0), 1), `peak=${peakBandits} log=${logHits.bandit ?? 0} raids=${(state.bands ?? []).reduce((a, b) => a + b.raids, 0)}`],
  ['fortify/keeps', used(fortifyEnq + fortDone + (logHits.fort_label ?? 0), 1), `enq=${fortifyEnq} done=${fortDone} fortLog=${logHits.fort_label ?? 0}`],
  ['village walls', used(buildWall + (logHits.wall_closed ?? 0) + state.villages.filter((v) => v.wallTier !== 'none').length * 5, 1), `buildWall=${buildWall} closed=${logHits.wall_closed ?? 0} tiers=${state.villages.map((v) => v.wallTier).join(',')}`],
]

console.log('\n=== USED vs UNUSED ===')
for (const [sys, status, evid] of rows) console.log(`${status.padEnd(7)} | ${sys.padEnd(20)} | ${evid}`)

const allCreeds = ['partage', 'ordre', 'commerce_libre', 'protection', 'piete', 'vengeance', 'tradition', 'changement']
console.log(`CreedIds never seen: ${allCreeds.filter((id) => !creedEnd[id]).join(', ') || '(none)'}`)
console.log(`Labels: ${Object.keys(creedEnd).map((k) => creedLabel(k as never)).join(', ') || 'aucune'}`)
