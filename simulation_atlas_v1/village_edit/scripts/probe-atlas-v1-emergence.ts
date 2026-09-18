/**
 * Atlas v1 headless proof — multi-day causal chain evidence.
 * Usage: npx tsx scripts/probe-atlas-v1-emergence.ts [seed] [days]
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { politicsSummary } from '../src/lib/sim/politics'
import { settlementStageCounts } from '../src/lib/sim/settlements'
import { firmsSummary } from '../src/lib/sim/economy/business'
import { warsSummary } from '../src/lib/sim/war'

const seed = Number(process.argv[2] ?? 7)
const days = Number(process.argv[3] ?? 45)
const outPath = resolve(
  process.cwd(),
  `ATLAS_V1_EMERGENCE_PROOF_s${seed}_d${days}.txt`,
)

const state = createSimulation(seed)
const lines: string[] = []
const push = (s: string) => lines.push(s)

push(`Simulation Atlas v1 / nono_simu_2d — emergence proof`)
push(`seed=${seed} days=${days} ticks=${days * TICKS_PER_DAY}`)
push(`started=${new Date().toISOString()}`)
push('')

const causalHits: string[] = []
let lastLog = 0
const daySnaps: string[] = []

for (let t = 1; t <= days * TICKS_PER_DAY; t++) {
  stepSimulation(state)
  if (state.log.length > lastLog) {
    for (let i = lastLog; i < state.log.length; i++) {
      const line = state.log[i]
      if (
        /guerre|bataille|coup |faillite|firme|embauch|hameau|bourg|chefferie|royaume|rivalit|succède|caravane|marché|fortif|absorb|métier|institution|autel|temple|migration|parce que|→|cause/i.test(
          line,
        )
      ) {
        causalHits.push(line)
      }
    }
    lastLog = state.log.length
  }
  if (t % (TICKS_PER_DAY * 5) === 0) {
    const st = computeStats(state)
    const pol = politicsSummary(state)
    const wars = warsSummary(state)
    const firms = firmsSummary(state)
    const stages = settlementStageCounts(state)
    daySnaps.push(
      `d${t / TICKS_PER_DAY}: pop=${st.villagers} villages=${st.villages} houses=${st.houses} ` +
        `polities=${pol.polities} ch=${pol.chiefdoms} k=${pol.kingdoms} ` +
        `wars=${wars.active} battles=${wars.battles} coups=${wars.coups} ` +
        `firms=${firms.firms} hires=${firms.hires} fails=${firms.failures} ` +
        `stages=${JSON.stringify(stages)} roads=${st.roadTiles} mills=${st.mills}`,
    )
  }
}

const final = computeStats(state)
const pol = politicsSummary(state)
const wars = warsSummary(state)
const firms = firmsSummary(state)
const stages = settlementStageCounts(state)

push('--- day snapshots ---')
for (const s of daySnaps) push(s)
push('')
push('--- causal / chronicle hits (sample) ---')
for (const s of causalHits.slice(0, 80)) push(`  ${s}`)
if (causalHits.length > 80) push(`  … +${causalHits.length - 80} more`)
push('')
push('--- final ---')
push(
  `pop ${final.villagers} | deaths ${final.deaths} | births ${final.births} | deserters ${final.deserters ?? 0}`,
)
push(
  `houses ${final.houses} | fields ${final.fields} | mills ${final.mills} | markets ${final.markets} | roads ${final.roadTiles}`,
)
push(
  `polities ${pol.polities} (camps ${pol.camps}, chiefdoms ${pol.chiefdoms}, kingdoms ${pol.kingdoms}) castles ${pol.castles}`,
)
push(
  `wars active=${wars.active} open=${wars.open} battles=${wars.battles} coups=${wars.coups}`,
)
push(`firms=${firms.firms} hires=${firms.hires} failures=${firms.failures}`)
push(`settlementStages=${JSON.stringify(stages)}`)
push(`professions=${JSON.stringify(final.professions)}`)
push('')

// Visual consistency proxies (map-readable state)
let homes = 0
let shrines = 0
let forts = 0
for (const v of state.villagers) if (v.alive && v.hasHome) homes++
for (const vg of state.villages) {
  if (vg.hasShrine) shrines++
}
for (const pr of state.projects) {
  if (pr.intent.purposes.includes('fortify')) forts++
}
push('--- visual/sim consistency proxies ---')
push(`aliveWithHome=${homes} shrineVillages=${shrines} fortProjects=${forts}`)
push(`nature/engine assumed: tile render via nature packs (runtime UI)`)
push('')

const chainOk =
  (final.houses > 0 || final.fields > 0) &&
  (pol.polities > 0 || final.villages > 0) &&
  (firms.firms > 0 || firms.hires > 0 || causalHits.length > 5) &&
  (Object.values(stages).some((n) => n > 0) || final.villages > 0)

const warOrPolitics =
  wars.active + wars.battles + wars.coups + pol.chiefdoms + pol.kingdoms + causalHits.length > 0

push('--- verdict ---')
push(`earlyCivChain: ${chainOk ? 'PASS' : 'FAIL'}`)
push(`politicsOrWarEvidence: ${warOrPolitics ? 'PASS' : 'WEAK'}`)
push(`causalLines: ${causalHits.length}`)
push(`done=${new Date().toISOString()}`)

const text = lines.join('\n')
writeFileSync(outPath, text, 'utf8')
console.log(text)
console.log(`\nWrote ${outPath}`)
if (!chainOk) process.exit(1)
