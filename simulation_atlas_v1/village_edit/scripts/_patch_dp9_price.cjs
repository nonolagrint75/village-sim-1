const fs = require('fs')

function patch(file, transforms) {
  let t = fs.readFileSync(file, 'utf8')
  const orig = t
  for (const [name, fn] of transforms) {
    const next = fn(t)
    if (next === t) throw new Error('Transform failed: ' + name + ' in ' + file)
    t = next
  }
  fs.writeFileSync(file, t, 'utf8')
  console.log('patched', file, 'delta', t.length - orig.length)
}

patch('src/lib/sim/causalityMetrics.ts', [
  ['add PriceChainSample type', (t) => {
    const needle = 'export type TeachTrueLaterSample = {'
    if (!t.includes(needle)) throw new Error('TeachTrueLaterSample missing')
    if (t.includes('export type PriceChainSample')) return t
    const insert = `export type PriceChainSample = {
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
  /** Controlled TEST SETUP id when present; absent/null = natural path. */
  shockId?: string | null
}

`
    return t.replace(needle, insert + needle)
  }],
  ['extend CausalityCounters price fields', (t) => {
    if (t.includes('priceShockTaggedDeltas: number')) return t
    const old = `  /** (5) price\u0394 \u2192 profession/task shift */
  priceDeltaEvents: number
  priceTaskShifts: number
  priceProfessionShifts: number`
    // try ascii-safe match via regex
    const re = /  \/\*\* \(5\) price[^\n]*\n  priceDeltaEvents: number\n  priceTaskShifts: number\n  priceProfessionShifts: number/
    if (!re.test(t)) throw new Error('price fields block missing')
    return t.replace(re, `  /** (5) priceDelta -> profession/task shift */
  priceDeltaEvents: number
  priceTaskShifts: number
  priceProfessionShifts: number
  /** Distinct NPCs in price->task/prof samples (DP9). */
  priceNpcCount: number
  /** Compact chain samples for CHAIN evidence (capped). */
  priceChainSamples?: PriceChainSample[]
  /** Active controlled shock id (TEST SETUP); undefined/null = natural. */
  priceActiveShockId?: string | null
  /** Deltas/shifts tagged while a controlled shock is active. */
  priceShockTaggedDeltas: number
  priceShockLinkedTaskShifts: number
  priceShockLinkedProfessionShifts: number`)
  }],
  ['add _priceNpcIds', (t) => {
    if (t.includes('_priceNpcIds?: Set<number>')) return t
    const old = `  _foodNpcIds?: Set<number>
  _teachNpcIds?: Set<number>
}`
    if (!t.includes(old)) throw new Error('npc sets block missing')
    return t.replace(old, `  _foodNpcIds?: Set<number>
  _teachNpcIds?: Set<number>
  _priceNpcIds?: Set<number>
}`)
  }],
  ['emptyCausalityCounters price init', (t) => {
    if (t.includes('priceShockTaggedDeltas: 0,')) return t
    const old = `    priceDeltaEvents: 0,
    priceTaskShifts: 0,
    priceProfessionShifts: 0,`
    if (!t.includes(old)) throw new Error('empty price init missing')
    return t.replace(old, `    priceDeltaEvents: 0,
    priceTaskShifts: 0,
    priceProfessionShifts: 0,
    priceNpcCount: 0,
    priceChainSamples: [],
    priceActiveShockId: null,
    priceShockTaggedDeltas: 0,
    priceShockLinkedTaskShifts: 0,
    priceShockLinkedProfessionShifts: 0,`)
  }],
  ['ensureCausalityCounters price defaults', (t) => {
    if (t.includes('if (!Array.isArray(c.priceChainSamples))')) return t
    const marker = `    if (!Array.isArray(c.teachTrueLaterSamples)) c.teachTrueLaterSamples = []`
    if (!t.includes(marker)) throw new Error('ensure teach samples missing')
    return t.replace(marker, marker + `
    if (!Array.isArray(c.priceChainSamples)) c.priceChainSamples = []
    if (typeof c.priceNpcCount !== 'number') c.priceNpcCount = 0
    if (typeof c.priceShockTaggedDeltas !== 'number') c.priceShockTaggedDeltas = 0
    if (typeof c.priceShockLinkedTaskShifts !== 'number') c.priceShockLinkedTaskShifts = 0
    if (typeof c.priceShockLinkedProfessionShifts !== 'number') c.priceShockLinkedProfessionShifts = 0
    if (c.priceActiveShockId === undefined) c.priceActiveShockId = null`)
  }],
  ['replace notePrice + shock helpers', (t) => {
    if (t.includes('export function beginPriceShock')) return t
    const old = `export function notePriceDelta(state: SimState): void {
  ensureCausalityCounters(state).priceDeltaEvents += 1
}

export function notePriceTaskShift(state: SimState): void {
  ensureCausalityCounters(state).priceTaskShifts += 1
}

export function notePriceProfessionShift(state: SimState): void {
  ensureCausalityCounters(state).priceProfessionShifts += 1
}`
    if (!t.includes(old)) throw new Error('old notePrice block missing')
    const neu = `const PRICE_CHAIN_SAMPLE_MAX = 64

function pushPriceChainSample(c: CausalityCounters, sample: PriceChainSample): void {
  if (!c.priceChainSamples) c.priceChainSamples = []
  c.priceChainSamples.push(sample)
  while (c.priceChainSamples.length > PRICE_CHAIN_SAMPLE_MAX) c.priceChainSamples.shift()
}

function trackPriceNpc(c: CausalityCounters, npcId: number | undefined): void {
  if (npcId == null || npcId < 0) return
  if (!c._priceNpcIds) c._priceNpcIds = new Set()
  c._priceNpcIds.add(npcId)
  c.priceNpcCount = c._priceNpcIds.size
}

/** DP9 MECHANISM: arm a labeled TEST SETUP shock window (never for EMERGENCE soak). */
export function beginPriceShock(state: SimState, shockId: string): void {
  const c = ensureCausalityCounters(state)
  c.priceActiveShockId = shockId
}

export function clearPriceShock(state: SimState): void {
  const c = ensureCausalityCounters(state)
  c.priceActiveShockId = null
}

export type PriceDeltaOpts = {
  resource?: string
  priceBefore?: number
  priceAfter?: number
}

export function notePriceDelta(state: SimState, opts?: PriceDeltaOpts): void {
  const c = ensureCausalityCounters(state)
  c.priceDeltaEvents += 1
  const shockId = c.priceActiveShockId ?? null
  if (shockId) c.priceShockTaggedDeltas += 1
  pushPriceChainSample(c, {
    tick: state.tick,
    day: Math.floor(state.tick / 72),
    stage: 'priceDelta',
    resource: opts?.resource,
    priceBefore: opts?.priceBefore,
    priceAfter: opts?.priceAfter,
    shockId,
  })
}

export function notePriceTaskShift(
  state: SimState,
  npcId?: number,
  taskKind?: string,
): void {
  const c = ensureCausalityCounters(state)
  c.priceTaskShifts += 1
  const shockId = c.priceActiveShockId ?? null
  if (shockId) c.priceShockLinkedTaskShifts += 1
  trackPriceNpc(c, npcId)
  pushPriceChainSample(c, {
    tick: state.tick,
    day: Math.floor(state.tick / 72),
    stage: 'taskShift',
    npcId,
    taskKind,
    shockId,
  })
}

export function notePriceProfessionShift(
  state: SimState,
  npcId?: number,
  prevProfession?: string,
  nextProfession?: string,
): void {
  const c = ensureCausalityCounters(state)
  c.priceProfessionShifts += 1
  const shockId = c.priceActiveShockId ?? null
  if (shockId) c.priceShockLinkedProfessionShifts += 1
  trackPriceNpc(c, npcId)
  pushPriceChainSample(c, {
    tick: state.tick,
    day: Math.floor(state.tick / 72),
    stage: 'professionShift',
    npcId,
    prevProfession,
    nextProfession,
    shockId,
  })
}`
    return t.replace(old, neu)
  }],
  ['snapshot price fields', (t) => {
    if (t.includes('priceChainSamples: (raw.priceChainSamples')) return t
    const old = `    teachTrueLaterSamples: (raw.teachTrueLaterSamples ?? []).slice(),`
    if (!t.includes(old)) throw new Error('snapshot teach samples missing')
    return t.replace(old, old + `
    priceChainSamples: (raw.priceChainSamples ?? []).slice(),
    priceNpcCount: raw.priceNpcCount ?? 0,
    priceShockTaggedDeltas: raw.priceShockTaggedDeltas ?? 0,
    priceShockLinkedTaskShifts: raw.priceShockLinkedTaskShifts ?? 0,
    priceShockLinkedProfessionShifts: raw.priceShockLinkedProfessionShifts ?? 0,
    priceActiveShockId: raw.priceActiveShockId ?? null,`)
  }],
  ['snapshot undef _priceNpcIds', (t) => {
    if (t.includes('_priceNpcIds: undefined')) return t
    const old = `_foodNpcIds: undefined,\n    _teachNpcIds: undefined,`
    if (!t.includes(old)) throw new Error('foodNpc strip missing')
    return t.replace(old, `_foodNpcIds: undefined,\n    _teachNpcIds: undefined,\n    _priceNpcIds: undefined,`)
  }],
])

patch('src/lib/sim/types.ts', [
  ['types price samples', (t) => {
    if (t.includes('priceShockTaggedDeltas?: number')) return t
    const old = `    priceDeltaEvents: number
    priceTaskShifts: number
    priceProfessionShifts: number`
    if (!t.includes(old)) throw new Error('types price block missing')
    return t.replace(old, `    priceDeltaEvents: number
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
    priceShockLinkedProfessionShifts?: number`)
  }],
])

patch('src/lib/sim/commerce.ts', [
  ['notePriceDelta with resource', (t) => {
    if (t.includes('notePriceDelta(state, { resource: res')) return t
    const old = `    if (base > 0 && Math.abs(next - prev) / base >= 0.05) notePriceDelta(state)`
    if (!t.includes(old)) throw new Error('commerce notePriceDelta missing')
    return t.replace(old, `    if (base > 0 && Math.abs(next - prev) / base >= 0.05) {
      notePriceDelta(state, { resource: res, priceBefore: prev, priceAfter: next })
    }`)
  }],
])

patch('src/lib/sim/behaviors.ts', [
  ['taskShift grind', (t) => {
    if (t.includes("notePriceTaskShift(state, v.id, 'grindFlour')")) return t
    let n = 0
    t = t.replace(
      /if \(priceUrge\('flour', state\) > 1\.15 \|\| priceUrge\('bread', state\) > 1\.15\) notePriceTaskShift\(state\)/g,
      () => {
        n++
        return "if (priceUrge('flour', state) > 1.15 || priceUrge('bread', state) > 1.15) notePriceTaskShift(state, v.id, 'grindFlour')"
      },
    )
    if (n !== 2) throw new Error('expected 2 grind notePriceTaskShift, got ' + n)
    return t
  }],
  ['taskShift bake', (t) => {
    if (t.includes("notePriceTaskShift(state, v.id, 'bakeBread')")) return t
    const old = `if (priceUrge('bread', state) > 1.15) notePriceTaskShift(state)`
    if (!t.includes(old)) throw new Error('bake notePriceTaskShift missing')
    return t.replace(old, `if (priceUrge('bread', state) > 1.15) notePriceTaskShift(state, v.id, 'bakeBread')`)
  }],
])

patch('src/lib/sim/careers.ts', [
  ['professionShift with npc', (t) => {
    if (t.includes('notePriceProfessionShift(state, v.id, prev, next)')) return t
    const old = `    if (scarce) notePriceProfessionShift(state)`
    if (!t.includes(old)) throw new Error('careers notePriceProfessionShift missing')
    return t.replace(old, `    if (scarce) notePriceProfessionShift(state, v.id, prev, next)`)
  }],
])

console.log('core instrumentation done')