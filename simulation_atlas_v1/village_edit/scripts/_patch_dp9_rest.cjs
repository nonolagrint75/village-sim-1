const fs = require('fs')
function patchFile(file, fn) {
  let t = fs.readFileSync(file, 'utf8')
  const n = fn(t)
  if (n === t) throw new Error('no change ' + file)
  fs.writeFileSync(file, n, 'utf8')
  console.log('ok', file)
}

patchFile('src/lib/sim/types.ts', (t) => {
  if (t.includes('priceShockTaggedDeltas?: number')) return t
  const re = /priceDeltaEvents: number\r?\n    priceTaskShifts: number\r?\n    priceProfessionShifts: number/
  if (!re.test(t)) throw new Error('types block missing')
  return t.replace(
    re,
    `priceDeltaEvents: number
    priceTaskShifts: number
    priceProfessionShifts: number
    priceNpcCount?: number
    priceChainSamples?: Array<{
      tick: number
      day: number
      stage: 'priceDelta' | 'taskShift' | 'professionShift'
      resource?: string
      npcId?: number
      taskKind?: string
      prevProfession?: string
      nextProfession?: string
      priceBefore?: number
      priceAfter?: number
      shockId?: string | null
    }>
    priceActiveShockId?: string | null
    priceShockTaggedDeltas?: number
    priceShockLinkedTaskShifts?: number
    priceShockLinkedProfessionShifts?: number`,
  )
})

patchFile('src/lib/sim/commerce.ts', (t) => {
  if (t.includes('notePriceDelta(state, { resource: res')) return t
  const re = /if \(base > 0 && Math\.abs\(next - prev\) \/ base >= 0\.05\) notePriceDelta\(state\)/
  if (!re.test(t)) throw new Error('commerce missing')
  return t.replace(
    re,
    `if (base > 0 && Math.abs(next - prev) / base >= 0.05) {
      notePriceDelta(state, { resource: res, priceBefore: prev, priceAfter: next })
    }`,
  )
})

patchFile('src/lib/sim/behaviors.ts', (t) => {
  let changed = false
  if (!t.includes("notePriceTaskShift(state, v.id, 'grindFlour')")) {
    let n = 0
    t = t.replace(
      /if \(priceUrge\('flour', state\) > 1\.15 \|\| priceUrge\('bread', state\) > 1\.15\) notePriceTaskShift\(state\)/g,
      () => {
        n++
        return "if (priceUrge('flour', state) > 1.15 || priceUrge('bread', state) > 1.15) notePriceTaskShift(state, v.id, 'grindFlour')"
      },
    )
    if (n !== 2) throw new Error('grind count ' + n)
    changed = true
  }
  if (!t.includes("notePriceTaskShift(state, v.id, 'bakeBread')")) {
    if (!t.includes("if (priceUrge('bread', state) > 1.15) notePriceTaskShift(state)")) throw new Error('bake missing')
    t = t.replace(
      "if (priceUrge('bread', state) > 1.15) notePriceTaskShift(state)",
      "if (priceUrge('bread', state) > 1.15) notePriceTaskShift(state, v.id, 'bakeBread')",
    )
    changed = true
  }
  if (!changed) throw new Error('behaviors already patched')
  return t
})

patchFile('src/lib/sim/careers.ts', (t) => {
  if (t.includes('notePriceProfessionShift(state, v.id, prev, next)')) return t
  if (!t.includes('if (scarce) notePriceProfessionShift(state)')) throw new Error('careers missing')
  return t.replace(
    'if (scarce) notePriceProfessionShift(state)',
    'if (scarce) notePriceProfessionShift(state, v.id, prev, next)',
  )
})

const c = fs.readFileSync('src/lib/sim/causalityMetrics.ts', 'utf8')
console.log('beginPriceShock', c.includes('beginPriceShock'))
console.log('priceShockTagged', c.includes('priceShockTaggedDeltas'))