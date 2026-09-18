const fs = require('fs')
let t = fs.readFileSync('scripts/harness/adapters.ts', 'utf8')
if (t.includes('phase3.sec32_natural_price')) {
  console.log('already done')
  process.exit(0)
}
const old = `  pushEmergence(
    'phase3.sec32_economy',
    harvest > 0 && grind > 0 && bake > 0 ? 'PARTIAL' : harvest > 0 ? 'PARTIAL' : 'NOT_TESTED',
    'transactions/price chains unmeasured; food chain proxy',
    { harvestStarts: harvest, grindStarts: grind, bakeStarts: bake, priceKeys: sum('priceKeys') },
    undefined,
    ['Full shock->price chains NOT TESTED'],
  )`
if (!t.includes(old)) {
  // try CRLF
  const oldCR = old.replace(/\n/g, '\r\n')
  if (t.includes(oldCR)) {
    t = t.replace(oldCR, 'PLACEHOLDER')
  } else {
    console.log('OLD NOT FOUND')
    const i = t.indexOf('sec32_economy')
    console.log(JSON.stringify(t.slice(i - 20, i + 400)))
    process.exit(1)
  }
}
const neu = `  pushEmergence(
    'phase3.sec32_natural_price',
    harvest > 0 && grind > 0 && bake > 0 ? 'PARTIAL' : harvest > 0 ? 'PARTIAL' : 'NOT_TESTED',
    'organic price/food-chain proxy only (EMERGENCE candidate; no induced shock)',
    { harvestStarts: harvest, grindStarts: grind, bakeStarts: bake, priceKeys: sum('priceKeys') },
    undefined,
    [
      'NATURAL channel: organic priceDelta+task/prof correlational PARTIAL',
      'Controlled shock chains live in MECHANISM probe P9-eco-shock-controlled — never aggregate into EMERGENCE PASS',
    ],
  )

  // Controlled shock is MECHANISM / TEST SETUP — documented so soak never claims it.
  pushBlock(
    report,
    makeEvidenceBlock({
      test: 'phase3.sec32_controlled_shock',
      channel: 'MECHANISM',
      scale,
      proposed: 'NOT_TESTED',
      expected: 'shock->decision->supply/demand->price (controlled probe only)',
      observed: { note: 'see scripts/_probe_phase5_eco_shock.ts' },
      evidence: [
        'TEST SETUP / MECHANISM only — refuse EMERGENCE PASS',
        'Natural soak must not inject wheat/stock shocks',
      ],
      testSetup: 'TEST SETUP: controlled eco shock lives outside EMERGENCE soak',
    }),
  )`
if (t.includes('PLACEHOLDER')) t = t.replace('PLACEHOLDER', neu)
else t = t.replace(old, neu)
fs.writeFileSync('scripts/harness/adapters.ts', t, 'utf8')
console.log('adapters ok', t.includes('sec32_natural_price'), t.includes('sec32_controlled_shock'))