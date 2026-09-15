/**
 * Fait tourner la simulation sans rendu.
 *
 *   npm run sim -- <graine> <ticks> <log_tous_les_x_ticks>
 *   npm run sim -- 1 12000 2000 --social
 */
import { createSimulation, stepSimulation, computeStats } from './src/lib/sim/engine'

const seed = Number(process.argv[2] ?? 1)
const ticks = Number(process.argv[3] ?? 36000)
const logEvery = Number(process.argv[4] ?? 3600)
const socialMode = process.argv.includes('--social') || process.argv.includes('--social-audit')

const SOCIAL_RE =
  /discut|proche|raconte|unissent|mariage|naît|né de|adopte|partage sa nourriture|offre a manger|deuil|venge|guilde|cercle|hérit|lignée|place/i

console.log(
  `Simulation — graine=${seed}, ${ticks} ticks, un point tous les ${logEvery} ticks` +
    (socialMode ? ' [social audit]' : '') +
    `\n`,
)

const state = createSimulation(seed)
const t0 = Date.now()
let lastLogLen = 0
const socialHits: string[] = []
const tallies: Record<string, number> = {
  talk: 0,
  romance: 0,
  birth: 0,
  foodShare: 0,
  grief: 0,
  guild: 0,
  otherSocial: 0,
}

function classifySocial(line: string) {
  if (/proche|raconte|place|discut/i.test(line)) tallies.talk++
  else if (/unissent|mariage/i.test(line)) tallies.romance++
  else if (/naît|né de|naissance|adopte/i.test(line)) tallies.birth++
  else if (/partage sa nourriture|offre a manger/i.test(line)) tallies.foodShare++
  else if (/deuil|venge/i.test(line)) tallies.grief++
  else if (/guilde|cercle/i.test(line)) tallies.guild++
  else tallies.otherSocial++
}

for (let t = 1; t <= ticks; t++) {
  stepSimulation(state)
  if (socialMode && state.log.length > lastLogLen) {
    for (let i = lastLogLen; i < state.log.length; i++) {
      const line = state.log[i]
      if (!SOCIAL_RE.test(line)) continue
      socialHits.push(line)
      classifySocial(line)
      if (socialHits.length <= 80 || socialHits.length % 25 === 0) {
        console.log(`  social] ${line}`)
      }
    }
    lastLogLen = state.log.length
  }
  if (t % logEvery === 0) {
    const s = computeStats(state)
    let spouses = 0
    let kinPairs = 0
    let chatting = 0
    for (const v of state.villagers) {
      if (!v.alive) continue
      if (v.spouseId !== null) spouses++
      if (v.task?.kind === 'socialise' || v.task?.kind === 'giveFood') chatting++
      for (const r of v.relations.values()) {
        if (r.kinship > 0.4) kinPairs++
      }
    }
    console.log(
      `an ${s.year} (tick ${s.tick}) — pop ${s.villagers} | naissances ${s.births} morts ${s.deaths} | villages ${s.villages} maisons ${s.houses} | ` +
        `tisserands ${s.professions.weaver} forgerons ${s.professions.blacksmith} | famine ${s.famine ? 'oui' : 'non'}` +
        (socialMode
          ? ` | couples ${Math.floor(spouses / 2)} kinLinks ${kinPairs} socialTasks ${chatting}`
          : ''),
    )
  }
}

const elapsed = (Date.now() - t0) / 1000
console.log(`\nTerminé : ${ticks} ticks en ${elapsed.toFixed(1)}s (${Math.round(ticks / elapsed)} ticks/s)`)

if (socialMode) {
  console.log('\n── Social audit tallies ──')
  for (const [k, n] of Object.entries(tallies)) console.log(`  ${k}: ${n}`)
  console.log(`  log lines matched: ${socialHits.length}`)
  const guilds = state.circles.filter((c) => c.isGuild)
  console.log(`  active guilds: ${guilds.length}`)
  for (const g of guilds.slice(0, 8)) {
    const members = g.memberIds
      .map((id) => state.villagers.find((v) => v.id === id))
      .filter((v): v is NonNullable<typeof v> => !!v && v.alive)
    const profs = members.map((m) => m.profession).join(',')
    console.log(`    ${g.name} — ${members.length} membres [${profs}]`)
  }
}
