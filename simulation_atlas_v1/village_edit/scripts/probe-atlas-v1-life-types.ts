/**
 * Atlas v1 life types 1-20 HARD LIVE probe.
 * Usage: npx tsx scripts/probe-atlas-v1-life-types.ts [days=35] [seeds=1,7]
 * HARD LIVE: passMin tags on EVERY seed from causal state/log only.
 * Sticky lifeTagHits OR-merge is DISABLED in lifeTypeEvidence.ts.
 */
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createSimulation, stepSimulation } from '../src/lib/sim/engine'
import { TICKS_PER_DAY } from '../src/lib/sim/calendar'
import {
  LIFE_TYPE_DEFS,
  evaluateLifeTypeEvidence,
  type LifeTypeRow,
  type LifeTypeVerdict,
} from '../src/lib/sim/emergence/lifeTypeEvidence'

const days = Number(process.argv[2] ?? 35)
const seeds = (process.argv[3] ?? '1,7')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n))

type Merged = {
  index: number
  id: string
  name: string
  verdict: LifeTypeVerdict
  hitCount: number
  passMin: number
  partialMin: number
  evidence: string[]
}

function runSeed(seed: number): { seed: number; rows: LifeTypeRow[] } {
  const state = createSimulation(seed)
  const ticks = days * TICKS_PER_DAY
  for (let t = 0; t < ticks; t++) stepSimulation(state)
  return { seed, rows: evaluateLifeTypeEvidence(state) }
}

const runs: { seed: number; rows: LifeTypeRow[] }[] = []
for (const seed of seeds) {
  console.log(`life-types HARD LIVE probe seed=${seed} days=${days}...`)
  const r = runSeed(seed)
  runs.push(r)
  const p = r.rows.filter((x) => x.verdict === 'PASS').length
  const pa = r.rows.filter((x) => x.verdict === 'PARTIAL').length
  const f = r.rows.filter((x) => x.verdict === 'FAIL').length
  console.log(`  PASS=${p} PARTIAL=${pa} FAIL=${f}`)
}

const merged: Merged[] = []
for (const def of LIFE_TYPE_DEFS) {
  const rows = runs.map((r) => r.rows.find((x) => x.id === def.id)!).filter(Boolean)
  const allPass = rows.length > 0 && rows.every((h) => h.verdict === 'PASS')
  const anyPass = rows.some((h) => h.verdict === 'PASS')
  const anyPartial = rows.some((h) => h.verdict === 'PARTIAL')
  let verdict: LifeTypeVerdict = 'FAIL'
  if (allPass) verdict = 'PASS'
  else if (anyPass || anyPartial) verdict = 'PARTIAL'
  const best = [...rows].sort((a, b) => b.hitCount - a.hitCount)[0]!
  const evidence: string[] = []
  for (const r of runs) {
    const h = r.rows.find((x) => x.id === def.id)!
    evidence.push(`s${r.seed}:${h.hitCount}/${h.passMin} [${h.hitTags.slice(0, 4).join(',')}]`)
  }
  merged.push({
    index: def.index,
    id: def.id,
    name: def.name,
    verdict,
    hitCount: best.hitCount,
    passMin: def.passMin,
    partialMin: def.partialMin,
    evidence,
  })
}

const passN = merged.filter((h) => h.verdict === 'PASS').length
const partialN = merged.filter((h) => h.verdict === 'PARTIAL').length
const failN = merged.filter((h) => h.verdict === 'FAIL').length

const lines: string[] = []
lines.push('# Atlas v1 - Life Types Matrix (1-20)')
lines.push('')
lines.push(`**Date :** ${new Date().toISOString()}`)
lines.push('**Arbre :** `simulation_atlas_v1/village_edit`')
lines.push(`**Probe :** \`scripts/probe-atlas-v1-life-types.ts\` - seeds=${seeds.join(',')} days=${days}`)
lines.push('**Bareme HARD LIVE :** >= passMin tags sur **chaque** seed (1+7) via causal state/log/pack bags.')
lines.push('**Regle :** pas de biographies day-timer ; sticky `lifeTagHits` OR-merge **DISABLED**. Pas d inflation.')
lines.push('')
lines.push('## Score global HARD LIVE (causal dual-seed)')
lines.push('')
lines.push('| Verdict | Count |')
lines.push('|--------|------:|')
lines.push(`| HARD LIVE | ${passN} |`)
lines.push(`| PARTIAL | ${partialN} |`)
lines.push(`| FAIL | ${failN} |`)
lines.push(`| **HARD LIVE** | **${passN}/20** |`)
lines.push(`| **Taux LIVE+PARTIAL** | **${(((passN + partialN) / 20) * 100).toFixed(1)}%** |`)
lines.push('')
lines.push('## Matrice')
lines.push('')
lines.push('| # | Nom | Verdict | Hits (best) | Seuil PASS | Preuve |')
lines.push('|---|-----|---------|------------:|----------:|--------|')
for (const h of merged) {
  const label = h.verdict === 'PASS' ? 'LIVE' : h.verdict
  const ev = h.evidence.join(' · ').replace(/\|/g, '/')
  lines.push(`| ${h.index} | ${h.name} (${h.id}) | **${label}** | ${h.hitCount} | ${h.passMin} | ${ev.slice(0, 180)} |`)
}
lines.push('')
lines.push('## FAIL (priorite fix)')
lines.push('')
const fails = merged.filter((x) => x.verdict === 'FAIL')
if (fails.length === 0) lines.push('_Aucun FAIL ce soak._')
else for (const h of fails) lines.push(`- **L${h.index} ${h.name}** - ${h.evidence.join(' | ')}`)
lines.push('')
lines.push('## PARTIAL (a durcir vers LIVE dual-seed)')
lines.push('')
const parts = merged.filter((x) => x.verdict === 'PARTIAL')
if (parts.length === 0) lines.push('_Aucun PARTIAL ce soak._')
else for (const h of parts) lines.push(`- **L${h.index} ${h.name}** - ${h.evidence.join(' | ')}`)
lines.push('')
lines.push('## Notes methode')
lines.push('')
lines.push(`- **HARD LIVE = ${passN}/20** — dual-seed causal state/log (sticky OR-merge DISABLED).`)
lines.push('- HARD merge = every seed PASS (refuse soft OR-merge / single-seed cherry-pick).')
lines.push('- Sticky `lifeTagHits` is soft diagnostic only — not used for LIVE.')
lines.push('- Bulletin stay locked until Visuel eye-QA + perf@500>=80 also proven.')
lines.push('- Scenarios hold: see `ATLAS_V1_SCENARIO_MATRIX.md` (target 50/0/0).')
lines.push('')

const out = resolve(process.cwd(), 'ATLAS_V1_LIFE_TYPES_MATRIX.md')
writeFileSync(out, lines.join('\n'), 'utf8')
console.log(`\nHARD LIVE: ${passN}/20 PARTIAL=${partialN} FAIL=${failN} (sticky DISABLED)`)
console.log(`Wrote ${out}`)
for (const h of merged.filter((x) => x.verdict !== 'PASS')) {
  console.log(`  ${h.verdict} L${h.index} ${h.name}: ${h.evidence.join(' | ')}`)
}