const fs = require('fs')

function patch(file, fn) {
  let t = fs.readFileSync(file, 'utf8')
  const n = fn(t)
  if (n === t) throw new Error('no change ' + file)
  fs.writeFileSync(file, n, 'utf8')
  console.log('ok', file)
}

patch('PHASE5_CAUSALITY_MASTER.md', (t) => {
  const old = `| **DP9** | Economy shock controlled probe | MECHANISM **separe** | Evidence P9 hors soak |`
  const neu = `| **DP9** | Economy shock controlled probe | MECHANISM **separe** | **DONE CODE** ; acceptance natural §32 **PENDING** |`
  if (!t.includes(old)) throw new Error('DP9 row missing')
  if (t.includes('**DONE CODE** ; acceptance natural §32 **PENDING**')) return t
  return t.replace(old, neu)
})

patch('PHASE5_EVIDENCE_LOG.md', (t) => {
  const old = `| P9-eco-shock-controlled | DP9 | PENDING |`
  const neu = `| P9-eco-shock-controlled | DP9 | WIRED (MECHANISM TEST SETUP; acceptance natural §32 PENDING) |`
  if (!t.includes(old)) throw new Error('P9 evidence row missing')
  t = t.replace(old, neu)

  const bloc = `

\`\`\`
TEST: P9-eco-shock-controlled
CHAIN: shock->decision->supply/demand->price (->taskShift|professionShift)
CANAL: MECHANISM
SEED/JOURS: seed=7 / warmDays=4 / daysAfter=8 (short smoke)
SETUP: TEST SETUP wheat stock cut only (surplus+inventories); beginPriceShock(P9-wheat-stock-cut)
DELTA: priceDelta/task/prof samples with npcIds; shock-tagged counters
VERDICT_BLOC: see smoke JSON (never EMERGENCE PASS)
NOTES: natural soak untouched; harness sec32_natural_price vs sec32_controlled_shock; acceptance natural §32 PENDING
\`\`\`
`
  if (!t.includes('TEST: P9-eco-shock-controlled')) {
    // append before end or after STEP3 marker
    if (t.includes('<!-- STEP3 append below -->')) {
      t = t.replace('<!-- STEP3 append below -->', '<!-- STEP3 append below -->\n' + bloc)
    } else {
      t = t.trimEnd() + '\n' + bloc
    }
  }
  return t
})

patch('PHASE5_NOTE.md', (t) => {
  // Update next + add DP9 section before Livrables or at end of DP sections
  let n = t
  if (!n.includes('## DP9')) {
    const insert = `
## DP9

- CONTROLLED MECHANISM probe only: \`scripts/_probe_phase5_eco_shock.ts\`
- TEST SETUP: single variable wheat stock cut (\`P9-wheat-stock-cut\`); no famine force / CREATE_* / yield cheats beyond cut
- Instrument: \`notePriceDelta\` (resource+prices) → \`notePriceTaskShift\` (npcId+task) → \`notePriceProfessionShift\` (npcId+prev/next) + shock-tagged counters / \`priceChainSamples\`
- Harness: \`phase3.sec32_natural_price\` (EMERGENCE candidate PARTIAL) vs \`phase3.sec32_controlled_shock\` (MECHANISM NOT_TESTED in soak)
- NEVER mix controlled into EMERGENCE PASS; natural §32 acceptance **PENDING**
- Files: causalityMetrics.ts, commerce.ts, behaviors.ts, careers.ts, types.ts, adapters.ts, \`_probe_phase5_eco_shock.ts\`

`
    if (n.includes('## Livrables')) n = n.replace('## Livrables', insert + '## Livrables')
    else n = n.trimEnd() + '\n' + insert
  }
  n = n.replace(
    /DP8 DONE CODE \/ PENDING; next DP9\+ puis soak compare CP5\.[^\n]*/,
    'DP9 DONE CODE (MECHANISM controlled); acceptance natural §32 PENDING; next DP10+ puis soak compare CP5. Voir ordre dans le MASTER Sec.4.',
  )
  if (n === t && !t.includes('DP9 DONE CODE')) throw new Error('note next line not updated')
  return n
})

console.log('docs patched')