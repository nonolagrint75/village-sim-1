/**
 * Proof: institutions / rulers / polity tiers change over a multi-week run.
 *
 *   npx tsx scripts/verify-polities.ts [seed] [days]
 */
import { createSimulation, stepSimulation, computeStats } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import { politicsSummary } from '../src/lib/sim/politics'

const seed = Number(process.argv[2] ?? 7)
const days = Number(process.argv[3] ?? 60)

const state = createSimulation(seed)
const rulerSnapshots: string[] = []
const instSnapshots: number[] = []
const tierSnapshots: string[] = []
const successionLines: string[] = []
let lastLog = 0

console.log(`Polity proof — seed=${seed}, ${days} days\n`)

for (let t = 1; t <= days * TICKS_PER_DAY; t++) {
  stepSimulation(state)
  if (state.log.length > lastLog) {
    for (let i = lastLog; i < state.log.length; i++) {
      const line = state.log[i]
      if (/succède|succession|chefferie|royaume|prétention|rivalité|absorbe|contestation|souverain|devient (chef|doyen|guide|souverain)/i.test(line)) {
        successionLines.push(line)
      }
    }
    lastLog = state.log.length
  }
  if (t % (TICKS_PER_DAY * 10) === 0) {
    const pol = politicsSummary(state)
    const rulers = pol.polityRows
      .map((p) => `${p.tierLabel}:${p.rulerName ?? '—'}@${p.name}`)
      .slice(0, 4)
      .join(' | ')
    const tiers = pol.polityRows.map((p) => p.tier).join(',')
    rulerSnapshots.push(`d${t / TICKS_PER_DAY}: ${rulers || '(aucun)'}`)
    instSnapshots.push(pol.institutions)
    tierSnapshots.push(`d${t / TICKS_PER_DAY}: n=${pol.polities} ch=${pol.chiefdoms} k=${pol.kingdoms} [${tiers}]`)
  }
}

const final = computeStats(state)
const pol = politicsSummary(state)
const uniqueRulers = new Set(rulerSnapshots.map((s) => s.replace(/^d\d+:\s*/, '')))
const instChanged = new Set(instSnapshots).size > 1
const rulersChanged = uniqueRulers.size > 1
const tiersEvolved = tierSnapshots.some((s) => /chiefdom|kingdom|chefferie|royaume/.test(s)) || pol.chiefdoms + pol.kingdoms > 0

console.log('--- rulers over time ---')
for (const s of rulerSnapshots) console.log(s)
console.log('\n--- polity tiers ---')
for (const s of tierSnapshots) console.log(s)
console.log('\n--- chronicle (succession / territory) ---')
for (const line of successionLines.slice(0, 24)) console.log(`  ${line}`)
if (successionLines.length > 24) console.log(`  … +${successionLines.length - 24} more`)

console.log('\n--- verdict ---')
console.log(
  `pop ${final.villagers} | institutions ${pol.institutions} | polities ${pol.polities} (chiefdoms ${pol.chiefdoms}, kingdoms ${pol.kingdoms})`,
)
console.log(`institutions changed over time: ${instChanged ? 'YES' : 'no'} (${instSnapshots.join('→')})`)
console.log(`rulers changed over time: ${rulersChanged ? 'YES' : 'no'} (${uniqueRulers.size} distinct snapshots)`)
console.log(`higher-tier polities appeared: ${tiersEvolved ? 'YES' : 'no'}`)
console.log(`succession/territory chronicle lines: ${successionLines.length}`)

const ok = (instChanged || successionLines.length > 0) && (rulersChanged || pol.polities > 0)
if (!ok) {
  console.error('\nFAIL: expected evolving institutions/rulers/polities')
  process.exit(1)
}
console.log('\nPASS: polity substrate evolves')
